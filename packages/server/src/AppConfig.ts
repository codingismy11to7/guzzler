import { Config, Effect, Layer, LogLevel, pipe, Schema } from "effect";

const prodMode = pipe(
  Schema.Config("NODE_ENV", Schema.NonEmptyTrimmedString),
  Config.withDefault("production"),
  Config.map(e => e !== "development"),
);

/**
 * Application's configuration, loaded from environment in production
 */
export class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  accessors: true,
  effect: Effect.all(
    {
      port: Schema.Config(
        "PORT",
        Schema.NumberFromString.pipe(Schema.filter(i => i >= 0 || "port cannot be negative")),
      ),
      prodMode,
      logLevel: Config.logLevel("LOG_LEVEL"),
      webuiRoot: Schema.Config("WEBUI_DIR", Schema.NonEmptyTrimmedString),
    },
    { concurrency: "unbounded" },
  ),
}) {}

export const AppConfigLive = Layer.unwrapEffect(
  Effect.if(prodMode, {
    onTrue: () => Effect.succeed(AppConfig.Default),
    onFalse: () =>
      Effect.succeed(
        Layer.sync(AppConfig, () =>
          AppConfig.make({ port: 8080, prodMode: false, logLevel: LogLevel.Debug, webuiRoot: "" }),
        ),
      ),
  }),
);
