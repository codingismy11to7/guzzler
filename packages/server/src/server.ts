import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, flow, Layer, pipe } from "effect";
import { createServer } from "node:http";
import { ApiLive } from "./ApiLive.js";
import { AppConfig, AppConfigLive } from "./AppConfig.js";
import { mongoLiveLayers, runMigrations } from "./internal/database/databaseInit.js";
import { logServiceStarting, logVersion } from "./internal/util/logInfos.js";
import { TodosRepository } from "./TodosRepository.js";

if (process.argv.includes("--mostMinimalSmokeTest")) process.exit(0);

/**
 * Server entrypoint
 */

const HttpLive = HttpApiBuilder.serve(
  flow(HttpMiddleware.logger, HttpMiddleware.cors(), HttpMiddleware.xForwardedHeaders),
).pipe(
  layer =>
    pipe(
      AppConfig.serveSwaggerUiAt,
      Effect.andThen(path => Layer.provide(layer, HttpApiSwagger.layer({ path }))),
      Effect.catchTag("NoSuchElementException", () => Effect.succeed(layer)),
      Layer.unwrapEffect,
    ),
  layer =>
    pipe(
      AppConfig.serveOpenapiAt,
      Effect.andThen(path => Layer.provide(layer, HttpApiBuilder.middlewareOpenApi({ path }))),
      Effect.catchTag("NoSuchElementException", () => Effect.succeed(layer)),
      Layer.unwrapEffect,
    ),
  Layer.provide(ApiLive),
  Layer.provide(TodosRepository.Default),
  Layer.provide(
    Layer.unwrapEffect(
      AppConfig.port.pipe(
        Effect.tap(port => Effect.logInfo(`Listening on http://localhost:${port} (and also 0.0.0.0)`)),
        Effect.andThen(port => NodeHttpServer.layer(createServer, { port })),
      ),
    ),
  ),
);

pipe(
  logServiceStarting,
  Effect.andThen(logVersion),
  Effect.andThen(() => {
    process.on("uncaughtException", e => Effect.runSync(Effect.logError("uncaught exception", e)));
    process.on("unhandledRejection", e => Effect.runSync(Effect.logError("unhandled rejection", e)));
  }),
  Effect.andThen(runMigrations),
  AppConfig.withMinimumLogLevel,
  Effect.andThen(AppConfig.withMinimumLogLevel(Layer.launch(HttpLive))),
  Effect.provide(mongoLiveLayers),
  Effect.provide(AppConfigLive),
  NodeRuntime.runMain,
);
