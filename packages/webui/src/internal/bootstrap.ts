import { BrowserHttpClient, BrowserSocket } from "@effect/platform-browser";
import { RandomId } from "@guzzlerapp/utils";
import { format } from "date-fns/fp";
import { Effect, Layer, Logger, LogLevel, ManagedRuntime } from "effect";
import { AccountClient } from "../apiclients/AccountClient.js";
import { AutosClient } from "../apiclients/AutosClient.js";
import { PreferencesClient } from "../apiclients/PreferencesClient.js";
import { SessionClient } from "../apiclients/SessionClient.js";
import { SignupClient } from "../apiclients/SignupClient.js";
import { AutosDataRepository } from "../data/AutosDataRepository.js";

const MainLive = Layer.mergeAll(
  AccountClient.Default,
  AutosDataRepository.Default.pipe(Layer.provideMerge(AutosClient.Default)),
  PreferencesClient.Default,
  SessionClient.Default,
  SignupClient.Default,
).pipe(
  Layer.provideMerge(RandomId.RandomId.Default),
  Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
  Layer.provide(BrowserSocket.layerWebSocketConstructor),
  Layer.provide(
    Logger.replace(
      Logger.defaultLogger,
      Logger.prettyLogger({
        colors: "auto",
        mode: "browser",
        formatDate: format("MM/dd/yyyy hh:mm:ss.SSS aa"),
      }),
    ),
  ),
  Layer.provide(
    Logger.minimumLogLevel(
      import.meta.env.DEV ? LogLevel.Debug : LogLevel.Info,
    ),
  ),
);
const MainLiveRuntime = ManagedRuntime.make(MainLive);
export const runP = <A>(
  e: Effect.Effect<A, never, Layer.Layer.Success<typeof MainLive>>,
) => MainLiveRuntime.runPromise(e);
export const runSync = <A>(
  e: Effect.Effect<A, never, Layer.Layer.Success<typeof MainLive>>,
) => MainLiveRuntime.runSync(e);
export const runFork = MainLiveRuntime.runFork;
export const randomId = (seedTime?: number) =>
  runSync(RandomId.RandomId.randomIdSync(seedTime));
