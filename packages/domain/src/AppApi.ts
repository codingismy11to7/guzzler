import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform";
import { Conflict, Forbidden } from "@effect/platform/HttpApiError";
import { Schema, Struct } from "effect";
import { nanoid } from "nanoid";
import { AuthenticationMiddleware, NewUserSetupRedirectMiddleware, OptionalAuthMiddleware } from "./Authentication.js";
import { OAuthUserInfo } from "./OAuthUserInfo.js";
import { User, Username } from "./User.js";

/**
 * App schema & api
 */

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
  .middleware(AuthenticationMiddleware) {}

export class ServerError extends Schema.TaggedError<ServerError>()(
  "ServerError",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 500 }),
) {}

export class RedactedError extends Schema.TaggedError<RedactedError>()(
  "RedactedError",
  {
    id: Schema.String.pipe(Schema.optionalWith({ default: () => nanoid() })),
  },
  HttpApiSchema.annotations({ status: 500 }),
) {}

export class AuthApi extends HttpApiGroup.make("auth")
  .add(HttpApiEndpoint.get("oAuthCallback", "/callback").addError(RedactedError))
  .add(HttpApiEndpoint.get("startRedirect", "/"))
  .annotateContext(OpenApi.annotations({ exclude: true }))
  .prefix("/auth/google") {}

export const SessionWithoutUser = Schema.TaggedStruct("SessionWithoutUser", {
  userInfo: OAuthUserInfo,
});
export type SessionWithoutUser = typeof SessionWithoutUser.Type;
export const FullSession = Schema.TaggedStruct("FullSession", {
  ...Struct.omit(SessionWithoutUser.fields, "_tag"),
  user: User,
});
export type FullSession = typeof FullSession.Type;
export const SessionInfo = Schema.Union(FullSession, SessionWithoutUser);
export type SessionInfo = typeof SessionInfo.Type;

export class SessionApi extends HttpApiGroup.make("session")
  .add(HttpApiEndpoint.get("getSessionInfo", "/info").addSuccess(SessionInfo))
  .add(HttpApiEndpoint.get("logout", "/logout").addSuccess(Schema.Void, { status: 303 }))
  .add(
    HttpApiEndpoint.get("validateUsername", "/username/:username/validate")
      .setPath(Schema.Struct({ username: Username }))
      .addSuccess(Schema.Struct({ available: Schema.Boolean }))
      .addError(Forbidden),
  )
  .add(
    HttpApiEndpoint.post("setUsername", "/username/set")
      .setPayload(Schema.Struct({ username: Username }).pipe(HttpApiSchema.withEncoding({ kind: "UrlParams" })))
      .addSuccess(Schema.Void, { status: 303 })
      .addError(Conflict)
      .addError(Forbidden),
  )
  .prefix("/session")
  .middleware(AuthenticationMiddleware) {}

export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {}) {}

class UI extends HttpApiGroup.make("ui")
  .add(
    HttpApiEndpoint.get("ui", "/*").addError(NotFound, { status: 404 }).addError(RedactedError).addError(ServerError),
  )
  .middleware(NewUserSetupRedirectMiddleware)
  .middleware(OptionalAuthMiddleware)
  .annotateContext(OpenApi.annotations({ exclude: true })) {}

export class AppApi extends HttpApi.make("Guzzler")
  .add(TodosApiGroup)
  .add(AuthApi)
  .add(SessionApi)
  .add(UI)
  .annotateContext(OpenApi.annotations({ title: "Guzzler" })) {}
