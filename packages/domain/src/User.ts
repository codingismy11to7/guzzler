import { Schema } from "effect";
import { OAuthUserInfo } from "./OAuthUserInfo.js";

export const UserId = Schema.String.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

export const User = Schema.Struct({
  id: Schema.propertySignature(UserId).pipe(Schema.fromKey("_id")),
  username: Schema.NonEmptyTrimmedString,
  oAuthUserInfo: OAuthUserInfo,
});
export type User = typeof User.Type;
