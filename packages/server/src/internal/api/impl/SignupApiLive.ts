import { HttpApiBuilder } from "@effect/platform";
import { SetUsername } from "@guzzler/domain/apis/SignupApi";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentUnknownUserSession } from "@guzzler/domain/Authentication";
import { UserSession } from "@guzzler/domain/Session";
import { User, UserId } from "@guzzler/domain/User";
import { Effect, pipe, Struct } from "effect";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";

export const SignupApiLive = HttpApiBuilder.group(AppApi, "signup", handlers =>
  Effect.gen(function* () {
    const { addSession } = yield* SessionStorage;
    const { addUser, usernameAvailable } = yield* Users;

    return handlers

      .handle("validateUsername", ({ path: { username } }) =>
        pipe(
          CurrentUnknownUserSession,
          Effect.andThen(usernameAvailable(username)),
          Effect.andThen(available => ({ available })),
        ),
      )

      .handle(SetUsername, ({ path: { username } }) =>
        pipe(
          CurrentUnknownUserSession,
          Effect.andThen(sess =>
            Effect.gen(function* () {
              const userId = UserId.make(sess.oAuthUserInfo.id);
              const user = User.make({ ...sess, id: userId, username });

              yield* Effect.logInfo("Setting username and creating account").pipe(
                Effect.annotateLogs({ userId, user }),
              );

              yield* addUser(user);

              yield* Effect.logDebug("promoting session to full");

              const fullSess = UserSession.make({ ...Struct.omit(sess, "_tag"), user });

              yield* addSession(fullSess);
            }),
          ),
        ),
      );
  }),
);
