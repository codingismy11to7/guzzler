import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { nanoid } from "nanoid";
import { AuthenticationMiddleware } from "./Authentication.js";
import { OAuthUserInfo } from "./OAuthUserInfo.js";

/**
 * App schema & api
 */

export const TodoId = Schema.String.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

const TodoWithoutId = Schema.Struct({
  text: Schema.NonEmptyTrimmedString,
  done: Schema.Boolean.pipe(Schema.optionalWith({ default: () => false, exact: true, nullable: true })),
});
export const OptionalTodoWithoutId = Schema.Struct({
  text: Schema.NonEmptyTrimmedString.pipe(Schema.optionalWith({ exact: true, nullable: true })),
  done: Schema.Boolean.pipe(Schema.optionalWith({ exact: true, nullable: true })),
});
export type OptionalTodoWithoutId = typeof OptionalTodoWithoutId.Type;

export const Todo = Schema.Struct({
  id: TodoId.pipe(
    Schema.optionalWith({ default: () => TodoId.make(nanoid()), exact: true, nullable: true }),
    Schema.fromKey("_id"),
  ),
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
  .middleware(AuthenticationMiddleware) {}

export class ServerError extends Schema.TaggedError<ServerError>()(
  "ServerError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 500 }),
) {}

export class AuthApi extends HttpApiGroup.make("auth")
  .add(HttpApiEndpoint.get("oAuthCallback", "/callback").addError(ServerError))
  .add(HttpApiEndpoint.get("startRedirect", "/"))
  .annotateContext(OpenApi.annotations({ exclude: true }))
  .prefix("/auth/google") {}

export class SessionApi extends HttpApiGroup.make("session")
  .add(HttpApiEndpoint.get("getUserInfo", "/userInfo").addSuccess(OAuthUserInfo))
  .add(HttpApiEndpoint.get("logout", "/logout").addSuccess(Schema.Void, { status: 303 }))
  .prefix("/session")
  .middleware(AuthenticationMiddleware) {}

export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {}) {}

class UI extends HttpApiGroup.make("ui")
  .add(HttpApiEndpoint.get("ui", "/*").addError(NotFound, { status: 404 }).addError(ServerError))
  .annotateContext(OpenApi.annotations({ exclude: true })) {}

export class AppApi extends HttpApi.make("Guzzler")
  .add(TodosApiGroup)
  .add(AuthApi)
  .add(SessionApi)
  .add(UI)
  .annotateContext(OpenApi.annotations({ title: "Guzzler" })) {}
