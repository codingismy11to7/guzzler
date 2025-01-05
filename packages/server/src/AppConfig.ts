import { Config, Effect, Layer, LogLevel, pipe, Schema } from "effect";

const prodMode = pipe(
  Schema.Config("NODE_ENV", Schema.NonEmptyTrimmedString),
  Config.withDefault("production"),
  Config.map(e => e !== "development"),
);

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

const DevAndProdConfig = {
  oauth: OAuthConfig,
  prodMode,
} as const;

const ProdConfig = {
  port: Schema.Config("PORT", Schema.NumberFromString.pipe(Schema.filter(i => i >= 0 || "port cannot be negative"))),
  logLevel: Config.logLevel("LOG_LEVEL"),
  webuiRoot: Schema.Config("WEBUI_DIR", Schema.NonEmptyTrimmedString),
  ...DevAndProdConfig,
} as const;

/**
 * Application's configuration, loaded from environment in production
 */
export class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  accessors: true,
  effect: Effect.all(ProdConfig, { concurrency: "unbounded" }),
}) {}

export const AppConfigLive = Layer.unwrapEffect(
  Effect.if(prodMode, {
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
              ...devAndProd,
            }),
          ),
        ),
      ),
  }),
);
