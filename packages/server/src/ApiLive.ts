import {
  Headers,
  HttpApi,
  HttpApiBuilder,
  HttpClient,
  HttpClientError,
} from "@effect/platform";
import { FileSystem } from "@effect/platform/FileSystem";
import { ApiGroup } from "@effect/platform/HttpApiGroup";
import { HttpPlatform } from "@effect/platform/HttpPlatform";
import { Path } from "@effect/platform/Path";
import { NodeHttpClient } from "@effect/platform-node";
import { AppApi } from "@guzzler/domain/AppApi";
import {
  AuthRedirectMiddleware,
  RawSessionAccess_DoNotUse,
} from "@guzzler/domain/Authentication";
import { GridFS } from "@guzzler/mongodb/GridFS";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { RandomId } from "@guzzler/utils/RandomId";
import { Effect, Layer, Option, pipe } from "effect";
import { ParseError } from "effect/ParseResult";
import { AppConfig, ProdMode } from "./AppConfig.js";
import { AutosStorage } from "./AutosStorage.js";
import { ACarFullBackup } from "./importers/ACarFullBackup.js";
import { AccountApiLive } from "./internal/api/impl/AccountApiLive.js";
import { AuthApiLive } from "./internal/api/impl/AuthApiLive.js";
import { AutosApiLive } from "./internal/api/impl/AutosApiLive.js";
import { SessionApiLive } from "./internal/api/impl/SessionApiLive.js";
import { SignupApiLive } from "./internal/api/impl/SignupApiLive.js";
import { TodosApiLive } from "./internal/api/impl/TodosApiLive.js";
import { UIDev } from "./internal/api/impl/UIDev.js";
import { UILive } from "./internal/api/impl/UILive.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import { Zip } from "./internal/util/zip.js";
import { XmlParser } from "./internal/xml/XmlParser.js";
import * as OAuth2 from "./OAuth2.js";
import { ExternalError, InvalidOptions } from "./OAuth2.js";
import { SessionStorage } from "./SessionStorage.js";
import { TodosRepository } from "./TodosRepository.js";
import { Users } from "./Users.js";
import { AuthenticationMiddleware } from "./index.js";

const UILayer = Layer.unwrapEffect(
  pipe(
    ProdMode.isProdMode,
    Effect.andThen(
      (
        prodMode,
      ): Layer.Layer<
        ApiGroup<"Guzzler", "ui">,
        never,
        | AppConfig
        | AuthRedirectMiddleware
        | RawSessionAccess_DoNotUse
        | HttpClient.HttpClient
      > => (prodMode ? UILive : UIDev),
    ),
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
  | AppConfig
  | CollectionRegistry
  | FileSystem
  | GridFS
  | HttpPlatform
  | MongoTransactions
  | Path
  | ProdMode
  | RandomId
> = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(AccountApiLive),
  Layer.provide(AuthApiLive),
  Layer.provide(AutosApiLive),
  Layer.provide(SessionApiLive),
  Layer.provide(SignupApiLive),
  Layer.provide(TodosApiLive),
  Layer.provide(ACarFullBackup.Default),
  Layer.provide(AutosStorage.Default),
  Layer.provide(Users.Default),
  Layer.provide(UILayer),
  Layer.provide(XmlParser.Default),
  Layer.provide(Zip.Default),
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
      callbackUriParams: { prompt: "select_account consent" },
    }),
  ),
  Layer.provide(NodeHttpClient.layerUndici),
);
