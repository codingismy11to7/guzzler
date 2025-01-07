import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { AuthenticationMiddleware } from "./Authentication.js";
import { OAuthUserInfo } from "./OAuthUserInfo.js";

/**
 * App schema & api
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
  .add(HttpApiEndpoint.get("getAllTodos", "/").addSuccess(Schema.Array(Todo)))
  .add(
    HttpApiEndpoint.get("getTodoById", "/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: Schema.NumberFromString })),
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
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(OptionalTodoWithoutId),
  )
  .add(
    HttpApiEndpoint.del("removeTodo", "/:id")
      .addSuccess(Schema.Void)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: Schema.NumberFromString })),
  )
  .prefix("/api/todos") {}

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
