import { Route, createRouter, defineRoute } from "type-route";

export const { RouteProvider, useRoute, routes } = createRouter({
  login: defineRoute("/login"),
  newUser: defineRoute("/signup"),
  home: defineRoute("/"),
});

export type AppRoute = Route<typeof routes>;
