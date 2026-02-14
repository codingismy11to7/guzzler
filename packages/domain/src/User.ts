import { Schema } from "effect";
import { OAuthUserInfo, UserInfoId } from "./OAuthUserInfo.js";

export const Username = Schema.String.pipe(
  Schema.length({ min: 4, max: 20 }),
  Schema.pattern(/^[a-z0-9._-]+$/),
  Schema.brand("Username"),
);
export type Username = typeof Username.Type;

export const User = Schema.Struct({
  _id: UserInfoId,
  username: Username,
  oAuthUserInfo: OAuthUserInfo,
});
export type User = typeof User.Type;
