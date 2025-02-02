import { Skeleton } from "@mui/material";
import { Effect, Fiber, Match, Schedule } from "effect";
import {
  annotateLogs,
  catchTags,
  gen,
  logDebug,
  logInfo,
  logWarning,
  retry,
  tapError,
} from "effect/Effect";
import React, { lazy, ReactElement, useEffect, useState } from "react";
import { SessionClient } from "./apiclients/SessionClient.js";
import Loading from "./components/Loading.js";
import {
  defaultGlobalContext,
  GlobalContext,
  Succeeded,
  Unauthenticated,
  useCurrentSessionInfo,
} from "./contexts/GlobalContext.js";
import { runFork, runP } from "./internal/bootstrap.js";
import { LoginPage } from "./pages/LoginPage.js";
import {
  PagesRoute,
  routes,
  RoutingGroups,
  SignupRoute,
  useRoute,
} from "./router.js";

const SignupPage = lazy(() => import("./pages/SignupPage.js"));
const LoggedInApp = lazy(() => import("./pages/LoggedInApp.js"));

const LoggedInAppWrapper = ({ route }: { route: PagesRoute }) => {
  const session = useCurrentSessionInfo();

  return session?._tag === "FullSession" ? (
    <LoggedInApp route={route} session={session} />
  ) : (
    <Skeleton variant="rectangular" />
  );
};

const SignupPageWrapper = ({ route }: Readonly<{ route: SignupRoute }>) => {
  const sess = useCurrentSessionInfo();

  return sess ? (
    <SignupPage {...sess} route={route} />
  ) : (
    <Skeleton variant="rectangular" />
  );
};

const Page = (): ReactElement => {
  const route = useRoute();

  return route.name === false ? (
    <>
      <div>Not Found</div>
      <div>
        <a {...routes.Home().link}>Go Home</a>
      </div>
    </>
  ) : RoutingGroups.Signup.has(route) ? (
    <SignupPageWrapper route={route} />
  ) : RoutingGroups.Pages.has(route) ? (
    <LoggedInAppWrapper route={route} />
  ) : (
    Match.value(route).pipe(
      Match.discriminatorsExhaustive("name")({
        Login: () => <LoginPage />,
      }),
    )
  );
};

const App = () => {
  const [globalContext, setGlobalContext] = useState(defaultGlobalContext);
  const [connected, setConnected] = useState(false);
  const route = useRoute();

  useEffect(() => {
    setGlobalContext(old =>
      old.loading || old._tag !== "Succeeded"
        ? old
        : Succeeded.make({ ...old, connected }),
    );
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      const fiber = runFork(
        gen(function* () {
          yield* logDebug("checking for existing session");

          const si = yield* SessionClient.sessionInfo;

          yield* logInfo("Received session").pipe(
            annotateLogs({ type: si._tag }),
          );

          setGlobalContext(
            Succeeded.make({
              sessionInfo: si,
              connected,
              setConnected,
            }),
          );
        }).pipe(
          catchTags({
            Unauthorized: () =>
              Effect.sync(() => setGlobalContext(Unauthenticated.make())),
          }),
          tapError(e =>
            logWarning("Received error while fetching session info", e),
          ),
          retry(
            Schedule.exponential("125 millis").pipe(
              Schedule.union(Schedule.spaced("5 seconds")),
            ),
          ),
        ),
      );

      return () => {
        void runP(Fiber.interruptFork(fiber));
      };
    }
  }, [connected]);

  const isUnauthenticated =
    !globalContext.loading && globalContext._tag === "Unauthenticated";
  const isNewUser =
    !globalContext.loading &&
    globalContext._tag === "Succeeded" &&
    globalContext.sessionInfo._tag === "SessionWithoutUser";

  useEffect(() => {
    if (isUnauthenticated && route.name !== routes.Login().name)
      routes.Login().replace();
    if (isNewUser && !RoutingGroups.Signup.has(route))
      routes.Signup().replace();
  }, [isNewUser, isUnauthenticated, route]);

  return (
    <GlobalContext.Provider value={globalContext}>
      {globalContext.loading ? <Loading /> : <Page />}
    </GlobalContext.Provider>
  );
};

export default App;
