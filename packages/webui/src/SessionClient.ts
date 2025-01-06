import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Effect, pipe } from "effect";

export class SessionClient extends Effect.Service<SessionClient>()("SessionClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const getUserInfo = client.session.getUserInfo();

      return { getUserInfo };
    }),
  ),
}) {}