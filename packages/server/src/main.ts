import { NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, pipe } from "effect";
import { AppConfig, AppConfigLive } from "./AppConfig.js";
import { HttpLive } from "./HttpLive.js";
import {
  mongoLiveLayers,
  runMigrations,
} from "./internal/database/databaseInit.js";
import { logServiceStarting, logVersion } from "./internal/util/logInfos.js";

// hey, we were able to load all dependencies and start executing, that's something
if (process.argv.includes("--mostMinimalSmokeTest")) process.exit(0);

pipe(
  logServiceStarting,
  Effect.andThen(logVersion),
  Effect.andThen(() => {
    process.on("uncaughtException", e =>
      Effect.runSync(Effect.logError("uncaught exception", e)),
    );
    process.on("unhandledRejection", e =>
      Effect.runSync(Effect.logError("unhandled rejection", e)),
    );
  }),
  Effect.andThen(runMigrations),
  AppConfig.withMinimumLogLevel,
  Effect.andThen(AppConfig.withMinimumLogLevel(Layer.launch(HttpLive))),
  Effect.provide(mongoLiveLayers),
  Effect.provide(AppConfigLive),
  NodeRuntime.runMain,
);
