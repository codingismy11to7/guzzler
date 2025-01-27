import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { currentSessionUsername } from "@guzzler/domain/Authentication";
import { RedactedError } from "@guzzler/domain/Errors";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { RandomId } from "@guzzler/utils/RandomId";
import { catchTags, gen } from "effect/Effect";
import * as internal from "../internal/apis/preferencesApiLive.js";
import { CollectionRegistry } from "../internal/database/CollectionRegistry.js";

export const PreferencesApiLive = HttpApiBuilder.group(
  AppApi,
  "preferences",
  handlers =>
    gen(function* () {
      const colls = yield* CollectionRegistry;
      const txns = yield* MongoTransactions;
      const randomId = yield* RandomId;

      return handlers
        .handle("getSecurePreferences", () =>
          gen(function* () {
            const username = yield* currentSessionUsername;

            return yield* internal.getSecurePreferences(colls, username);
          }),
        )
        .handle("updateSecurePreferences", ({ payload }) =>
          gen(function* () {
            const username = yield* currentSessionUsername;

            return yield* internal.updateSecurePreferences(
              colls,
              txns,
              username,
              payload,
            );
          }).pipe(
            catchTags({ MongoError: RedactedError.provideLogged(randomId) }),
          ),
        );
    }),
);
