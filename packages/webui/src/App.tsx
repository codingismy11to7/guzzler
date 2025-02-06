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
import React, { lazy, ReactElement, useEffect } from "react";
import { SessionClient } from "./apiclients/SessionClient.js";
import { useAppState } from "./AppStore.js";
import Loading from "./components/Loading.js";
import { useCurrentSessionInfo } from "./hooks/sessionHooks.js";
import { PreLoginFunctions } from "./internal/runtimes/PreLogin.js";
import { Succeeded, Unauthenticated } from "./models/AppState.js";
import { LoginPage } from "./pages/LoginPage.js";
import {
  PagesRoute,
  routes,
  RoutingGroups,
  SignupRoute,
  useRoute,
} from "./router.js";

const { runFork, runP } = PreLoginFunctions;

const SignupPage = lazy(() => import("./pages/SignupPage.js"));
const LoggedInApp = lazy(() => import("./pages/LoggedInApp.js"));

const LoggedInAppWrapper = ({ route }: { route: PagesRoute }) => {
  const session = useCurrentSessionInfo();

  return session?._tag === "FullSession" ? (
    <LoggedInApp route={route} />
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
  const sessionState = useAppState(s => s.sessionState);
  const setSessionState = useAppState(s => s.setSessionState);
  const modifySessionState = useAppState(s => s.modifySessionState);

  const connectedToBackend =
    !sessionState.loading && sessionState._tag === "Succeeded"
      ? sessionState.connectedToBackend
      : false;

  const route = useRoute();

  useEffect(() => {
    modifySessionState(old =>
      old.loading || old._tag !== "Succeeded"
        ? old
        : Succeeded.make({ ...old, connectedToBackend }),
    );
  }, [connectedToBackend, modifySessionState]);

  useEffect(() => {
    if (!connectedToBackend) {
      const fiber = runFork(
        gen(function* () {
          yield* logDebug("checking for existing session");

          const si = yield* SessionClient.sessionInfo;

          yield* logInfo("Received session").pipe(
            annotateLogs({ type: si._tag }),
          );

          setSessionState(
            Succeeded.make({
              sessionInfo: si,
              connectedToBackend,
            }),
          );
        }).pipe(
          catchTags({
            Unauthorized: () =>
              Effect.sync(() => setSessionState(Unauthenticated.make())),
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
  }, [connectedToBackend, setSessionState]);

  const isUnauthenticated =
    !sessionState.loading && sessionState._tag === "Unauthenticated";
  const isNewUser =
    !sessionState.loading &&
    sessionState._tag === "Succeeded" &&
    sessionState.sessionInfo._tag === "SessionWithoutUser";

  useEffect(() => {
    if (isUnauthenticated && route.name !== routes.Login().name)
      routes.Login().replace();
    if (isNewUser && !RoutingGroups.Signup.has(route))
      routes.Signup().replace();
  }, [isNewUser, isUnauthenticated, route]);

  return sessionState.loading ? <Loading /> : <Page />;
};

export default App;
