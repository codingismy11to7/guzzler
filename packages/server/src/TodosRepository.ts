import { TodosApi as T } from "@guzzler/domain";
import { Effect, pipe } from "effect";
import { nanoid } from "nanoid";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

/**
 * Fake Todos database service
 */

export class TodosRepository extends Effect.Service<TodosRepository>()("api/TodosRepository", {
  effect: Effect.gen(function* () {
    const { todos } = yield* CollectionRegistry;

    const getAll = todos.find().pipe(Effect.andThen(f => f.toArray));

    const getById = (id: T.TodoId): Effect.Effect<T.Todo, T.TodoNotFound> =>
      pipe(
        todos.findOne({ id }),
        Effect.catchTag("NotFound", () => new T.TodoNotFound({ id })),
      );

    const create = (text: string): Effect.Effect<T.Todo> =>
      pipe(
        Effect.succeed(T.Todo.make({ id: T.TodoId.make(nanoid()), done: false, text })),
        Effect.tap(t => todos.upsert({ id: t.id }, t)),
      );

    const edit = (id: T.TodoId, updates: T.OptionalTodoWithoutId): Effect.Effect<T.Todo, T.TodoNotFound> =>
      getById(id).pipe(
        Effect.map(todo => T.Todo.make({ ...todo, ...updates })),
        Effect.tap(todo => todos.upsert({ id: todo.id }, todo)),
      );

    const remove = (id: T.TodoId): Effect.Effect<void, T.TodoNotFound> =>
      pipe(
        todos.deleteOne({ id }),
        Effect.tap(r => (r.deletedCount === 0 ? new T.TodoNotFound({ id }) : Effect.void)),
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
