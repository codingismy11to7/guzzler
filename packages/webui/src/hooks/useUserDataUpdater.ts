import { Effect, Fiber, pipe, Stream } from "effect";
import { gen } from "effect/Effect";
import { useCallback, useEffect } from "react";
import { useAppState } from "../AppStore.js";
import { AutosDataRepository } from "../data/AutosDataRepository.js";
import { runFork, runP } from "../internal/bootstrap.js";
import * as Model from "../models/AppState.js";

export const useUserDataUpdater = () => {
  const modifySessionState = useAppState(s => s.modifySessionState);
  const setUserData = useAppState(s => s.setUserData);

  const setConnected = useCallback(
    (connectedToBackend: boolean) =>
      modifySessionState(old =>
        !old.loading && old._tag === "Succeeded"
          ? {
              ...old,
              connectedToBackend,
            }
          : old,
      ),
    [modifySessionState],
  );

  useEffect(() => {
    const fiber = runFork(
      gen(function* () {
        const repo = yield* AutosDataRepository;

        const connFiber = yield* pipe(
          repo.connectedStream,
          Stream.runForEach(c => Effect.sync(() => setConnected(c))),
          Effect.fork,
        );

        yield* pipe(
          repo.autosDataStream,
          Stream.runForEach(d =>
            Effect.sync(() => setUserData(Model.Loaded.make(d))),
          ),
        );

        yield* Fiber.join(connFiber);
      }),
    );

    return () => {
      void runP(Fiber.interruptFork(fiber));
    };
  }, [setConnected, setUserData]);
};
