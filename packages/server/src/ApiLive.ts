import { Headers, HttpApi, HttpApiBuilder, HttpClientError } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect, Layer, Option, pipe } from "effect";
import { ParseError } from "effect/ParseResult";
import { AppConfig, ProdMode } from "./AppConfig.js";
import { AccountApiLive } from "./internal/api/impl/AccountApiLive.js";
import { AuthApiLive } from "./internal/api/impl/AuthApiLive.js";
import { SessionApiLive } from "./internal/api/impl/SessionApiLive.js";
import { SignupApiLive } from "./internal/api/impl/SignupApiLive.js";
import { TodosApiLive } from "./internal/api/impl/TodosApiLive.js";
import { UIDev } from "./internal/api/impl/UIDev.js";
import { UILive } from "./internal/api/impl/UILive.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import * as OAuth2 from "./OAuth2.js";
import { ExternalError, InvalidOptions } from "./OAuth2.js";
import { SessionStorage } from "./SessionStorage.js";
import { TodosRepository } from "./TodosRepository.js";
import { Users } from "./Users.js";
import { AuthenticationMiddleware } from "./index.js";

const UILayer = Layer.unwrapEffect(
  pipe(
    ProdMode.isProdMode,
    Effect.andThen(prodMode => (prodMode ? UILive : UIDev.pipe(Layer.provide(NodeHttpClient.layerUndici)))),
  ),
);

const AuthLayers = Layer.suspend(() =>
  Layer.mergeAll(
    AuthenticationMiddleware.TryToLoadSession_DoNotUseLive,
    AuthenticationMiddleware.RequireNewUserSessionLive,
    AuthenticationMiddleware.RequireFullSessionLive,
    AuthenticationMiddleware.NewUserRedirectLive,
  ),
);

export const ApiLive: Layer.Layer<
  HttpApi.Api,
  ExternalError | InvalidOptions | HttpClientError.HttpClientError | ParseError,
  AppConfig | ProdMode | CollectionRegistry
> = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(AccountApiLive),
  Layer.provide(AuthApiLive),
  Layer.provide(SessionApiLive),
  Layer.provide(SignupApiLive),
  Layer.provide(TodosApiLive),
  Layer.provide(Users.Default),
  Layer.provide(UILayer),
  Layer.provide(AuthLayers),
  Layer.provide(SessionStorage.Default),
  Layer.provide(TodosRepository.Default),
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
);
