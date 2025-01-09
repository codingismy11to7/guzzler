import { HttpApiClient } from "@effect/platform";
import { AppApi } from "@guzzler/domain";
import { Username } from "@guzzler/domain/User";
import { Effect, pipe } from "effect";
import { httpClientMethodDieFromFatal as dieFromFatal } from "./internal/utils.js";

export class SessionClient extends Effect.Service<SessionClient>()("SessionClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const getSessionInfo = client.session.getSessionInfo();

      const validateUsername = (username: Username) =>
        client.session.validateUsername({ path: { username } }).pipe(Effect.catchTags(dieFromFatal));

      return { getSessionInfo, validateUsername };
    }),
  ),
}) {}
