import { Headers, HttpApi, HttpApiBuilder, HttpClientError } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect, Layer, Option, pipe } from "effect";
import { ParseError } from "effect/ParseResult";
import { AppConfig, ProdMode } from "./AppConfig.js";
import { AuthApiLive } from "./internal/api/impl/auth.js";
import { SessionApiLive } from "./internal/api/impl/SessionApiLive.js";
import { TodosApiLive } from "./internal/api/impl/TodosApiLive.js";
import { UIDev, UILive } from "./internal/api/impl/ui.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import { AuthenticationMiddlewareLive } from "./internal/middleware/AuthenticationMiddlewareLive.js";
import * as OAuth2 from "./OAuth2.js";
import { ExternalError, InvalidOptions } from "./OAuth2.js";
import { SessionStorage } from "./SessionStorage.js";
import { TodosRepository } from "./TodosRepository.js";

export const ApiLive: Layer.Layer<
  HttpApi.Api,
  ExternalError | InvalidOptions | HttpClientError.HttpClientError | ParseError,
  TodosRepository | AppConfig | ProdMode | CollectionRegistry
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
        ProdMode.isProdMode,
        Effect.andThen(prodMode => (prodMode ? UILive : UIDev.pipe(Layer.provide(NodeHttpClient.layerUndici)))),
      ),
    ),
  ),
);
