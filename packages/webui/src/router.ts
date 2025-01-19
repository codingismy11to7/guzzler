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
  Home,
  ImportExport: Home.extend("/manageData"),
};

export const { RouteProvider, useRoute, routes } = createRouter({
  Login: defineRoute("/login"),
  ...Pages,
  ...SignupRoutes,
});

export const RoutingGroups = {
  Signup: createGroup([routes.Signup, routes.SignupConfirm]),
  Pages: createGroup([routes.Home, routes.ImportExport]),
} as const;

export type AppRoute = Route<typeof routes>;
export type SignupRoute = Route<typeof RoutingGroups.Signup>;
export type PagesRoute = Route<typeof RoutingGroups.Pages>;
