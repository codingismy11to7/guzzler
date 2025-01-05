import { HttpApiMiddleware, HttpApiSchema } from "@effect/platform";
import { Context, Schema } from "effect";
import { Session } from "./Session.js";

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>("Unauthenticated")(
  "Unauthenticated",
  {},
  HttpApiSchema.annotations({ status: 401 }),
) {}

export class CurrentSession extends Context.Tag("CurrentSession")<CurrentSession, Session>() {}

export class AuthenticationMiddleware extends HttpApiMiddleware.Tag<AuthenticationMiddleware>()("Authentication", {
  failure: Unauthenticated,
  provides: CurrentSession,
  optional: false,
}) {}
