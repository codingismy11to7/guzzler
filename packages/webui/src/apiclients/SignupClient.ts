import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Username } from "@guzzler/domain/User";
import { Effect, pipe } from "effect";
import { httpClientMethodDieFromFatal as dieFromFatal } from "../internal/utils.js";

export class SignupClient extends Effect.Service<SignupClient>()("SignupClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const validateUsername = (username: Username) =>
        client.signup.validateUsername({ path: { username } }).pipe(Effect.catchTags(dieFromFatal));

      return { validateUsername };
    }),
  ),
}) {}
