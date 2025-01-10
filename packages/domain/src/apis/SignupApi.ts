import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Conflict } from "@effect/platform/HttpApiError";
import { Schema } from "effect";
import { RequireNewUserSession } from "../Authentication.js";
import { Username } from "../User.js";

export class SignupApi extends HttpApiGroup.make("signup")
  .add(
    HttpApiEndpoint.get("validateUsername", "/username/:username/validate")
      .setPath(Schema.Struct({ username: Username }))
      .addSuccess(Schema.Struct({ available: Schema.Boolean })),
  )
  .add(
    HttpApiEndpoint.post("setUsername", "/username/set")
      .setPayload(Schema.Struct({ username: Username }).pipe(HttpApiSchema.withEncoding({ kind: "UrlParams" })))
      .addSuccess(Schema.Void, { status: 303 })
      .addError(Conflict),
  )
  .middleware(RequireNewUserSession)
  .prefix("/signup") {}
