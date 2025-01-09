import { HttpApiBuilder, HttpApiSecurity } from "@effect/platform";
import { Redacted } from "effect/Redacted";

export const setSecureCookie = (cookieName: string, value: Redacted) =>
  HttpApiBuilder.securitySetCookie(HttpApiSecurity.apiKey({ key: cookieName, in: "cookie" }), value, {
    maxAge: "30 days",
    sameSite: "lax",
    path: "/",
  });
