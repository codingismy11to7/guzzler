import { Route, createRouter, defineRoute, param, createGroup } from "type-route";

const Signup = defineRoute("/signup");
const SignupRoutes = {
  Signup,
  SignupConfirm: Signup.extend({ username: param.path.string }, p => `/confirm/${p.username}`),
} as const;

export const { RouteProvider, useRoute, routes } = createRouter({
  Login: defineRoute("/login"),
  Home: defineRoute("/"),
  ...SignupRoutes,
});

export const RoutingGroups = {
  Signup: createGroup([routes.Signup, routes.SignupConfirm]),
} as const;

export type AppRoute = Route<typeof routes>;
export type SignupRoute = Route<typeof RoutingGroups.Signup>;
