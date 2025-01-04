import { BrowserHttpClient } from "@effect/platform-browser";
import { format } from "date-fns/fp";
import { Layer, Logger, ManagedRuntime } from "effect";
import { TodosClient } from "./TodosClient.js";

const MainLive = TodosClient.Default.pipe(
  Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
  Layer.provide(
    Logger.replace(
      Logger.defaultLogger,
      Logger.prettyLogger({ colors: "auto", mode: "browser", formatDate: format("MM/dd/yyyy hh:mm:ss.SSS aa") }),
    ),
  ),
);
const MainLiveRuntime = ManagedRuntime.make(MainLive);
export const runP = MainLiveRuntime.runPromise;
export const runS = MainLiveRuntime.runSync;
export const runFork = MainLiveRuntime.runFork;
