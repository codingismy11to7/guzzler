import { Schema } from "effect";

export const OAuthUserInfo = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  verified_email: Schema.Boolean,
  name: Schema.String,
  given_name: Schema.String,
  family_name: Schema.String,
  picture: Schema.String,
});
export type OAuthUserInfo = typeof OAuthUserInfo.Type;
