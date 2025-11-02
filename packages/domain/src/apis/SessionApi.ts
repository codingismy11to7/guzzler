import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";
import { TaggedStruct, Union, Void } from "effect/Schema";
import { omit } from "effect/Struct";
import { RawSessionAccess_DoNotUse } from "../Authentication.js";
import { OAuthUserInfo } from "../OAuthUserInfo.js";
import { User } from "../User.js";

export const SessionWithoutUser = TaggedStruct("SessionWithoutUser", {
  userInfo: OAuthUserInfo,
});
export type SessionWithoutUser = typeof SessionWithoutUser.Type;
export const FullSession = TaggedStruct("FullSession", {
  ...omit(SessionWithoutUser.fields, "_tag"),
  user: User,
});
export type FullSession = typeof FullSession.Type;
export const SessionInfo = Union(FullSession, SessionWithoutUser);
export type SessionInfo = typeof SessionInfo.Type;

export const Logout = "logout";

export class SessionApi extends HttpApiGroup.make("session")
  .add(
    HttpApiEndpoint.get("getSessionInfo", "/info")
      .addSuccess(SessionInfo)
      .addError(Unauthorized),
  )
  .add(
    //
    HttpApiEndpoint.get(Logout, "/logout").addSuccess(Void, { status: 303 }),
  )
  .middleware(RawSessionAccess_DoNotUse)
  .prefix("/api/session") {}
