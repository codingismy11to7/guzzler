import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentUnknownUserSession } from "@guzzler/domain/Authentication";
import { UserId } from "@guzzler/domain/User";
import { Effect, pipe } from "effect";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";

export const SignupApiLive = HttpApiBuilder.group(AppApi, "signup", handlers =>
  Effect.gen(function* () {
    const { clearSession } = yield* SessionStorage;
    const { addUser, usernameAvailable } = yield* Users;

    return handlers

      .handle("validateUsername", ({ path: { username } }) =>
        pipe(
          CurrentUnknownUserSession,
          Effect.andThen(usernameAvailable(username)),
          Effect.andThen(available => ({ available })),
        ),
      )

      .handleRaw("setUsername", ({ payload: { username } }) =>
        pipe(
          CurrentUnknownUserSession,
          Effect.andThen(sess =>
            Effect.gen(function* () {
              /*
              const req = yield* HttpServerRequest;
*/

              yield* addUser({ ...sess, id: UserId.make(sess.oAuthUserInfo.id), username });
              yield* clearSession(sess.id);

              return yield* HttpServerResponse.redirect(/*postLoginUrl(req)*/ "/", {
                status: 303,
                /*
                cookies: removePostLoginCookie,
*/
              });
            }),
          ),
        ),
      );
  }),
);
