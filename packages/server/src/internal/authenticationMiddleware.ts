import { HttpApp } from "@effect/platform";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { redirect } from "@effect/platform/HttpServerResponse";
import {
  AuthenticationMiddleware,
  CurrentSession,
  NewUserSetupRedirectMiddleware,
  OptionalAuthMiddleware,
  Unauthenticated,
} from "@guzzler/domain/Authentication";
import { SessionId } from "@guzzler/domain/Session";
import { Effect, HashSet, Layer, Option } from "effect";
import { ProdMode } from "../AppConfig.js";
import { SessionStorage } from "../SessionStorage.js";
import { NewUserRedirectUrl } from "./api/impl/AuthApiLive.js";

export const Live = Layer.effect(
  AuthenticationMiddleware,
  Effect.gen(function* () {
    const { getSession } = yield* SessionStorage;

    return {
      SessionCookie: sessId =>
        getSession(SessionId.make(sessId)).pipe(Effect.catchTag("SessionNotFound", () => new Unauthenticated())),
    };
  }),
);

export const OptionalLive = Layer.effect(OptionalAuthMiddleware, AuthenticationMiddleware);

export const NewUserRedirectLive = Layer.effect(
  NewUserSetupRedirectMiddleware,
  Effect.gen(function* () {
    yield* Effect.log("creating NewUserSetupRedirect middleware");
    const { isProdMode } = yield* ProdMode;

    const ignoreList = HashSet.make(
      NewUserRedirectUrl,
      ...(isProdMode
        ? []
        : [
            "/@fs/",
            "/@react-refresh",
            "/@vite/client",
            "/node_modules/.vite",
            "/node_modules/vite",
            "/src/",
            "/vite.svg",
          ]),
    );

    return Effect.gen(function* () {
      const req = yield* HttpServerRequest;
      const session = yield* Effect.serviceOption(CurrentSession);

      Effect.logDebug("checking session").pipe(Effect.annotateLogs({ session, url: req.url }));

      // if we have a non-user session (and we're not already there), we need to redirect (if we're not going to an
      // ignored url)
      if (
        Option.getOrUndefined(session)?._tag === "UnknownUserSession" &&
        HashSet.every(ignoreList, pre => !req.url.startsWith(pre))
      ) {
        yield* Effect.logWarning("Redirecting to new user setup");
        yield* HttpApp.appendPreResponseHandler(() => redirect(NewUserRedirectUrl, { status: 303 }));
      } else if (Option.getOrUndefined(session)?._tag === "UserSession" && req.url === NewUserRedirectUrl) {
        yield* Effect.log("At new user setup but we have a user, redirecting to home");
        yield* HttpApp.appendPreResponseHandler(() => Effect.succeed(redirect("/", { status: 303 })));
      }
    }).pipe(Effect.annotateLogs({ layer: "NewUserRedirectLive" }));
  }),
);
