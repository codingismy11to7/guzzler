import { FullSession } from "@guzzler/domain/apis/SessionApi";
import { Match } from "effect";
import React, { lazy } from "react";
import { PageContainer } from "../components/PageContainer.js";
import { FullSessionContext } from "../contexts/GlobalContext.js";
import { MainDrawerContextProvider } from "../contexts/MainDrawerContext.js";
import { UserDataContextProvider } from "../contexts/UserDataContext.js";
import { PagesRoute } from "../router.js";

const CategoryManagement = lazy(() => import("./CategoryManagement.js"));
const HomePage = lazy(() => import("./HomePage.js"));
const ImportPage = lazy(() => import("./ImportPage.js"));
const VehiclePage = lazy(() => import("./VehiclePage.js"));
const VehiclesPage = lazy(() => import("./VehiclesPage.js"));

type Props = Readonly<{ route: PagesRoute; session: FullSession }>;

const LoggedInApp = ({ route, session }: Props) => (
  <FullSessionContext.Provider value={session}>
    <UserDataContextProvider>
      <MainDrawerContextProvider>
        <PageContainer route={route}>
          {Match.value(route).pipe(
            Match.discriminatorsExhaustive("name")({
              CategoryManagement: () => <CategoryManagement />,
              Home: () => <HomePage />,
              ImportExport: () => <ImportPage />,
              Vehicles: () => <VehiclesPage />,
              Vehicle: r => <VehiclePage route={r} />,
            }),
          )}
        </PageContainer>
      </MainDrawerContextProvider>
    </UserDataContextProvider>
  </FullSessionContext.Provider>
);

export default LoggedInApp;
