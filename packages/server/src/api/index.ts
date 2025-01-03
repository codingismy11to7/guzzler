import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { Layer } from "effect";
import { TodosApiLive } from "./impl/todos.js";
import { UIDev, UILive } from "./impl/ui.js";

const prodMode = false as boolean;

export const ApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(TodosApiLive),
  Layer.provide(prodMode ? UILive : UIDev),
);
