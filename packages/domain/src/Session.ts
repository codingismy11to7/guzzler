import { Schema } from "effect";
import { nanoid } from "nanoid";
import { OAuthUserInfo } from "./OAuthUserInfo.js";
import { Token } from "./Token.js";

export const SessionId = Schema.String.pipe(Schema.brand("SessionId"));
export type SessionId = typeof SessionId.Type;

export class Session extends Schema.Class<Session>("Session")({
  id: SessionId.pipe(Schema.optionalWith({ default: () => SessionId.make(nanoid()), exact: true, nullable: true })),
  token: Token,
  oAuthUserInfo: OAuthUserInfo,
}) {}
