import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { AppApi } from "@guzzler/domain/AppApi";
import { Effect, Layer, pipe } from "effect";
import { AppConfig } from "../AppConfig.js";
import { TodosApiLive } from "../internal/api/impl/todos.js";
import { UIDev, UILive } from "../internal/api/impl/ui.js";

export const ApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(TodosApiLive),
  Layer.provide(
    Layer.unwrapEffect(
      pipe(
        AppConfig.prodMode,
        Effect.andThen(prodMode => (prodMode ? UILive : UIDev.pipe(Layer.provide(NodeHttpClient.layer)))),
      ),
    ),
  ),
);
