import { HttpApiBuilder } from "@effect/platform";
import { Conflict } from "@effect/platform/HttpApiError";
import { SetUsername } from "@guzzlerapp/domain/apis/SignupApi";
import { AppApi } from "@guzzlerapp/domain/AppApi";
import { CurrentUnknownUserSession } from "@guzzlerapp/domain/Authentication";
import { UserSession } from "@guzzlerapp/domain/Session";
import { User } from "@guzzlerapp/domain/User";
import { Struct } from "effect";
import { annotateLogs, catchTag, fn, logDebug, logInfo } from "effect/Effect";
import { SessionStorage } from "../SessionStorage.js";
import { Users } from "../Users.js";

export const SignupApiLive = HttpApiBuilder.group(
  AppApi,
  "signup",
  fn(function* (handlers) {
    const { addSession } = yield* SessionStorage;
    const { addUser, usernameAvailable } = yield* Users;

    return handlers
      .handle(
        "validateUsername",
        fn("validateUsername")(function* ({ path: { username } }) {
          yield* CurrentUnknownUserSession;

          const available = yield* usernameAvailable(username);

          return { available };
        }),
      )

      .handle(
        SetUsername,
        fn(SetUsername)(
          function* ({ path: { username } }) {
            const sess = yield* CurrentUnknownUserSession;

            const userId = sess.oAuthUserInfo.id;
            const user = User.make({ ...sess, _id: userId, username });

            yield* logInfo("Setting username and creating account").pipe(
              annotateLogs({ userId, user }),
            );

            yield* addUser(user);

            yield* logDebug("promoting session to full");

            const fullSess = UserSession.make({
              ...Struct.omit(sess, "_tag"),
              user,
            });

            yield* addSession(fullSess);
          },
          catchTag("DocumentConflict", () => new Conflict()),
        ),
      );
  }),
);
