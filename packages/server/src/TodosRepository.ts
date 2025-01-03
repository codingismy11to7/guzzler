import { OptionalTodoWithoutId, Todo, TodoId, TodoNotFound } from "@guzzler/domain/AppApi";
import { Effect, HashMap, Ref } from "effect";

/**
 * Fake Todos database service
 */

export class TodosRepository extends Effect.Service<TodosRepository>()("api/TodosRepository", {
  effect: Effect.gen(function* () {
    const todos = yield* Ref.make(HashMap.empty<TodoId, Todo>());

    const getAll = Ref.get(todos).pipe(Effect.map(todos => Array.from(HashMap.values(todos))));

    const getById = (id: number): Effect.Effect<Todo, TodoNotFound> =>
      Ref.get(todos).pipe(
        Effect.flatMap(HashMap.get(id)),
        Effect.catchTag("NoSuchElementException", () => new TodoNotFound({ id })),
      );

    const create = (text: string): Effect.Effect<Todo> =>
      Ref.modify(todos, map => {
        const id = TodoId.make(HashMap.reduce(map, 0, (max, todo) => (todo.id > max ? todo.id : max)));
        const todo = new Todo({ id, text, done: false });
        return [todo, HashMap.set(map, id, todo)];
      });

    const edit = (id: number, updates: OptionalTodoWithoutId): Effect.Effect<Todo, TodoNotFound> =>
      getById(id).pipe(
        Effect.map(todo => new Todo({ ...todo, ...updates })),
        Effect.tap(todo => Ref.update(todos, HashMap.set(todo.id, todo))),
      );

    const remove = (id: number): Effect.Effect<void, TodoNotFound> =>
      getById(id).pipe(Effect.flatMap(todo => Ref.update(todos, HashMap.remove(todo.id))));

    return {
      getAll,
      getById,
      create,
      edit,
      remove,
    } as const;
  }),
}) {}
