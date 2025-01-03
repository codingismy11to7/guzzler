import { HttpApiBuilder, HttpServerRequest, HttpServerResponse, Path } from "@effect/platform";
import { AppApi, NotFound, ServerError } from "@guzzler/domain/AppApi";
import { Effect, Layer, pipe } from "effect";
import { nanoid } from "nanoid";
import { TodosRepository } from "./TodosRepository.js";

/**
 * Todos API implementation
 */

const TodosApiLive = HttpApiBuilder.group(AppApi, "todos", handlers =>
  pipe(
    TodosRepository,
    Effect.andThen(todos =>
      handlers
        .handle("getAllTodos", () => todos.getAll)
        .handle("getTodoById", ({ path: { id } }) => todos.getById(id))
        .handle("createTodo", ({ payload: { text } }) => todos.create(text))
        .handle("editTodo", ({ path: { id }, payload }) => todos.edit(id, payload))
        .handle("removeTodo", ({ path: { id } }) => todos.remove(id)),
    ),
  ),
);

const UILive = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.Do.pipe(
      Effect.bind("req", () => HttpServerRequest.HttpServerRequest),
      Effect.let("requestedPath", ({ req }) => new URL(req.url, "http://localhost").pathname),
      Effect.bind("Path", () => Path.Path),
      Effect.let("webuiDir", ({ Path }) => Path.resolve(import.meta.dirname, "..", "..", "webui", "dist")),
      Effect.andThen(({ req, requestedPath, Path, webuiDir }) => {
        const withoutSlash = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;
        const relPath = ["", "index.html"].includes(withoutSlash) ? "index.html" : withoutSlash;
        const fullPath = Path.resolve(webuiDir, relPath);

        const hiddenError = (e: unknown) =>
          pipe(
            Effect.sync(() => nanoid()),
            Effect.tap(id => Effect.logError(`Error serving url '${req.url}', error id: ${id}`, e)),
            Effect.andThen(id => new ServerError({ message: `Unexpected server error. Error ID: ${id}` })),
          );

        if (!fullPath.startsWith(webuiDir)) return Effect.dieMessage("forbidden");
        else
          return pipe(
            HttpServerResponse.file(fullPath).pipe(
              Effect.catchTags({
                SystemError: e =>
                  e.module === "FileSystem" && e.reason === "NotFound" ? new NotFound() : hiddenError(e),

                BadArgument: hiddenError,
              }),
            ),
          );
      }),
    ),
  ),
);

export const ApiLive = HttpApiBuilder.api(AppApi).pipe(Layer.provide(TodosApiLive), Layer.provide(UILive));
