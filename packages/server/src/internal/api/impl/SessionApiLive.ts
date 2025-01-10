import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Forbidden } from "@effect/platform/HttpApiError";
import { AppApi, FullSession, SessionWithoutUser } from "@guzzler/domain/AppApi";
import { CurrentSession } from "@guzzler/domain/Authentication";
import { Session } from "@guzzler/domain/Session";
import { UserId } from "@guzzler/domain/User";
import { Effect, Match, pipe } from "effect";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";

export const SessionApiLive = HttpApiBuilder.group(AppApi, "session", handlers =>
  Effect.gen(function* () {
    const { clearSession } = yield* SessionStorage;
    const { addUser, usernameAvailable } = yield* Users;

    return handlers
      .handle("getSessionInfo", () =>
        pipe(
          CurrentSession,
          Effect.andThen(
            Match.type<Session>().pipe(
              Match.tagsExhaustive({
                UserSession: s => FullSession.make({ user: s.user, userInfo: s.oAuthUserInfo }),

                UnknownUserSession: s => SessionWithoutUser.make({ userInfo: s.oAuthUserInfo }),
              }),
            ),
          ),
        ),
      )

      .handleRaw("logout", () =>
        Effect.gen(function* () {
          const { id } = yield* CurrentSession;
          yield* clearSession(id);

          return HttpServerResponse.redirect("/", {
            status: 303,
            /*
            cookies: removePostLoginCookie,
  */
          });
        }),
      )

      .handle("validateUsername", ({ path: { username } }) =>
        pipe(
          CurrentSession,
          Effect.andThen(
            Match.type<Session>().pipe(
              Match.tagsExhaustive({
                UserSession: () => new Forbidden(),

                UnknownUserSession: () =>
                  pipe(
                    usernameAvailable(username),
                    Effect.andThen(available => ({ available })),
                  ),
              }),
            ),
          ),
        ),
      )

      .handleRaw("setUsername", ({ payload: { username } }) =>
        pipe(
          CurrentSession,
          Effect.andThen(
            Match.type<Session>().pipe(
              Match.tagsExhaustive({
                UserSession: () => new Forbidden(),

                UnknownUserSession: sess =>
                  Effect.gen(function* () {
                    /*
                  const req = yield* HttpServerRequest;
    */

                    yield* addUser({ ...sess, id: UserId.make(`google/${sess.oAuthUserInfo.id}`), username });
                    yield* clearSession(sess.id);

                    return yield* HttpServerResponse.redirect(/*postLoginUrl(req)*/ "/", {
                      status: 303,
                      /*
                    cookies: removePostLoginCookie,
    */
                    });
                  }),
              }),
            ),
          ),
        ),
      );
  }),
);
