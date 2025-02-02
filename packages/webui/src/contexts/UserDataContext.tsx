import { Effect, Fiber, pipe, Stream } from "effect";
import { gen } from "effect/Effect";
import { PropsWithChildren, useEffect, useState } from "react";
import { AutosDataRepository } from "../data/AutosDataRepository.js";
import { runFork, runP } from "../internal/bootstrap.js";
import * as internal from "../internal/contexts/userDataContext.js";
import * as Model from "../models/UserDataContext.js";
import { useSucceededGlobalContext_Unsafe } from "./GlobalContext.js";

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
