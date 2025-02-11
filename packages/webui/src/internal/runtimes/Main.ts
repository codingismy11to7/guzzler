import { RandomId } from "@guzzlerapp/utils";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AccountClient } from "../../apiclients/AccountClient.js";
import { AutosClient } from "../../apiclients/AutosClient.js";
import { PreferencesClient } from "../../apiclients/PreferencesClient.js";
import { SessionClient } from "../../apiclients/SessionClient.js";
import { SignupClient } from "../../apiclients/SignupClient.js";
import { AutosDataRepository } from "../../data/AutosDataRepository.js";
import { sharedAndLogging } from "./shared.js";

const MainLive = Layer.mergeAll(
  AccountClient.Default,
  AutosDataRepository.Default.pipe(Layer.provideMerge(AutosClient.Default)),
  PreferencesClient.Default,
  SessionClient.Default,
  SignupClient.Default,
).pipe(sharedAndLogging);
const MainLiveRuntime = ManagedRuntime.make(MainLive);
export const runP = <A>(
  e: Effect.Effect<A, never, Layer.Layer.Success<typeof MainLive>>,
) => MainLiveRuntime.runPromise(e);
export const runSync = <A>(
  e: Effect.Effect<A, never, Layer.Layer.Success<typeof MainLive>>,
) => MainLiveRuntime.runSync(e);
export const runFork = MainLiveRuntime.runFork;
const randId = await runP(RandomId.RandomId);
export const randomId = (seedTime?: number) => randId.randomIdSync(seedTime);
