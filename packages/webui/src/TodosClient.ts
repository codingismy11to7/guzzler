import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Effect, Option, pipe } from "effect";

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
        );

      const list = client.todos.getAllTodos().pipe(Effect.tap(ts => Effect.logInfo(`fetched ${ts.length} todos`, ts)));

      const fetch = (id: number) =>
        pipe(
          client.todos.getTodoById({ path: { id } }),
          Effect.asSome,
          Effect.catchTag("TodoNotFound", () =>
            Effect.logError(`Failed to find todo with id: ${id}`).pipe(Effect.as(Option.none<AppApi.Todo>())),
          ),
        );

      const edit = (id: number, payload: AppApi.OptionalTodoWithoutId) =>
        client.todos.editTodo({ path: { id }, payload }).pipe(
          Effect.andThen(todo => Effect.logInfo("Edited todo: ", todo)),
          Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
        );

      const remove = (id: number) =>
        client.todos.removeTodo({ path: { id } }).pipe(
          Effect.andThen(Effect.logInfo(`Deleted todo with id: ${id}`)),
          Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
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
