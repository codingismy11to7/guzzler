import PkgJson from "@npmcli/package-json";
import { configDotenv } from "dotenv";
import { Config, Effect, Layer, Logger, Option, pipe, Schema } from "effect";
import { readFileSync } from "fs";

const prodModeConf = pipe(
  Schema.Config("NODE_ENV", Schema.NonEmptyTrimmedString),
  Config.withDefault("production"),
  Config.map(e => e !== "development"),
);

const { error } = configDotenv();
if (!Effect.runSync(prodModeConf) && error) throw error;

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

const redacted = (name: string) =>
  pipe(
    Config.string(`${name}_FILE`).pipe(
      Config.option,
      Config.mapAttempt(Option.getOrThrow),
      Config.map(fName =>
        // configs are synchronous, so have to go to native node
        readFileSync(fName, { encoding: "utf8" }).trim(),
      ),
    ),
    Config.orElse(() => Config.string(name)),
    c => Config.redacted(c),
  );

const OAuthConfig = Config.all({
  clientId: redacted("OAUTH_CLIENT_ID"),
  clientSecret: redacted("OAUTH_CLIENT_SECRET"),
  userinfoUrl: Config.url("OAUTH_USERINFO_URL").pipe(
    Config.withDefault("https://www.googleapis.com/oauth2/v1/userinfo"),
  ),
});

const MongoConfig = Config.all({
  url: Config.string("MONGO_URL"),
  dbName: Config.string("MONGO_DATABASE"),
  username: redacted("MONGO_USERNAME"),
  password: redacted("MONGO_PASSWORD"),
});

const ConfigSchema = {
  port: Schema.Config(
    "PORT",
    Schema.NumberFromString.pipe(
      Schema.filter(i => i >= 0 || "port cannot be negative"),
    ),
  ),
  logLevel: Config.logLevel("LOG_LEVEL"),
  serveOpenapiAt: Config.option(
    Schema.Config(
      "SERVE_OPENAPI_AT",
      Schema.TemplateLiteral("/", Schema.String),
    ),
  ),
  serveScalarUiAt: Config.option(
    Schema.Config(
      "SERVE_SCALAR_UI_AT",
      Schema.TemplateLiteral("/", Schema.String),
    ),
  ),
  serveSwaggerUiAt: Config.option(
    Schema.Config(
      "SERVE_SWAGGER_UI_AT",
      Schema.TemplateLiteral("/", Schema.String),
    ),
  ),
  webuiRoot: Schema.Config("WEBUI_DIR", Schema.NonEmptyTrimmedString).pipe(c =>
    Effect.runSync(prodModeConf) ? c : Config.withDefault(c, ""),
  ),
  googleOAuth: OAuthConfig,
  mongo: MongoConfig,
} as const;

/**
 * Application's configuration, loaded from environment in production
 */
export class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  accessors: true,
  effect: Effect.all(ConfigSchema, { concurrency: "unbounded" }),
}) {
  static readonly withMinimumLogLevel = <A, E, R>(e: Effect.Effect<A, E, R>) =>
    pipe(
      AppConfig,
      Effect.andThen(conf => Logger.withMinimumLogLevel(e, conf.logLevel)),
    );
}

export const AppConfigLive = Layer.effect(
  AppConfig,
  pipe(
    Effect.all(ConfigSchema),
    Effect.andThen(conf => AppConfig.make(conf)),
  ),
).pipe(
  Layer.provideMerge(ProdMode.Default),
  Layer.provideMerge(ServerInfo.Default),
);
