import { HttpApiClient } from "@effect/platform";
import { TodosApi } from "@guzzler/domain/TodosApi";
import { Effect } from "effect";

/**
 * Todos REST client service
 */

export class TodosClient extends Effect.Service<TodosClient>()("cli/TodosClient", {
  accessors: true,
  effect: Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TodosApi, {
      baseUrl: "http://localhost:3000",
    });

    const create = (text: string) =>
      client.todos
        .createTodo({ payload: { text } })
        .pipe(Effect.flatMap(todo => Effect.logInfo("Created todo: ", todo)));

    const list = client.todos.getAllTodos().pipe(Effect.flatMap(todos => Effect.logInfo(todos)));

    const complete = (id: number) =>
      client.todos.completeTodo({ path: { id } }).pipe(
        Effect.flatMap(todo => Effect.logInfo("Marked todo completed: ", todo)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
      );

    const remove = (id: number) =>
      client.todos.removeTodo({ path: { id } }).pipe(
        Effect.flatMap(() => Effect.logInfo(`Deleted todo with id: ${id}`)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`)),
      );

    return {
      create,
      list,
      complete,
      remove,
    } as const;
  }),
}) {}
