import { Schema } from "effect";

export const UserInfoId = Schema.Trim.pipe(Schema.brand("UserInfoId"));
export type UserInfoId = typeof UserInfoId.Type;

export const OAuthUserInfo = Schema.Struct({
  id: UserInfoId,
  email: Schema.String,
  verified_email: Schema.Boolean,
  name: Schema.String,
  given_name: Schema.String,
  family_name: Schema.String,
  picture: Schema.String,
});
export type OAuthUserInfo = typeof OAuthUserInfo.Type;
