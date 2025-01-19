import type * as HttpClient from "@effect/platform/HttpClient";
import { BrowserHttpClient } from "@effect/platform-browser";
import { RandomId } from "@guzzler/utils";
import { format } from "date-fns/fp";
import { Effect, flow, Layer, Logger, ManagedRuntime } from "effect";

export const makeRunFunctions = <
  Layers extends Array<Layer.Layer<never, never, HttpClient.HttpClient>>,
>(
  ...layers: Layers
) => {
  // ok i've specified that the layers coming in can't have an E and can only
  // have an R of HttpClient, then i'm calling merge on them and providing
  // the HttpClient layer (which can't error) and replacing the logger (which
  // can't error)...so this type should be right? try to figure out later
  // @ts-expect-error
  const layer: Layer.Layer<
    | { [k in keyof Layers]: Layer.Layer.Success<Layers[k]> }[number]
    | RandomId.RandomId
  > = Layer.mergeAll(RandomId.RandomId.Default, ...layers).pipe(
    Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
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
  );

  const runtime = ManagedRuntime.make(layer);

  const runPromise = runtime.runPromise;
  const runP = <A>(
    e: Effect.Effect<A, never, Layer.Layer.Success<typeof layer>>,
  ) => runPromise(e);
  const runSync = runtime.runSync;
  const runFork = runtime.runFork;

  const randomId = flow(RandomId.RandomId.randomId, runSync);

  return { runPromise, runP, runSync, runFork, randomId };
};

export const { randomId } = makeRunFunctions();
