import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { StartGoogleLogin } from "@guzzler/domain/apis/AuthApi";
import { AppApi } from "@guzzler/domain/AppApi";
import { SessionCookieName } from "@guzzler/domain/Authentication";
import { RedactedError } from "@guzzler/domain/Errors";
import {
  SessionId,
  UnknownUserSession,
  UserSession,
} from "@guzzler/domain/Session";
import { UserId } from "@guzzler/domain/User";
import { RandomId } from "@guzzler/utils/RandomId";
import { Effect, pipe, Redacted, Struct } from "effect";
import { AppConfig } from "../../../AppConfig.js";
import { OAuth2 } from "../../../OAuth2.js";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";
import { setSecureCookie } from "./setSecureCookie.js";

// not real server routes so must treat specially
export const NewUserRedirectUrl = "/signup";
export const LoginUrl = "/login";

export const AuthApiLive = HttpApiBuilder.group(AppApi, "auth", handlers =>
  Effect.gen(function* () {
    const { addSession } = yield* SessionStorage;
    const { getUser, updateUserInfo } = yield* Users;
    const { userinfoUrl } = yield* AppConfig.googleOAuth;
    const {
      startRedirectHandler,
      getAccessTokenFromAuthorizationCodeFlow,
      fetchUserInfo,
    } = yield* OAuth2;

    return handlers
      .handleRaw(StartGoogleLogin, () =>
        HttpServerRequest.pipe(
          Effect.andThen(req => startRedirectHandler(req)),
        ),
      )
      .handleRaw("oAuthCallback", () =>
        pipe(
          Effect.gen(function* () {
            const req = yield* HttpServerRequest;
            const { token, modifyReply } =
              yield* getAccessTokenFromAuthorizationCodeFlow(req);

            yield* Effect.logDebug("received accessToken");

            const ui = yield* fetchUserInfo(
              userinfoUrl,
              Redacted.value(token.access_token),
            );
            yield* Effect.logDebug("received userInfo");

            const session = yield* addSession(
              UnknownUserSession.make({
                id: pipe(
                  yield* RandomId.randomId(),
                  Redacted.make,
                  SessionId.make,
                ),
                token,
                oAuthUserInfo: ui,
              }),
            );

            const userOpt = yield* getUser(
              UserId.make(session.oAuthUserInfo.id),
            ).pipe(Effect.option);
            yield* pipe(
              Effect.gen(function* () {
                const user = yield* userOpt;

                yield* Effect.logDebug("fetched local user");

                yield* updateUserInfo(user.id, ui);
                yield* addSession(
                  UserSession.make({ ...Struct.omit(session, "_tag"), user }),
                );
              }),
              Effect.catchTag("NoSuchElementException", () => Effect.void),
            );

            yield* setSecureCookie(SessionCookieName, session.id);

            const baseResp = yield* HttpServerResponse.redirect("/", {
              status: 303,
            });

            return yield* Effect.reduce(modifyReply, baseResp, (acc, m) =>
              m(acc),
            );
          }),
          Effect.catchAll(cause => RedactedError.logged(cause.message, cause)),
        ),
      );
  }),
);
