import { Schema as S, Struct } from "effect";
import { RemoveField } from "./MiscSchemas.js";
import { Username } from "./User.js";

export const GoogleMapsApiKey = S.Trim.pipe(S.Redacted, S.brand("GMapsApiKey"));
export type GoogleMapsApiKey = typeof GoogleMapsApiKey.Type;

export const SecureUserPreferencesFields = S.Struct({
  googleMapsApiKey: S.OptionFromUndefinedOr(GoogleMapsApiKey),
});
export type SecureUserPreferencesFields =
  typeof SecureUserPreferencesFields.Type;

export const SecureUserPreferences = S.Struct({
  _id: Username,
  ...SecureUserPreferencesFields.fields,
});
export type SecureUserPreferences = typeof SecureUserPreferences.Type;

export const SecureUserPreferencesPatch = S.Struct({
  ...Object.fromEntries(
    Struct.keys(SecureUserPreferencesFields.fields).map(k => [
      k,
      // with it nullable, if the field isn't included (or set to null) then
      // the field just doesn't exist after decoding...but if it exists but
      // is explicitly set to undefined, then it'll be an Option.None. this
      // gives us a three-way operation for patches
      SecureUserPreferencesFields.fields[k].pipe(v => S.Union(v, RemoveField)),
    ]),
  ),
});
export type SecureUserPreferencesPatch = typeof SecureUserPreferencesPatch.Type;
