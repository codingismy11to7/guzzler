import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";

export class AccountApi extends HttpApiGroup.make("account")
  .add(HttpApiEndpoint.del("deleteAccount", "/").addSuccess(Schema.Void, { status: 204 }))
  .middleware(RequireFullSession)
  .prefix("/account") {}
