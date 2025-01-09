import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentSession, SessionCookieName } from "@guzzler/domain/Authentication";
import { Effect } from "effect";
import { SessionStorage } from "../../../SessionStorage.js";

export const SessionApiLive = HttpApiBuilder.group(AppApi, "session", handlers =>
  handlers
    .handle("getUserInfo", () => CurrentSession.pipe(Effect.map(s => s.oAuthUserInfo)))
    .handleRaw("logout", () =>
      Effect.gen(function* () {
        const { id } = yield* CurrentSession;
        const { clearSession } = yield* SessionStorage;
        yield* clearSession(id);

        return HttpServerResponse.redirect("/", { status: 303 }).pipe(
          HttpServerResponse.removeCookie(SessionCookieName),
        );
      }),
    ),
);
