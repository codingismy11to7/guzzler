import { Schema } from "effect";

export class OAuthUserInfo extends Schema.Class<OAuthUserInfo>("OAuthUserInfo")({
  id: Schema.String,
  email: Schema.String,
  verified_email: Schema.Boolean,
  name: Schema.String,
  given_name: Schema.String,
  family_name: Schema.String,
  picture: Schema.String,
}) {}
