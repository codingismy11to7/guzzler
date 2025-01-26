import { HttpApiMiddleware } from "@effect/platform";
import { Forbidden, Unauthorized } from "@effect/platform/HttpApiError";
import { apiKey } from "@effect/platform/HttpApiSecurity";
import { Context, Schema } from "effect";
import { gen } from "effect/Effect";
import { Session, UnknownUserSession, UserSession } from "./Session.js";

export const SessionCookieName = "guzzler-session-id";

export class RawCurrentSession_DoNotUse extends Context.Tag(
  "RawCurrentSession_DoNotUse",
)<RawCurrentSession_DoNotUse, Session>() {}
export class CurrentUnknownUserSession extends Context.Tag(
  "CurrentUnknownUserSession",
)<CurrentUnknownUserSession, UnknownUserSession>() {}
export class CurrentFullSession extends Context.Tag("CurrentFullSession")<
  CurrentFullSession,
  UserSession
>() {}

export const currentSessionUsername = gen(function* () {
  const { user } = yield* CurrentFullSession;
  return user.username;
});

export class RequireNewUserSession extends HttpApiMiddleware.Tag<RequireNewUserSession>()(
  "RequireNewUserSession",
  {
    failure: Schema.Union(Unauthorized, Forbidden),
    provides: CurrentUnknownUserSession,
    optional: false,
    security: {
      SessionCookie: apiKey({ key: SessionCookieName, in: "cookie" }),
    },
  },
) {}
export class RequireFullSession extends HttpApiMiddleware.Tag<RequireFullSession>()(
  "RequireFullSession",
  {
    failure: Schema.Union(Unauthorized, Forbidden),
    provides: CurrentFullSession,
    optional: false,
    security: {
      SessionCookie: apiKey({ key: SessionCookieName, in: "cookie" }),
    },
  },
) {}

export class RawSessionAccess_DoNotUse extends HttpApiMiddleware.Tag<RawSessionAccess_DoNotUse>()(
  "RawSessionAccess_DoNotUse",
  {
    provides: RawCurrentSession_DoNotUse,
    optional: true,
    security: {
      SessionCookie: apiKey({ key: SessionCookieName, in: "cookie" }),
    },
  },
) {}

export class AuthRedirectMiddleware extends HttpApiMiddleware.Tag<AuthRedirectMiddleware>()(
  "AuthRedirectMiddleware",
  {
    optional: false,
  },
) {}
