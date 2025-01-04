import {
  Headers,
  HttpApiBuilder,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpMiddleware,
  HttpServerRequest,
  HttpServerResponse,
  Path,
} from "@effect/platform";
import { AppApi, NotFound, ServerError } from "@guzzler/domain/AppApi";
import { Effect, pipe } from "effect";
import { nanoid } from "nanoid";
import { AppConfig } from "../../../AppConfig.js";

export const UILive = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.Do.pipe(
      Effect.bind("req", () => HttpServerRequest.HttpServerRequest),
      Effect.let("requestedPath", ({ req }) => new URL(req.url, "http://localhost").pathname),
      Effect.bind("Path", () => Path.Path),
      Effect.bind("webuiDir", () => AppConfig.webuiRoot),
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
      HttpMiddleware.withLoggerDisabled,
    ),
  ),
);

export const UIDev = HttpApiBuilder.group(AppApi, "ui", handlers =>
  handlers.handleRaw("ui", () =>
    Effect.Do.pipe(
      Effect.bind("req", () => HttpServerRequest.HttpServerRequest),
      Effect.bind("httpClient", () => HttpClient.HttpClient),
      Effect.tap(({ req }) => Effect.logTrace("Proxying request to", `http://localhost:3000${req.url}`)),
      Effect.andThen(({ req, httpClient }) =>
        httpClient.execute(
          HttpClientRequest.make(req.method)(`http://localhost:3000${req.url}`, {
            headers: Headers.remove(req.headers, "host"),
            ...(req.method === "GET" || req.method === "HEAD" ? {} : { body: HttpBody.stream(req.stream) }),
          }),
        ),
      ),
      Effect.andThen(resp => HttpServerResponse.stream(resp.stream, resp)),
      Effect.orDie,
      HttpMiddleware.withLoggerDisabled,
    ),
  ),
);
