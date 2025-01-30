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
const Pages = {
  AddFillup: Home.extend(
    { vehicleId: param.path.optional.ofType(vehicleId) },
    p => `/fillups/add/${p.vehicleId}`,
  ),
  CategoryManagement: Home.extend("/manageCategories"),
  Home,
  ImportExport: Home.extend("/manageData"),
  Settings: Home.extend("/settings"),
  Vehicle: Home.extend(
    { vehicleId: param.path.ofType(vehicleId) },
    p => `/vehicle/${p.vehicleId}`,
  ),
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
    routes.Vehicles,
  ]),
} as const;

export type AppRoute = Route<typeof routes>;
export type SignupRoute = Route<typeof RoutingGroups.Signup>;
export type PagesRoute = Route<typeof RoutingGroups.Pages>;
