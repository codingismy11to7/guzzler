import { Effect, Fiber, Layer, pipe, Stream } from "effect";
import { gen } from "effect/Effect";
import { PropsWithChildren, useEffect, useState } from "react";
import { AutosClient } from "../apiclients/AutosClient.js";
import { AutosDataRepository } from "../data/AutosDataRepository.js";
import { makeRunFunctions } from "../internal/bootstrap.js";
import * as internal from "../internal/contexts/userDataContext.js";
import * as Model from "../models/UserDataContext.js";
import { useSucceededGlobalContext_Unsafe } from "./GlobalContext.js";

const { runP, runFork } = makeRunFunctions(
  AutosDataRepository.Default.pipe(Layer.provideMerge(AutosClient.Default)),
);

export const UserDataContextProvider = ({ children }: PropsWithChildren) => {
  const { setConnected } = useSucceededGlobalContext_Unsafe();
  const [userData, setUserData] = useState(internal.defaultUserDataContext());

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
  }, [setConnected]);

  return (
    <internal.UserDataContext.Provider value={userData}>
      {children}
    </internal.UserDataContext.Provider>
  );
};
