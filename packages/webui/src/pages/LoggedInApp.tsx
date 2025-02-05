import { Match } from "effect";
import React, { lazy } from "react";
import { PageContainer } from "../components/PageContainer.js";
import { useUserDataUpdater } from "../hooks/useUserDataUpdater.js";
import { PagesRoute } from "../router.js";

const AddFillup = lazy(() => import("./AddFillup.js"));
const CategoryManagement = lazy(() => import("./CategoryManagement.js"));
const HomePage = lazy(() => import("./HomePage.js"));
const ImportPage = lazy(() => import("./ImportPage.js"));
const SettingsPage = lazy(() => import("./SettingsPage.js"));
const VehiclePage = lazy(() => import("./VehiclePage.js"));
const VehiclesPage = lazy(() => import("./VehiclesPage.js"));

type Props = Readonly<{ route: PagesRoute }>;

const LoggedInApp = ({ route }: Props) => {
  useUserDataUpdater();

  return (
    <PageContainer route={route}>
      {Match.value(route).pipe(
        Match.discriminatorsExhaustive("name")({
          AddFillup: r => <AddFillup route={r} />,
          CategoryManagement: () => <CategoryManagement />,
          Home: () => <HomePage />,
          ImportExport: () => <ImportPage />,
          Settings: () => <SettingsPage />,
          Vehicles: () => <VehiclesPage />,
          Vehicle: r => <VehiclePage route={r} />,
        }),
      )}
    </PageContainer>
  );
};

export default LoggedInApp;
