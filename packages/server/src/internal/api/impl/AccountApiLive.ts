import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentFullSession } from "@guzzler/domain/Authentication";
import { Effect } from "effect";
import { Users } from "../../../Users.js";

export const AccountApiLive = HttpApiBuilder.group(AppApi, "account", handlers =>
  Effect.gen(function* () {
    const { deleteUser } = yield* Users;

    return handlers.handle("deleteAccount", () =>
      Effect.gen(function* () {
        const { user } = yield* CurrentFullSession;

        yield* Effect.logInfo("Deleting account").pipe(Effect.annotateLogs({ user }));

        yield* deleteUser(user.id);

        yield* Effect.logInfo("Account deleted");
      }),
    );
  }),
);
