import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { flow, Layer } from "effect";
import { createServer } from "node:http";
import { ApiLive } from "./Api.js";
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
  Layer.provide(NodeHttpServer.layer(createServer, { port: 8080 })),
);

Layer.launch(HttpLive).pipe(NodeRuntime.runMain);
