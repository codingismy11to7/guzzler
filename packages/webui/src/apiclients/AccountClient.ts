import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Effect, pipe } from "effect";
import { dieFromFatal } from "../internal/apiclients/utils.js";
import { logout } from "../utils/logout.js";

export class AccountClient extends Effect.Service<AccountClient>()(
  "AccountClient",
  {
    accessors: true,
    effect: pipe(
      HttpApiClient.make(AppApi.AppApi),
      Effect.andThen(client => {
        const deleteAccount = () =>
          pipe(
            client.account.deleteAccount(),
            Effect.andThen(logout),
            Effect.catchTags(dieFromFatal),
          );

        return { deleteAccount };
      }),
    ),
  },
) {}
