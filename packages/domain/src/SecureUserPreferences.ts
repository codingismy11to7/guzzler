import { Schema, Struct } from "effect";
import { RemoveField } from "./MiscSchemas.js";
import { Username } from "./User.js";

export const SecureUserPreferencesFields = Schema.Struct({
  googleMapsApiKey: Schema.Trim.pipe(
    Schema.Redacted,
    Schema.OptionFromUndefinedOr,
  ),
});
export type SecureUserPreferencesFields =
  typeof SecureUserPreferencesFields.Type;

export const SecureUserPreferences = Schema.Struct({
  _id: Username,
  ...SecureUserPreferencesFields.fields,
});
export type SecureUserPreferences = typeof SecureUserPreferences.Type;

export const SecureUserPreferencesPatch = Schema.Struct({
  ...Object.fromEntries(
    Struct.keys(SecureUserPreferencesFields.fields).map(k => [
      k,
      // with it nullable, if the field isn't included (or set to null) then
      // the field just doesn't exist after decoding...but if it exists but
      // is explicitly set to undefined, then it'll be an Option.None. this
      // gives us a three-way operation for patches
      SecureUserPreferencesFields.fields[k].pipe(v =>
        Schema.Union(v, RemoveField),
      ),
    ]),
  ),
});
export type SecureUserPreferencesPatch = typeof SecureUserPreferencesPatch.Type;
