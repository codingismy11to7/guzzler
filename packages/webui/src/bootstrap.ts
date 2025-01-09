import { BrowserHttpClient } from "@effect/platform-browser";
import { format } from "date-fns/fp";
import { Effect, Layer, Logger, ManagedRuntime } from "effect";
import { SessionClient } from "./SessionClient.js";
import { TodosClient } from "./TodosClient.js";

const MainLive = Layer.merge(SessionClient.Default, TodosClient.Default).pipe(
  Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
  Layer.provide(
    Logger.replace(
      Logger.defaultLogger,
      Logger.prettyLogger({ colors: "auto", mode: "browser", formatDate: format("MM/dd/yyyy hh:mm:ss.SSS aa") }),
    ),
  ),
);
const MainLiveRuntime = ManagedRuntime.make(MainLive);
export const runPromise = MainLiveRuntime.runPromise;
export const runP = <A>(e: Effect.Effect<A, never, Layer.Layer.Success<typeof MainLive>>) =>
  MainLiveRuntime.runPromise(e);
export const runSync = MainLiveRuntime.runSync;
export const runFork = MainLiveRuntime.runFork;
