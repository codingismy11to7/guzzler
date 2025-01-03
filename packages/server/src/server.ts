import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpClient, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { flow, Layer, Logger, LogLevel } from "effect";
import { createServer } from "node:http";
import { ApiLive } from "./api/index.js";
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
  Layer.provide(NodeHttpClient.layer),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 8080 })),
);

Layer.launch(HttpLive).pipe(Logger.withMinimumLogLevel(LogLevel.Debug), NodeRuntime.runMain);
