import {
  HttpApiBuilder,
  HttpApiScalar,
  HttpApiSwagger,
  HttpMiddleware,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, flow, Layer, pipe } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { createServer } from "node:http";
import { ApiLive } from "./ApiLive.js";
import { AppConfig } from "./AppConfig.js";

const ifConfiguredPath =
  <ER, LR>(
    setting: Effect.Effect<`/${string}`, NoSuchElementException, ER>,
    f: (path: `/${string}`) => Layer.Layer<never, never, LR>,
  ) =>
  <A2, E2, R2>(layer: Layer.Layer<A2, E2, R2>) =>
    pipe(
      setting,
      Effect.andThen(path => Layer.provide(layer, f(path))),
      Effect.catchTag("NoSuchElementException", () => Effect.succeed(layer)),
      Layer.unwrapEffect,
    );

export const HttpLive = HttpApiBuilder.serve(
  flow(
    HttpMiddleware.logger,
    HttpMiddleware.cors(),
    HttpMiddleware.xForwardedHeaders,
  ),
).pipe(
  ifConfiguredPath(AppConfig.serveSwaggerUiAt, path =>
    HttpApiSwagger.layer({ path }),
  ),
  ifConfiguredPath(AppConfig.serveOpenapiAt, path =>
    HttpApiBuilder.middlewareOpenApi({ path }),
  ),
  ifConfiguredPath(AppConfig.serveScalarUiAt, path =>
    HttpApiScalar.layer({ path }),
  ),
  Layer.provide(ApiLive),
  Layer.provide(
    Layer.unwrapEffect(
      AppConfig.port.pipe(
        Effect.tap(port =>
          Effect.logInfo(
            `Listening on http://localhost:${port} (and also 0.0.0.0)`,
          ),
        ),
        Effect.andThen(port => NodeHttpServer.layer(createServer, { port })),
      ),
    ),
  ),
);
