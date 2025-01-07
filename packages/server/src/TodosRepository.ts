import { OptionalTodoWithoutId, Todo, TodoId, TodoNotFound } from "@guzzler/domain/AppApi";
import { Effect, pipe } from "effect";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

/**
 * Fake Todos database service
 */

export class TodosRepository extends Effect.Service<TodosRepository>()("api/TodosRepository", {
  effect: Effect.gen(function* () {
    const { todos } = yield* CollectionRegistry;

    const getAll = todos.find().pipe(Effect.andThen(f => f.toArray));

    const getById = (id: TodoId): Effect.Effect<Todo, TodoNotFound> =>
      pipe(
        todos.findOne({ _id: id }),
        Effect.catchTag("NotFound", () => new TodoNotFound({ id })),
      );

    const create = (text: string): Effect.Effect<Todo> =>
      pipe(
        Effect.succeed(Todo.make({ text })),
        Effect.tap(t => todos.upsert({ _id: t.id }, t)),
      );

    const edit = (id: TodoId, updates: OptionalTodoWithoutId): Effect.Effect<Todo, TodoNotFound> =>
      getById(id).pipe(
        Effect.map(todo => Todo.make({ ...todo, ...updates })),
        Effect.tap(todo => todos.upsert({ _id: todo.id }, todo)),
      );

    const remove = (id: TodoId): Effect.Effect<void, TodoNotFound> =>
      pipe(
        todos.deleteOne({ _id: id }),
        Effect.tap(r => (r.deletedCount === 0 ? new TodoNotFound({ id }) : Effect.void)),
      );

    return {
      getAll,
      getById,
      create,
      edit,
      remove,
    } as const;
  }),
}) {}
