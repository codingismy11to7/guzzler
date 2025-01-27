import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { AccountApi } from "./apis/AccountApi.js";
import { AuthApi } from "./apis/AuthApi.js";
import { AutosApi } from "./apis/AutosApi.js";
import { ImageApi } from "./apis/ImageApi.js";
import { PreferencesApi } from "./apis/PreferencesApi.js";
import { SessionApi } from "./apis/SessionApi.js";
import { SignupApi } from "./apis/SignupApi.js";
import {
  AuthRedirectMiddleware,
  RawSessionAccess_DoNotUse,
} from "./Authentication.js";
import { RedactedError, ServerError } from "./Errors.js";

class UI extends HttpApiGroup.make("ui")
  .add(
    HttpApiEndpoint.get("ui", "/*")
      .addError(NotFound)
      .addError(RedactedError)
      .addError(ServerError),
  )
  .middleware(AuthRedirectMiddleware)
  .middleware(RawSessionAccess_DoNotUse)
  .annotateContext(OpenApi.annotations({ exclude: true })) {}

export class AppApi extends HttpApi.make("Guzzler")
  .add(AccountApi)
  .add(AuthApi)
  .add(AutosApi)
  .add(ImageApi)
  .add(PreferencesApi)
  .add(SessionApi)
  .add(SignupApi)
  .add(UI)
  .annotateContext(
    OpenApi.annotations({ title: "Guzzler", version: "current" }),
  ) {}
