import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, flow, Layer, pipe } from "effect";
import { createServer } from "node:http";
import { ApiLive } from "./ApiLive.js";
import { AppConfig } from "./AppConfig.js";

export const HttpLive = HttpApiBuilder.serve(
  flow(
    HttpMiddleware.logger,
    HttpMiddleware.cors(),
    HttpMiddleware.xForwardedHeaders,
    HttpMiddleware.make(app =>
      app.pipe(a => {
        const y = a;

        return y;
      }),
    ),
  ),
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
  Layer.provide(
    Layer.unwrapEffect(
      AppConfig.port.pipe(
        Effect.tap(port => Effect.logInfo(`Listening on http://localhost:${port} (and also 0.0.0.0)`)),
        Effect.andThen(port => NodeHttpServer.layer(createServer, { port })),
      ),
    ),
  ),
);
