import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect, pipe } from "effect";
import { TodosRepository } from "../../../TodosRepository.js";

/**
 * Todos API implementation
 */
export const TodosApiLive = HttpApiBuilder.group(AppApi, "todos", handlers =>
  pipe(
    TodosRepository,
    Effect.andThen(todos =>
      handlers
        .handle("getAllTodos", () => todos.getAll)
        .handle("getTodoById", ({ path: { id } }) => todos.getById(id))
        .handle("createTodo", ({ payload: { text } }) => todos.create(text))
        .handle("editTodo", ({ path: { id }, payload }) =>
          todos.edit(id, payload),
        )
        .handle("removeTodo", ({ path: { id } }) => todos.remove(id)),
    ),
  ),
);
