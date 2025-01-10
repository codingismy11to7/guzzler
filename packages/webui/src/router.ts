import { Route, createRouter, defineRoute } from "type-route";

export const { RouteProvider, useRoute, routes } = createRouter({
  login: defineRoute("/login"),
  newUser: defineRoute("/newUser"),
  home: defineRoute("/"),
});

export type AppRoute = Route<typeof routes>;
