import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { AppApi, ServerError } from "@guzzler/domain/AppApi";
import { UnknownUserSession, UserSession } from "@guzzler/domain/Session";
import { UserId } from "@guzzler/domain/User";
import { Effect, Option, pipe, Redacted, Struct } from "effect";
import { nanoid } from "nanoid";
import { AppConfig, ProdMode } from "../../../AppConfig.js";
import { OAuth2 } from "../../../OAuth2.js";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";

export const SessionCookieName = "guzzler-session-id";

export const AuthApiLive = HttpApiBuilder.group(AppApi, "auth", handlers =>
  Effect.gen(function* () {
    const { addSession } = yield* SessionStorage;
    const { getUser, updateUserInfo } = yield* Users;
    const { userinfoUrl } = yield* AppConfig.googleOAuth;
    const { isProdMode } = yield* ProdMode;
    const { startRedirectHandler, getAccessTokenFromAuthorizationCodeFlow, fetchUserInfo } = yield* OAuth2;

    return handlers
      .handleRaw("startRedirect", () => HttpServerRequest.pipe(Effect.andThen(startRedirectHandler)))
      .handleRaw("oAuthCallback", () =>
        pipe(
          Effect.gen(function* () {
            const req = yield* HttpServerRequest;
            const { token, modifyReply } = yield* getAccessTokenFromAuthorizationCodeFlow(req);

            yield* Effect.logDebug("received accessToken");

            const ui = yield* fetchUserInfo(userinfoUrl, Redacted.value(token.access_token));
            yield* Effect.logDebug("received userInfo");

            const session = yield* addSession(UnknownUserSession.make({ token, oAuthUserInfo: ui }));

            const userOpt = yield* getUser(UserId.make(`google/${session.oAuthUserInfo.id}`)).pipe(Effect.option);
            yield* pipe(
              Effect.gen(function* () {
                const user = yield* userOpt;
                yield* updateUserInfo(user.id, ui);
                yield* addSession(UserSession.make({ ...Struct.omit(session, "_tag"), user }));
              }),
              Effect.catchTag("NoSuchElementException", () => Effect.void),
            );

            return yield* Effect.reduce(
              [
                ...modifyReply,
                HttpServerResponse.setCookie(SessionCookieName, session.id, {
                  httpOnly: true,
                  secure: isProdMode,
                  maxAge: "30 days",
                  sameSite: "lax",
                  path: "/",
                }),
              ],
              HttpServerResponse.redirect(Option.isSome(userOpt) ? "/" : "/newUser"),
              (acc, m) => m(acc),
            );
          }),
          Effect.catchAll(e =>
            Effect.gen(function* () {
              const id = nanoid();
              const req = yield* HttpServerRequest;

              yield* Effect.logError(`Error serving url '${req.url}', error id: ${id}`, e.message, e);

              return yield* new ServerError({ message: `Unexpected server error. Error ID: ${id}` });
            }),
          ),
        ),
      );
  }),
);
