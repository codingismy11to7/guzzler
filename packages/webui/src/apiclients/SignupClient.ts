import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzlerapp/domain";
import { Username } from "@guzzlerapp/domain/User";
import { Effect, pipe } from "effect";
import {
  dieFromFatal,
  dieFromFatalExceptBadInput,
} from "../internal/apiclients/utils.js";

export class SignupClient extends Effect.Service<SignupClient>()(
  "SignupClient",
  {
    accessors: true,
    effect: pipe(
      HttpApiClient.make(AppApi.AppApi),
      Effect.andThen(client => {
        const validateUsername = (username: Username) =>
          client.signup
            .validateUsername({ path: { username } })
            .pipe(Effect.catchTags(dieFromFatal));

        const setUsername = (username: Username) =>
          client.signup
            .setUsername({ path: { username } })
            .pipe(Effect.catchTags(dieFromFatalExceptBadInput));

        return { validateUsername, setUsername };
      }),
    ),
  },
) {}
