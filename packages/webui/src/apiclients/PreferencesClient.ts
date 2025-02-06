import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import {
  SecureUserPreferencesFields,
  SecureUserPreferencesPatch,
} from "@guzzlerapp/domain/SecureUserPreferences";
import { Effect } from "effect";
import { catchTags, gen } from "effect/Effect";
import { dieFromFatal } from "../internal/apiclients/utils.js";

export class PreferencesClient extends Effect.Service<PreferencesClient>()(
  "PreferencesClient",
  {
    accessors: true,
    effect: gen(function* () {
      const client = yield* HttpApiClient.make(AppApi.AppApi);

      const fetchSecurePreferences: Effect.Effect<SecureUserPreferencesFields> =
        client.preferences.getSecurePreferences().pipe(catchTags(dieFromFatal));

      const updateSecurePreferences = (
        payload: SecureUserPreferencesPatch,
      ): Effect.Effect<void, RedactedError> =>
        client.preferences
          .updateSecurePreferences({ payload })
          .pipe(catchTags(dieFromFatal));

      return {
        fetchSecurePreferences,
        updateSecurePreferences,
      };
    }),
  },
) {}
