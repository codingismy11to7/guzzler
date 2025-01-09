import { Schema } from "effect";
import { OAuthUserInfo } from "./OAuthUserInfo.js";

export const UserId = Schema.String.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

export const Username = Schema.String.pipe(
  Schema.length({ min: 5, max: 20 }),
  Schema.pattern(/^[a-z0-9._-]+$/),
  Schema.brand("Username"),
);
export type Username = typeof Username.Type;

export const User = Schema.Struct({
  id: Schema.propertySignature(UserId).pipe(Schema.fromKey("_id")),
  username: Username,
  oAuthUserInfo: OAuthUserInfo,
});
export type User = typeof User.Type;
