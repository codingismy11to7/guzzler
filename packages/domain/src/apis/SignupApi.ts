import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Conflict } from "@effect/platform/HttpApiError";
import { Schema } from "effect";
import { RequireNewUserSession } from "../Authentication.js";
import { Username } from "../User.js";

export const SetUsername = "setUsername";

export class SignupApi extends HttpApiGroup.make("signup")
  .add(
    HttpApiEndpoint.get("validateUsername", "/username/:username/validate")
      .setPath(Schema.Struct({ username: Username }))
      .addSuccess(Schema.Struct({ available: Schema.Boolean })),
  )
  .add(
    HttpApiEndpoint.post(SetUsername, "/username/set/:username")
      .setPath(Schema.Struct({ username: Username }))
      .addSuccess(Schema.Void, { status: 204 })
      .addError(Conflict),
  )
  .middleware(RequireNewUserSession)
  .prefix("/api/signup") {}
