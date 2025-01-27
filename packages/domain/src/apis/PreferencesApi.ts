import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";
import { RedactedError } from "../Errors.js";
import {
  SecureUserPreferencesFields,
  SecureUserPreferencesPatch,
} from "../SecureUserPreferences.js";

export class PreferencesApi extends HttpApiGroup.make("preferences")
  .add(
    HttpApiEndpoint.get("getSecurePreferences", "/secure").addSuccess(
      SecureUserPreferencesFields,
    ),
  )
  .add(
    HttpApiEndpoint.patch("updateSecurePreferences", "/secure")
      .setPayload(SecureUserPreferencesPatch)
      .addSuccess(Schema.Void)
      .addError(RedactedError),
  )
  .middleware(RequireFullSession)
  .prefix("/api/preferences") {}
