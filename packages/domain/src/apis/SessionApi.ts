import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";
import { Schema, Struct } from "effect";
import { RawSessionAccess_DoNotUse } from "../Authentication.js";
import { OAuthUserInfo } from "../OAuthUserInfo.js";
import { User } from "../User.js";

export const SessionWithoutUser = Schema.TaggedStruct("SessionWithoutUser", {
  userInfo: OAuthUserInfo,
});
export type SessionWithoutUser = typeof SessionWithoutUser.Type;
export const FullSession = Schema.TaggedStruct("FullSession", {
  ...Struct.omit(SessionWithoutUser.fields, "_tag"),
  user: User,
});
export type FullSession = typeof FullSession.Type;
export const SessionInfo = Schema.Union(FullSession, SessionWithoutUser);
export type SessionInfo = typeof SessionInfo.Type;

export class SessionApi extends HttpApiGroup.make("session")
  .add(HttpApiEndpoint.get("getSessionInfo", "/info").addSuccess(SessionInfo).addError(Unauthorized))
  .add(HttpApiEndpoint.get("logout", "/logout").addSuccess(Schema.Void, { status: 303 }))
  .middleware(RawSessionAccess_DoNotUse)
  .prefix("/session") {}
