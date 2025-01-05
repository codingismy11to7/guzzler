import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { AppApi, ServerError } from "@guzzler/domain/AppApi";
import { Session } from "@guzzler/domain/Session";
import { Effect, pipe, Redacted } from "effect";
import { nanoid } from "nanoid";
import { AppConfig } from "../../../AppConfig.js";
import { OAuth2 } from "../../../OAuth2.js";
import { SessionStorage } from "../../../SessionStorage.js";

export const SessionCookieName = "guzzler-session-id";

export const AuthApiLive = HttpApiBuilder.group(AppApi, "auth", handlers =>
  Effect.gen(function* () {
    const { addSession } = yield* SessionStorage;
    const { userinfoUrl } = yield* AppConfig.oauth;
    const prodMode = yield* AppConfig.prodMode;
    const { startRedirectHandler, getAccessTokenFromAuthorizationCodeFlow, fetchUserInfo } = yield* OAuth2;

    return handlers
      .handleRaw("startRedirect", () => HttpServerRequest.HttpServerRequest.pipe(Effect.andThen(startRedirectHandler)))
      .handleRaw("oAuthCallback", () =>
        pipe(
          HttpServerRequest.HttpServerRequest,
          Effect.andThen(getAccessTokenFromAuthorizationCodeFlow),
          Effect.andThen(({ token, modifyReply }) =>
            pipe(
              Effect.logDebug("received accessToken", token),
              Effect.andThen(fetchUserInfo(userinfoUrl, Redacted.value(token.access_token))),
              Effect.tap(ui => Effect.logDebug("received userInfo", ui)),
              Effect.andThen(ui => addSession(new Session({ token, oAuthUserInfo: ui }))),
              Effect.andThen(session =>
                Effect.reduce(
                  [
                    ...modifyReply,
                    HttpServerResponse.setCookie(SessionCookieName, session.id, {
                      httpOnly: true,
                      secure: prodMode,
                      maxAge: "30 days",
                      sameSite: "lax",
                      path: "/",
                    }),
                  ],
                  HttpServerResponse.redirect("/"),
                  (acc, m) => m(acc),
                ),
              ),
            ),
          ),
          Effect.catchAll(e =>
            Effect.Do.pipe(
              Effect.let("id", () => nanoid()),
              Effect.bind("req", () => HttpServerRequest.HttpServerRequest),
              Effect.tap(({ id, req }) =>
                Effect.logError(`Error serving url '${req.url}', error id: ${id}`, e.message, e),
              ),
              Effect.andThen(({ id }) => new ServerError({ message: `Unexpected server error. Error ID: ${id}` })),
            ),
          ),
        ),
      );
  }),
);
