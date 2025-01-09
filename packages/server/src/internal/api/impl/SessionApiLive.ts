import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { HttpApiDecodeError } from "@effect/platform/HttpApiError";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { AppApi, FullSession, SessionInfo, SessionWithoutUser } from "@guzzler/domain/AppApi";
import { CurrentSession, Unauthenticated } from "@guzzler/domain/Authentication";
import { UserId } from "@guzzler/domain/User";
import { Effect, Match } from "effect";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";
import { postLoginUrl, removePostLoginCookie } from "./AuthApiLive.js";

export const SessionApiLive = HttpApiBuilder.group(AppApi, "session", handlers =>
  handlers
    .handle(
      "getSessionInfo",
      (): Effect.Effect<SessionInfo, HttpApiDecodeError | Unauthenticated, CurrentSession> =>
        Effect.gen(function* () {
          const sess = yield* CurrentSession;

          const si = (si: SessionInfo): SessionInfo => si;

          return Match.value(sess).pipe(
            Match.tag("UserSession", s => si(FullSession.make({ user: s.user, userInfo: s.oAuthUserInfo }))),
            Match.tag("UnknownUserSession", s => si(SessionWithoutUser.make({ userInfo: s.oAuthUserInfo }))),
            Match.exhaustive,
          );
        }),
    )
    .handleRaw("logout", () =>
      Effect.gen(function* () {
        const { id } = yield* CurrentSession;
        const { clearSession } = yield* SessionStorage;
        yield* clearSession(id);

        return HttpServerResponse.redirect("/", {
          status: 303,
          cookies: removePostLoginCookie,
        });
      }),
    )
    .handle("validateUsername", ({ path: { username } }) =>
      Effect.gen(function* () {
        const { usernameAvailable } = yield* Users;

        return { available: yield* usernameAvailable(username) };
      }),
    )
    .handleRaw("setUsername", ({ payload: { username } }) =>
      Effect.gen(function* () {
        const session = yield* CurrentSession;

        return yield* Match.value(session).pipe(
          Match.tag("UserSession", () => Effect.succeed(HttpServerResponse.text("Forbidden", { status: 403 }))),

          Match.tag("UnknownUserSession", sess =>
            Effect.gen(function* () {
              const req = yield* HttpServerRequest;
              const { addUser } = yield* Users;
              const { clearSession } = yield* SessionStorage;

              yield* addUser({ ...sess, id: UserId.make(`google/${sess.oAuthUserInfo.id}`), username });
              yield* clearSession(sess.id);

              return yield* HttpServerResponse.redirect(postLoginUrl(req), {
                status: 303,
                cookies: removePostLoginCookie,
              });
            }),
          ),
          Match.exhaustive,
        );
      }),
    ),
);
