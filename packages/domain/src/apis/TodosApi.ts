import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";

export const TodoId = Schema.String.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

const TodoWithoutId = Schema.Struct({
  text: Schema.NonEmptyTrimmedString,
  done: Schema.Boolean,
});
export const OptionalTodoWithoutId = Schema.Struct({
  text: Schema.NonEmptyTrimmedString.pipe(Schema.optionalWith({ exact: true, nullable: true })),
  done: Schema.Boolean.pipe(Schema.optionalWith({ exact: true, nullable: true })),
});
export type OptionalTodoWithoutId = typeof OptionalTodoWithoutId.Type;

export const Todo = Schema.Struct({
  id: Schema.propertySignature(TodoId).pipe(Schema.fromKey("_id")),
  ...TodoWithoutId.fields,
});
export type Todo = typeof Todo.Type;

export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()("TodoNotFound", {
  id: Schema.String,
}) {}

export class TodosApiGroup extends HttpApiGroup.make("todos")
  .add(HttpApiEndpoint.get("getAllTodos", "/").addSuccess(Schema.Array(Todo)))
  .add(
    HttpApiEndpoint.get("getTodoById", "/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoId })),
  )
  .add(
    HttpApiEndpoint.post("createTodo", "/")
      .addSuccess(Todo)
      .setPayload(Schema.Struct({ text: Schema.NonEmptyTrimmedString })),
  )
  .add(
    HttpApiEndpoint.patch("editTodo", "/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoId }))
      .setPayload(OptionalTodoWithoutId),
  )
  .add(
    HttpApiEndpoint.del("removeTodo", "/:id")
      .addSuccess(Schema.Void)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoId })),
  )
  .prefix("/api/todos")
  .middleware(RequireFullSession)
  .annotateContext(
    OpenApi.annotations({
      title: "Obligatory Todos",
      description: "Came with the template, will go away",
    }),
  ) {}
