import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

/**
 * Todo schema & api
 */

export const TodoId = Schema.Number.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

export const TodoIdFromString = Schema.NumberFromString.pipe(Schema.compose(TodoId));

class TodoWithoutId extends Schema.Class<TodoWithoutId>("TodoWithoutId")({
  text: Schema.NonEmptyTrimmedString,
  done: Schema.Boolean,
}) {}
export class OptionalTodoWithoutId extends Schema.Class<OptionalTodoWithoutId>("OptionalTodoWithoutId")({
  text: Schema.NonEmptyTrimmedString.pipe(Schema.optionalWith({ exact: true, nullable: true })),
  done: Schema.Boolean.pipe(Schema.optionalWith({ exact: true, nullable: true })),
}) {}

export class Todo extends TodoWithoutId.extend<Todo>("Todo")({
  id: TodoId,
}) {}

export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()("TodoNotFound", {
  id: Schema.Number,
}) {}

export class TodosApiGroup extends HttpApiGroup.make("todos")
  .add(HttpApiEndpoint.get("getAllTodos", "/todos").addSuccess(Schema.Array(Todo)))
  .add(
    HttpApiEndpoint.get("getTodoById", "/todos/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: Schema.NumberFromString })),
  )
  .add(
    HttpApiEndpoint.post("createTodo", "/todos")
      .addSuccess(Todo)
      .setPayload(Schema.Struct({ text: Schema.NonEmptyTrimmedString })),
  )
  .add(
    HttpApiEndpoint.patch("editTodo", "/todos/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(OptionalTodoWithoutId),
  )
  .add(
    HttpApiEndpoint.del("removeTodo", "/todos/:id")
      .addSuccess(Schema.Void)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: Schema.NumberFromString })),
  ) {}

export class TodosApi extends HttpApi.make("Guzzler").add(TodosApiGroup) {}
