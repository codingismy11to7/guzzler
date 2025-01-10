import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { RedactedError } from "../Errors.js";

export class AuthApi extends HttpApiGroup.make("auth")
  .add(HttpApiEndpoint.get("oAuthCallback", "/callback").addError(RedactedError))
  .add(HttpApiEndpoint.get("startRedirect", "/"))
  .annotateContext(OpenApi.annotations({ exclude: true }))
  .prefix("/auth/google") {}
