import { Skeleton } from "@mui/material";
import { Effect, Match, pipe } from "effect";
import React, { lazy, ReactElement, useEffect, useState } from "react";
import { SessionClient } from "./apiclients/SessionClient.js";
import {
  defaultGlobalContext,
  Errored,
  GlobalContext,
  Succeeded,
  Unauthenticated,
  useCurrentSessionInfo,
} from "./GlobalContext.js";
import { makeRunFunctions } from "./internal/bootstrap.js";
import Loading from "./Loading.js";
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

const { runP } = makeRunFunctions(SessionClient.Default);

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
  const route = useRoute();

  useEffect(
    () =>
      void pipe(
        SessionClient.getSessionInfo,
        Effect.andThen(si =>
          setGlobalContext(Succeeded.make({ sessionInfo: si })),
        ),
        Effect.catchTag("Unauthorized", () =>
          Effect.sync(() => setGlobalContext(Unauthenticated.make())),
        ),
        Effect.catchAll(e =>
          Effect.sync(() =>
            setGlobalContext(Errored.make({ error: e.message })),
          ),
        ),
        runP,
      ),
    [],
  );

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
      {globalContext.loading ? (
        <Loading />
      ) : (
        Match.value(globalContext).pipe(
          Match.tag("Errored", e => <div>Error: {e.error}</div>),
          Match.orElse(() => <Page />),
        )
      )}
    </GlobalContext.Provider>
  );
};

export default App;
