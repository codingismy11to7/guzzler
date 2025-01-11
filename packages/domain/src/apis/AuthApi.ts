import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { RedactedError } from "../Errors.js";

export const StartGoogleLogin = "startGoogleLogin";

export class AuthApi extends HttpApiGroup.make("auth")
  .add(HttpApiEndpoint.get("oAuthCallback", "/callback").addError(RedactedError))
  .add(HttpApiEndpoint.get(StartGoogleLogin, "/"))
  .annotateContext(OpenApi.annotations({ exclude: true }))
  .prefix("/auth/google") {}
