import { Schema } from "effect";
import { OAuthToken } from "./OAuthToken.js";
import { OAuthUserInfo } from "./OAuthUserInfo.js";
import { User } from "./User.js";

export const SessionId = Schema.String.pipe(Schema.Redacted, Schema.brand("SessionId"));
export type SessionId = typeof SessionId.Type;

export const UnknownUserSession = Schema.TaggedStruct("UnknownUserSession", {
  id: Schema.propertySignature(SessionId).pipe(Schema.fromKey("_id")),
  token: OAuthToken,
  oAuthUserInfo: OAuthUserInfo,
});
export type UnknownUserSession = typeof UnknownUserSession.Type;

export const UserSession = Schema.TaggedStruct("UserSession", {
  ...UnknownUserSession.omit("_tag").fields,
  user: User,
});
export type UserSession = typeof UserSession.Type;

export const Session = Schema.Union(UserSession, UnknownUserSession);
export type Session = typeof Session.Type;
