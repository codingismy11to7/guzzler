import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Effect, Option, pipe } from "effect";
import { httpClientMethodDieFromFatal as dieFromFatal } from "./internal/utils.js";

/**
 * Todos REST client service
 */

export class TodosClient extends Effect.Service<TodosClient>()("TodosClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const create = (text: string) =>
        pipe(
          client.todos.createTodo({ payload: { text } }),
          Effect.andThen(todo => Effect.logInfo("Created todo: ", todo)),
          Effect.catchTags(dieFromFatal),
        );

      const list = client.todos.getAllTodos().pipe(
        Effect.tap(ts => Effect.logInfo(`fetched ${ts.length} todos`, ts)),
        Effect.catchTags(dieFromFatal),
      );

      const fetch = (id: AppApi.TodoId) =>
        pipe(
          client.todos.getTodoById({ path: { id } }),
          Effect.asSome,
          Effect.catchTags({
            TodoNotFound: () =>
              Effect.logError(`Failed to find todo with id: ${id}`).pipe(Effect.as(Option.none<AppApi.Todo>())),
            ...dieFromFatal,
          }),
        );

      const edit = (id: AppApi.TodoId, payload: AppApi.OptionalTodoWithoutId) =>
        client.todos.editTodo({ path: { id }, payload }).pipe(
          Effect.andThen(todo => Effect.logInfo("Edited todo: ", todo)),
          Effect.catchTags({
            TodoNotFound: () => Effect.logError(`Failed to find todo with id: ${id}`),
            ...dieFromFatal,
          }),
        );

      const remove = (id: AppApi.TodoId) =>
        client.todos.removeTodo({ path: { id } }).pipe(
          Effect.andThen(Effect.logInfo(`Deleted todo with id: ${id}`)),
          Effect.catchTags({
            TodoNotFound: () => Effect.logError(`Failed to find todo with id: ${id}`),
            ...dieFromFatal,
          }),
        );

      return {
        create,
        list,
        fetch,
        edit,
        remove,
      };
    }),
  ),
}) {}
