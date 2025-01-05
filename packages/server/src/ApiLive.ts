import { Headers, HttpApi, HttpApiBuilder, HttpClientError } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect, Layer, Option, pipe } from "effect";
import { ParseError } from "effect/ParseResult";
import { AppConfig } from "./AppConfig.js";
import { AuthApiLive } from "./internal/api/impl/auth.js";
import { SessionApiLive } from "./internal/api/impl/session.js";
import { TodosApiLive } from "./internal/api/impl/todos.js";
import { UIDev, UILive } from "./internal/api/impl/ui.js";
import { AuthenticationMiddlewareLive } from "./internal/middleware/authentication.js";
import * as OAuth2 from "./OAuth2.js";
import { ExternalError, InvalidOptions } from "./OAuth2.js";
import { SessionStorage } from "./SessionStorage.js";
import { TodosRepository } from "./TodosRepository.js";

export const ApiLive: Layer.Layer<
  HttpApi.Api,
  ExternalError | InvalidOptions | HttpClientError.HttpClientError | ParseError,
  TodosRepository | AppConfig
> = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(TodosApiLive),
  Layer.provide(AuthApiLive),
  Layer.provide(SessionApiLive),
  Layer.provide(AuthenticationMiddlewareLive),
  Layer.provide(SessionStorage.Default),
  Layer.provide(
    OAuth2.make({
      scope: ["profile", "email"],
      callbackUri: req =>
        pipe(
          req.headers,
          Headers.get("host"),
          Option.getOrElse(() => "localhost:8080"),
          host => `http${host.startsWith("localhost") ? "" : "s"}://${host}`,
          pre => `${pre}/auth/google/callback`,
        ),
      callbackUriParams: { access_type: "offline" },
    }),
  ),
  Layer.provide(NodeHttpClient.layer),
  Layer.provide(
    Layer.unwrapEffect(
      pipe(
        AppConfig.prodMode,
        Effect.andThen(prodMode => (prodMode ? UILive : UIDev.pipe(Layer.provide(NodeHttpClient.layerUndici)))),
      ),
    ),
  ),
);
