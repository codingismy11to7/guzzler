import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentSession } from "@guzzler/domain/Authentication";
import { Effect } from "effect";

export const SessionApiLive = HttpApiBuilder.group(AppApi, "session", handlers =>
  handlers.handle("getUserInfo", () => CurrentSession.pipe(Effect.map(s => s.oAuthUserInfo))),
);
