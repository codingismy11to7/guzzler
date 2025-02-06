import {
  HttpApiMiddleware,
  HttpApp,
  HttpServerRequest,
} from "@effect/platform";
import { Forbidden, Unauthorized } from "@effect/platform/HttpApiError";
import { redirect } from "@effect/platform/HttpServerResponse";
import {
  AuthRedirectMiddleware,
  RawCurrentSession_DoNotUse,
  RawSessionAccess_DoNotUse,
  RequireFullSession,
  RequireNewUserSession,
} from "@guzzlerapp/domain/Authentication";
import { Session, SessionId } from "@guzzlerapp/domain/Session";
import { Effect, HashSet, Layer, Option, pipe } from "effect";
import { Redacted } from "effect/Redacted";
import { LoginUrl, NewUserRedirectUrl } from "../apis/AuthApiLive.js";
import { ProdMode } from "../AppConfig.js";
import { SessionStorage } from "../SessionStorage.js";

const fetchSession =
  ({ getSession }: typeof SessionStorage.Service) =>
  (sessId: Redacted): Effect.Effect<Session, Unauthorized> =>
    pipe(
      getSession(SessionId.make(sessId)),
      Effect.catchTag("DocumentNotFound", () => new Unauthorized()),
    );

export const TryToLoadSession_DoNotUseLive = Layer.effect(
  RawSessionAccess_DoNotUse,
  Effect.gen(function* () {
    const ss = yield* SessionStorage;

    return {
      SessionCookie: fetchSession(ss),
    };
  }),
);

const filterLoadSession =
  <T>(
    ss: typeof SessionStorage.Service,
    f: (session: Session) => Effect.Effect<T, Forbidden>,
  ) =>
  (sessId: Redacted): Effect.Effect<T, Unauthorized | Forbidden> =>
    Effect.gen(function* () {
      const sess = yield* fetchSession(ss)(sessId);

      return yield* f(sess);
    });

export const RequireFullSessionLive = Layer.effect(
  RequireFullSession,
  Effect.gen(function* () {
    const ss = yield* SessionStorage;

    return {
      SessionCookie: filterLoadSession(ss, s =>
        s._tag === "UnknownUserSession"
          ? new Forbidden()
          : Effect.succeed(s).pipe(
              Effect.tap(s =>
                Effect.logInfo(`authenticated user ${s.user.username}`),
              ),
            ),
      ),
    };
  }),
);

export const RequireNewUserSessionLive = Layer.effect(
  RequireNewUserSession,
  Effect.gen(function* () {
    const ss = yield* SessionStorage;

    return {
      SessionCookie: filterLoadSession(ss, s =>
        s._tag === "UserSession" ? new Forbidden() : Effect.succeed(s),
      ),
    };
  }),
);

const makeRedirectMiddleware = (
  ignoreList: HashSet.HashSet<string>,
): HttpApiMiddleware.HttpApiMiddleware<void, never> =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest;
    const session = yield* Effect.serviceOption(RawCurrentSession_DoNotUse);

    yield* Effect.logTrace("checking session").pipe(
      Effect.annotateLogs({ url: req.url }),
    );

    // if we have a non-user session (and we're not already there), we need to
    // redirect (if we're not going to an ignored url)
    if (
      Option.getOrUndefined(session)?._tag === "UnknownUserSession" &&
      HashSet.every(ignoreList, pre => !req.url.startsWith(pre))
    ) {
      yield* Effect.logInfo("Redirecting to new user setup");
      yield* HttpApp.appendPreResponseHandler(() =>
        redirect(NewUserRedirectUrl, { status: 303 }),
      );
    } else if (
      Option.getOrUndefined(session)?._tag === "UserSession" &&
      req.url === NewUserRedirectUrl
    ) {
      yield* Effect.log(
        "At new user setup but we have a user, redirecting to home",
      );
      yield* HttpApp.appendPreResponseHandler(() =>
        Effect.succeed(redirect("/", { status: 303 })),
      );
    }
  }).pipe(Effect.annotateLogs({ layer: "AuthRedirectLive" }));

export const AuthRedirectLive = Layer.effect(
  AuthRedirectMiddleware,
  Effect.gen(function* () {
    yield* Effect.log("creating AuthRedirectLive middleware");
    const { isProdMode } = yield* ProdMode;

    const ignoreList = HashSet.make(
      "/",
      "/index.html",
      NewUserRedirectUrl,
      LoginUrl,
      ...(isProdMode
        ? []
        : [
            "/@fs/",
            "/@react-refresh",
            "/@vite/client",
            "/locales/",
            "/node_modules/.vite",
            "/node_modules/vite",
            "/src/",
            "/vite.svg",
          ]),
    );

    return makeRedirectMiddleware(ignoreList);
  }),
);
