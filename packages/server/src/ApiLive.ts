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
import { MongoChangeStreams } from "@guzzler/mongodb/MongoChangeStreams";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { RandomId } from "@guzzler/utils/RandomId";
import { Effect, Layer, Option, pipe } from "effect";
import { ParseError } from "effect/ParseResult";
import { AccountApiLive } from "./apis/AccountApiLive.js";
import { AuthApiLive } from "./apis/AuthApiLive.js";
import { AutosApiLive } from "./apis/AutosApiLive.js";
import { ImageApiLive } from "./apis/ImageApiLive.js";
import { PreferencesApiLive } from "./apis/PreferencesApiLive.js";
import { SessionApiLive } from "./apis/SessionApiLive.js";
import { SignupApiLive } from "./apis/SignupApiLive.js";
import { UIDev } from "./apis/UIDev.js";
import { UILive } from "./apis/UILive.js";
import { AppConfig, ProdMode } from "./AppConfig.js";
import { AutosStorage } from "./AutosStorage.js";
import { BackupRestore } from "./BackupRestore.js";
import { FileFetcher } from "./FileFetcher.js";
import { ACarFullBackup } from "./importers/ACarFullBackup.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import { XmlParser } from "./internal/xml/XmlParser.js";
import * as OAuth2 from "./OAuth2.js";
import { ExternalError, InvalidOptions } from "./OAuth2.js";
import { SessionStorage } from "./SessionStorage.js";
import { Users } from "./Users.js";
import { Zip } from "./Zip.js";
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
  | MongoChangeStreams
  | MongoTransactions
  | Path
  | ProdMode
  | RandomId
> = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(AccountApiLive),
  Layer.provide(AuthApiLive),
  Layer.provide(AutosApiLive),
  Layer.provide(ImageApiLive),
  Layer.provide(PreferencesApiLive),
  Layer.provide(SessionApiLive),
  Layer.provide(SignupApiLive),
  Layer.provide(ACarFullBackup.Default),
  Layer.provide(BackupRestore.Default),
  Layer.provide(AutosStorage.Default),
  Layer.provide(FileFetcher.Default),
  Layer.provide(Users.Default),
  Layer.provide(UILayer),
  Layer.provide(XmlParser.Default),
  Layer.provide(Zip.Default),
  Layer.provide(AuthLayers),
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
      callbackUriParams: { prompt: "select_account consent" },
    }),
  ),
  Layer.provide(NodeHttpClient.layerUndici),
);
