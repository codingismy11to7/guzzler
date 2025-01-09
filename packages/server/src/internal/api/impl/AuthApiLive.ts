import { Cookies, HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { AppApi, RedactedError } from "@guzzler/domain/AppApi";
import { SessionCookieName } from "@guzzler/domain/Authentication";
import { SessionId, UnknownUserSession, UserSession } from "@guzzler/domain/Session";
import { UserId } from "@guzzler/domain/User";
import { Effect, Either, pipe, Redacted, Struct } from "effect";
import { nanoid } from "nanoid";
import { AppConfig } from "../../../AppConfig.js";
import { OAuth2 } from "../../../OAuth2.js";
import { SessionStorage } from "../../../SessionStorage.js";
import { Users } from "../../../Users.js";
import { setSecureCookie } from "./setSecureCookie.js";

export const NewUserRedirectUrl = "/newUser";
const PostLoginRedirectCookieName = "guzzler-post-login-url";
export const DefaultCookieOpts = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: true,
} as const;
export const removePostLoginCookie = pipe(
  Cookies.makeCookie(PostLoginRedirectCookieName, "", { ...DefaultCookieOpts, maxAge: 0 }),
  Either.andThen(newCookie => Cookies.setCookie(Cookies.empty, newCookie)),
  Either.getOrElse(() => Cookies.empty),
);
export const postLoginUrl = (req: HttpServerRequest) => req.cookies[PostLoginRedirectCookieName] ?? "/";

export const AuthApiLive = HttpApiBuilder.group(AppApi, "auth", handlers =>
  Effect.gen(function* () {
    const { addSession } = yield* SessionStorage;
    const { getUser, updateUserInfo } = yield* Users;
    const { userinfoUrl } = yield* AppConfig.googleOAuth;
    const { startRedirectHandler, getAccessTokenFromAuthorizationCodeFlow, fetchUserInfo } = yield* OAuth2;

    return handlers
      .handleRaw("startRedirect", () =>
        HttpServerRequest.pipe(
          Effect.andThen(req =>
            startRedirectHandler(req, {
              cookies: pipe(
                // TODO https://github.com/codingismy11to7/guzzler/issues/65
                Cookies.makeCookie(
                  PostLoginRedirectCookieName,
                  (req.headers.referer as string | undefined) ?? "/",
                  DefaultCookieOpts,
                ),
                Either.andThen(newCookie => Cookies.setCookie(Cookies.empty, newCookie)),
                Either.getOrElse(() => Cookies.empty),
              ),
            }),
          ),
        ),
      )
      .handleRaw("oAuthCallback", () =>
        pipe(
          Effect.gen(function* () {
            const req = yield* HttpServerRequest;
            const { token, modifyReply } = yield* getAccessTokenFromAuthorizationCodeFlow(req);

            yield* Effect.logDebug("received accessToken");

            const ui = yield* fetchUserInfo(userinfoUrl, Redacted.value(token.access_token));
            yield* Effect.logDebug("received userInfo");

            const session = yield* addSession(
              UnknownUserSession.make({ id: pipe(nanoid(), Redacted.make, SessionId.make), token, oAuthUserInfo: ui }),
            );

            const userOpt = yield* getUser(UserId.make(`google/${session.oAuthUserInfo.id}`)).pipe(Effect.option);
            yield* pipe(
              Effect.gen(function* () {
                const user = yield* userOpt;
                yield* updateUserInfo(user.id, ui);
                yield* addSession(UserSession.make({ ...Struct.omit(session, "_tag"), user }));
              }),
              Effect.catchTag("NoSuchElementException", () => Effect.void),
            );

            yield* setSecureCookie(SessionCookieName, session.id);

            const baseResp = yield* HttpServerResponse.redirect(postLoginUrl(req), {
              status: 303,
              cookies: removePostLoginCookie,
            });

            return yield* Effect.reduce(modifyReply, baseResp, (acc, m) => m(acc));
          }),
          Effect.catchAll(cause =>
            Effect.gen(function* () {
              const id = nanoid();

              yield* Effect.logError(cause.message, cause).pipe(Effect.annotateLogs({ id }));

              return yield* new RedactedError({ id });
            }),
          ),
        ),
      );
  }),
);
