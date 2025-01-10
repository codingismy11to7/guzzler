import { HttpApiClient } from "@effect/platform";
import { AppApi, SessionApi } from "@guzzler/domain";
import { Effect, pipe } from "effect";
import { httpClientMethodDieFromFatal } from "../internal/utils.js";

export class AccountClient extends Effect.Service<AccountClient>()("AccountClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const deleteAccount = () =>
        pipe(
          client.account.deleteAccount(),
          Effect.andThen(() => document.location.assign(SessionApi.SessionApi.endpoints.logout.path)),
          Effect.catchTags(httpClientMethodDieFromFatal),
        );

      return { deleteAccount };
    }),
  ),
}) {}
