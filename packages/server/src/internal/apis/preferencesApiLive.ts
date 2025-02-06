import { isRemoveField } from "@guzzlerapp/domain/MiscSchemas";
import {
  SecureUserPreferences,
  SecureUserPreferencesFields,
  SecureUserPreferencesPatch,
} from "@guzzlerapp/domain/SecureUserPreferences";
import { Username } from "@guzzlerapp/domain/User";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { Context, Effect, Schema, Struct } from "effect";
import { catchTags, gen } from "effect/Effect";
import { isString } from "effect/String";
import { CollectionRegistry } from "../database/CollectionRegistry.js";

export const getSecurePreferences = (
  { secureUserPrefs }: Context.Tag.Service<CollectionRegistry>,
  username: Username,
) =>
  gen(function* () {
    const prefs = yield* secureUserPrefs.findOne({ _id: username }).pipe(
      catchTags({
        DocumentNotFound: () =>
          Effect.sync(() =>
            Schema.decodeUnknownSync(SecureUserPreferences)({
              _id: username,
            }),
          ),
      }),
    );

    return Struct.omit(prefs, "_id");
  });

export const updateSecurePreferences = (
  colls: Context.Tag.Service<CollectionRegistry>,
  { inTransactionRaw }: MongoTransactions,
  username: Username,
  payload: SecureUserPreferencesPatch,
) =>
  gen(function* () {
    const encodedPatch = Schema.encodeSync(SecureUserPreferencesPatch)(payload);

    yield* inTransactionRaw()(
      gen(function* () {
        const old = yield* getSecurePreferences(colls, username);
        const encodedOldVal = Schema.encodeSync(SecureUserPreferencesFields)(
          old,
        );

        const updated = Object.entries(encodedPatch).reduce(
          (acc, [k, v]) =>
            isString(v)
              ? { ...acc, [k]: v }
              : isRemoveField(v)
                ? { ...acc, [k]: undefined }
                : acc,
          encodedOldVal,
        );

        yield* colls.secureUserPrefs.upsert(
          { _id: username },
          Schema.decodeSync(SecureUserPreferences)({
            _id: username,
            ...updated,
          }),
        );
      }),
    );
  });
