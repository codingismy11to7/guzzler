import { Effect, Layer, ManagedRuntime } from "effect";
import { SessionClient } from "../../apiclients/SessionClient.js";
import { SignupClient } from "../../apiclients/SignupClient.js";
import { sharedAndLogging } from "./shared.js";

const PreLoginLive = Layer.mergeAll(
  SessionClient.Default,
  SignupClient.Default,
).pipe(sharedAndLogging);
const PreLoginLiveRuntime = ManagedRuntime.make(PreLoginLive);

const runSync = <A>(
  e: Effect.Effect<A, never, Layer.Layer.Success<typeof PreLoginLive>>,
) => PreLoginLiveRuntime.runSync(e);

export const PreLoginFunctions = {
  runP: <A>(
    e: Effect.Effect<A, never, Layer.Layer.Success<typeof PreLoginLive>>,
  ) => PreLoginLiveRuntime.runPromise(e),
  runSync,
  runFork: PreLoginLiveRuntime.runFork,
};
