import { HttpServerRequest } from "@effect/platform";
import { AuthenticationMiddleware, Unauthenticated } from "@guzzler/domain/Authentication";
import { SessionId } from "@guzzler/domain/Session";
import { Effect, Layer, Option, pipe } from "effect";
import { SessionStorage } from "../../SessionStorage.js";
import { SessionCookieName } from "../api/impl/auth.js";

export const AuthenticationMiddlewareLive = Layer.effect(
  AuthenticationMiddleware,
  pipe(
    Effect.gen(function* () {
      const { getSession } = yield* SessionStorage;

      return Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const sessId = yield* pipe(
          request.cookies[SessionCookieName],
          Option.fromNullable,
          Effect.andThen(SessionId.make),
          Effect.catchTag("NoSuchElementException", () => Effect.fail(new Unauthenticated())),
        );

        return yield* getSession(sessId).pipe(Effect.catchTag("SessionNotFound", () => new Unauthenticated()));
      });
    }),
  ),
);
