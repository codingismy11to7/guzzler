import { HttpApiBuilder } from "@effect/platform";
import { Conflict } from "@effect/platform/HttpApiError";
import { SetUsername } from "@guzzlerapp/domain/apis/SignupApi";
import { AppApi } from "@guzzlerapp/domain/AppApi";
import { CurrentUnknownUserSession } from "@guzzlerapp/domain/Authentication";
import { UserSession } from "@guzzlerapp/domain/Session";
import { User } from "@guzzlerapp/domain/User";
import { Effect, pipe, Struct } from "effect";
import { catchTag } from "effect/Effect";
import { SessionStorage } from "../SessionStorage.js";
import { Users } from "../Users.js";

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
              const userId = sess.oAuthUserInfo.id;
              const user = User.make({ ...sess, _id: userId, username });

              yield* Effect.logInfo(
                "Setting username and creating account",
              ).pipe(Effect.annotateLogs({ userId, user }));

              yield* addUser(user);

              yield* Effect.logDebug("promoting session to full");

              const fullSess = UserSession.make({
                ...Struct.omit(sess, "_tag"),
                user,
              });

              yield* addSession(fullSess);
            }),
          ),
        ).pipe(catchTag("DocumentConflict", () => new Conflict())),
      );
  }),
);
