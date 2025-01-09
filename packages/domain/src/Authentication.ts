import { HttpApiMiddleware, HttpApiSchema } from "@effect/platform";
import { apiKey } from "@effect/platform/HttpApiSecurity";
import { Context, Schema } from "effect";
import { Session } from "./Session.js";

export const SessionCookieName = "guzzler-session-id";

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
  security: { SessionCookie: apiKey({ key: SessionCookieName, in: "cookie" }) },
}) {}
export class OptionalAuthMiddleware extends HttpApiMiddleware.Tag<OptionalAuthMiddleware>()("OptionalAuthMiddleware", {
  provides: CurrentSession,
  optional: true,
  security: { SessionCookie: apiKey({ key: SessionCookieName, in: "cookie" }) },
}) {}

export class NewUserSetupRedirectMiddleware extends HttpApiMiddleware.Tag<NewUserSetupRedirectMiddleware>()(
  "NewUserSetupRedirectMiddleware",
  { optional: false },
) {}
