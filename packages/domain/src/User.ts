import { Schema } from "effect";
import { nanoid } from "nanoid";
import { OAuthUserInfo } from "./OAuthUserInfo.js";

export const UserId = Schema.String.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

export const User = Schema.Struct({
  id: UserId.pipe(
    Schema.optionalWith({ default: () => UserId.make(nanoid()), exact: true, nullable: true }),
    Schema.fromKey("_id"),
  ),
  username: Schema.NonEmptyTrimmedString,
  oAuthUserInfo: OAuthUserInfo,
});
export type User = typeof User.Type;
