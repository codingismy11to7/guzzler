import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Effect, pipe } from "effect";

export class SessionClient extends Effect.Service<SessionClient>()("SessionClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const getSessionInfo = client.session.getSessionInfo();

      return { getSessionInfo };
    }),
  ),
}) {}
