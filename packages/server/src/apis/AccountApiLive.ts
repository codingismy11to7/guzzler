import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentFullSession } from "@guzzler/domain/Authentication";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { Effect } from "effect";
import { gen } from "effect/Effect";
import { AutosStorage } from "../AutosStorage.js";
import { Users } from "../Users.js";

export const AccountApiLive = HttpApiBuilder.group(
  AppApi,
  "account",
  handlers =>
    Effect.gen(function* () {
      const { inTransaction } = yield* MongoTransactions;
      const { deleteAllUserData } = yield* AutosStorage;
      const { deleteUser } = yield* Users;

      return handlers.handle("deleteAccount", () =>
        Effect.gen(function* () {
          const { user } = yield* CurrentFullSession;

          yield* Effect.logInfo("Deleting account and user data").pipe(
            Effect.annotateLogs({ user }),
          );

          yield* inTransaction()(
            gen(function* () {
              yield* deleteAllUserData(user.username);
              yield* deleteUser(user.username);
            }),
          );

          yield* Effect.logInfo("Account deleted");
        }),
      );
    }),
);
