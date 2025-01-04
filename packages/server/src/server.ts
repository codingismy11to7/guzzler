import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, flow, Layer, Logger, pipe } from "effect";
import { createServer } from "node:http";
import { ApiLive } from "./api/index.js";
import { AppConfig, AppConfigLive } from "./AppConfig.js";
import { logServiceStarting, logVersion } from "./internal/util/logInfos.js";
import { TodosRepository } from "./TodosRepository.js";

/**
 * Server entrypoint
 */

const HttpLive = HttpApiBuilder.serve(flow(HttpMiddleware.logger, HttpMiddleware.cors())).pipe(
  HttpServer.withLogAddress,
  Layer.provide(HttpApiSwagger.layer({ path: "/swagger" })),
  Layer.provide(HttpApiBuilder.middlewareOpenApi({ path: "/swagger.json" })),
  Layer.provide(ApiLive),
  Layer.provide(TodosRepository.Default),
  Layer.provide(
    Layer.unwrapEffect(AppConfig.port.pipe(Effect.andThen(port => NodeHttpServer.layer(createServer, { port })))),
  ),
);

pipe(
  logServiceStarting,
  Effect.andThen(logVersion),
  Effect.andThen(() => {
    process.on("uncaughtException", e => Effect.runSync(Effect.logError("uncaught exception", e)));
    process.on("unhandledRejection", e => Effect.runSync(Effect.logError("unhandled rejection", e)));
  }),
  Effect.andThen(
    pipe(
      AppConfig.logLevel,
      Effect.andThen(logLevel => Logger.withMinimumLogLevel(Layer.launch(HttpLive), logLevel)),
    ),
  ),
  Effect.provide(AppConfigLive),
  NodeRuntime.runMain,
);
