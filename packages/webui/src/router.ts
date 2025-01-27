import { Autos } from "@guzzler/domain";
import {
  Route,
  createRouter,
  defineRoute,
  param,
  createGroup,
} from "type-route";

const Signup = defineRoute("/signup");
const SignupRoutes = {
  Signup,
  SignupConfirm: Signup.extend(
    { username: param.path.string },
    p => `/confirm/${p.username}`,
  ),
} as const;

const Home = defineRoute("/");
const Pages = {
  CategoryManagement: Home.extend("/manageCategories"),
  Home,
  ImportExport: Home.extend("/manageData"),
  Settings: Home.extend("/settings"),
  Vehicle: Home.extend(
    {
      vehicleId: param.path.ofType<Autos.VehicleId>({
        stringify: i => i,
        parse: Autos.VehicleId.make,
      }),
    },
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
