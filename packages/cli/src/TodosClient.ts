import { HttpApiClient } from "@effect/platform";
import { OptionalTodoWithoutId, TodoId } from "@guzzler/domain/apis/TodosApi";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect } from "effect";

/**
 * Todos REST client service
 */

export class TodosClient extends Effect.Service<TodosClient>()("cli/TodosClient", {
  accessors: true,
  effect: Effect.gen(function* () {
    const client = yield* HttpApiClient.make(AppApi, {
      baseUrl: "http://localhost:8080",
    });

    const create = (text: string) =>
      client.todos
        .createTodo({ payload: { text } })
        .pipe(Effect.flatMap(todo => Effect.logInfo("Created todo: ", todo)));

    const list = client.todos.getAllTodos().pipe(Effect.flatMap(todos => Effect.logInfo(todos)));

    const edit = (id: TodoId, payload: OptionalTodoWithoutId) =>
      client.todos.editTodo({ path: { id }, payload }).pipe(
        Effect.flatMap(todo => Effect.logInfo("Edited todo: ", todo)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
      );

    const remove = (id: TodoId) =>
      client.todos.removeTodo({ path: { id } }).pipe(
        Effect.flatMap(() => Effect.logInfo(`Deleted todo with id: ${id}`)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
      );

    return {
      create,
      list,
      edit,
      remove,
    } as const;
  }),
}) {}
