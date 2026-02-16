import { Autos } from "@guzzlerapp/domain";
import {
  createGroup,
  createRouter,
  defineRoute,
  param,
  Route,
  ValueSerializer,
} from "type-route";

const Signup = defineRoute("/signup");
const SignupRoutes = {
  Signup,
  SignupConfirm: Signup.extend(
    { username: param.path.string },
    p => `/confirm/${p.username}`,
  ),
} as const;

const vehicleId: ValueSerializer<Autos.VehicleId> = {
  stringify: i => i,
  parse: Autos.VehicleId.make,
};

const Home = defineRoute("/");
const Vehicle = Home.extend(
  { vehicleId: param.path.ofType(vehicleId) },
  p => `/vehicle/${p.vehicleId}`,
);
const Pages = {
  AddFillup: Home.extend(
    {
      vehicleId: param.path.optional.ofType(vehicleId),
      switchingVehicle: param.query.optional.boolean,
      searchingNearby: param.query.optional.boolean,
    },
    p => `/fillups/add/${p.vehicleId}`,
  ),
  CategoryManagement: Home.extend("/manageCategories"),
  Home,
  ImportExport: Home.extend("/manageData"),
  Settings: Home.extend("/settings"),
  Vehicle,
  VehicleFillups: Vehicle.extend("/fillups"),
  Vehicles: Home.extend("/vehicles"),
};

export const { RouteProvider, useRoute, routes } = createRouter({
  Login: defineRoute("/login"),
  ...Pages,
  ...SignupRoutes,
});

export const RoutingGroups = {
  Signup: createGroup([routes.Signup, routes.SignupConfirm]),
  Pages: createGroup([
    routes.AddFillup,
    routes.CategoryManagement,
    routes.Home,
    routes.ImportExport,
    routes.Settings,
    routes.Vehicle,
    routes.VehicleFillups,
    routes.Vehicles,
  ]),
} as const;

const VehicleRoutes = createGroup([routes.Vehicle, routes.VehicleFillups]);

export type AppRoute = Route<typeof routes>;
export type SignupRoute = Route<typeof RoutingGroups.Signup>;
export type PagesRoute = Route<typeof RoutingGroups.Pages>;
export type VehicleRoute = Route<typeof VehicleRoutes>;

export const navigateToVehicleTab = (
  vehicleId: Autos.VehicleId,
  tab: "info" | "fillups",
) => {
  if (tab === "fillups") routes.VehicleFillups({ vehicleId }).push();
  else routes.Vehicle({ vehicleId }).push();
};
