import { Socket } from "@effect/platform";
import { AutosModel } from "@guzzlerapp/domain";
import { Effect, pipe, Ref, Runtime, Schedule } from "effect";
import {
  gen,
  logDebug,
  logError,
  logInfo,
  logTrace,
  orDie,
  retry,
  tapError,
} from "effect/Effect";
import { Scope } from "effect/Scope";
import { AutosClient } from "../../apiclients/AutosClient.js";

export const fetchWithRetries = <A, E>(
  fetch: Effect.Effect<A, E>,
): Effect.Effect<A> =>
  pipe(
    fetch,
    tapError(e => logError("Error fetching user data", e)),
    retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.union(Schedule.spaced("10 seconds")),
      ),
    ),
    orDie,
  );

export const startListeningToWebsocketInBackground = (
  autos: AutosClient,
  connected: Ref.Ref<boolean>,
  handlePush: (e: AutosModel.FrontendChangeEvent) => Effect.Effect<void>,
): Effect.Effect<void, never, Scope> =>
  gen(function* () {
    const runP = Runtime.runPromise(yield* Effect.runtime<Scope>());

    const reset = (log: Effect.Effect<void>): void =>
      void runP(
        gen(function* () {
          yield* log;

          yield* Ref.set(connected, false);

          yield* Effect.sleep("2 seconds");

          yield* logDebug("attempting reconnection");

          yield* startListeningToWebsocketInBackground(
            autos,
            connected,
            handlePush,
          );
        }),
      );

    const onOpen = () => {
      void runP(logTrace("websocket opened"));
      void runP(Ref.set(connected, true));
    };

    const onErrorEvent = (e: Socket.SocketGenericError) =>
      reset(logError("Websocket error", e));
    const onCloseEvent = (e: Socket.SocketCloseError) =>
      reset(logInfo("Websocket close", e));
    const onMessage = (e: AutosModel.FrontendChangeEvent) =>
      void runP(handlePush(e));

    const startHandler = yield* autos.makeImperativeSocketHandler;

    startHandler(onOpen, onErrorEvent, onCloseEvent, onMessage);
  }).pipe(Effect.forkDaemon);
