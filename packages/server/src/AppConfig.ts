import PkgJson from "@npmcli/package-json";
import { Config, Effect, Layer, Logger, LogLevel, pipe, Redacted, Schema } from "effect";

const prodModeConf = pipe(
  Schema.Config("NODE_ENV", Schema.NonEmptyTrimmedString),
  Config.withDefault("production"),
  Config.map(e => e !== "development"),
);

export class ProdMode extends Effect.Service<ProdMode>()("ProdMode", {
  accessors: true,
  effect: pipe(
    prodModeConf,
    Effect.andThen(isProdMode => ({ isProdMode, isDevMode: !isProdMode })),
  ),
}) {}

export class ServerInfo extends Effect.Service<ServerInfo>()("ServerInfo", {
  accessors: true,
  effect: pipe(
    Effect.promise(() => PkgJson.load(".", { create: false })),
    Effect.andThen(pkgJson => ({ version: pkgJson.content.version })),
  ),
}) {}

const OAuthConfig = Config.all({
  clientId: Config.redacted("OAUTH_CLIENT_ID"),
  clientSecret: Config.redacted("OAUTH_CLIENT_SECRET"),
  tokenExpirationWindow: Config.duration("OAUTH_TOKEN_EXPIRATION_WINDOW").pipe(
    Config.withDescription("Try to refresh the token this much time before we think it's actually going to expire."),
    Config.withDefault("30 seconds"),
  ),
  userinfoUrl: Config.url("OAUTH_USERINFO_URL").pipe(
    Config.withDefault("https://www.googleapis.com/oauth2/v1/userinfo"),
  ),
});

const MongoConfig = Config.all({
  url: Config.string("MONGO_URL"),
  dbName: Config.string("MONGO_DATABASE"),
  username: Config.redacted("MONGO_USERNAME"),
  password: Config.redacted("MONGO_PASSWORD"),
});

const DevAndProdConfig = {
  googleOAuth: OAuthConfig,
} as const;

const ProdConfig = {
  port: Schema.Config("PORT", Schema.NumberFromString.pipe(Schema.filter(i => i >= 0 || "port cannot be negative"))),
  logLevel: Config.logLevel("LOG_LEVEL"),
  webuiRoot: Schema.Config("WEBUI_DIR", Schema.NonEmptyTrimmedString),
  mongo: MongoConfig,
  ...DevAndProdConfig,
} as const;

/**
 * Application's configuration, loaded from environment in production
 */
export class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  accessors: true,
  effect: Effect.all(ProdConfig, { concurrency: "unbounded" }),
}) {
  static readonly withMinimumLogLevel = <A, E, R>(e: Effect.Effect<A, E, R>) =>
    pipe(
      AppConfig,
      Effect.andThen(conf => Logger.withMinimumLogLevel(e, conf.logLevel)),
    );
}

export const AppConfigLive = Layer.unwrapEffect(
  Effect.if(ProdMode.isProdMode, {
    onTrue: () => Effect.succeed(AppConfig.Default),
    onFalse: () =>
      pipe(
        Effect.all(DevAndProdConfig),
        Effect.andThen(devAndProd =>
          Layer.sync(AppConfig, () =>
            AppConfig.make({
              port: 8080,
              logLevel: LogLevel.Debug,
              webuiRoot: "",
              mongo: {
                url: "mongodb://localhost",
                dbName: "guzzler",
                username: Redacted.make("guzzler"),
                password: Redacted.make("Abc12345"),
              },
              ...devAndProd,
            }),
          ),
        ),
      ),
  }),
).pipe(Layer.provideMerge(ProdMode.Default), Layer.provideMerge(ServerInfo.Default));
