import { Session, SessionId } from "@guzzler/domain/Session";
import { Data, Effect, HashMap, pipe, Ref, SynchronizedRef } from "effect";
import { AppConfig } from "./AppConfig.js";
import { OAuth2 } from "./OAuth2.js";

export class SessionNotFound extends Data.TaggedError("SessionNotFound") {}

export class SessionStorage extends Effect.Service<SessionStorage>()("SessionStorage", {
  accessors: true,
  effect: Effect.gen(function* () {
    const appConfig = yield* AppConfig;
    const { getNewAccessTokenUsingRefreshToken } = yield* OAuth2;
    const sessions = yield* SynchronizedRef.make(HashMap.empty<SessionId, Session>());

    const addSession = (session: Session) =>
      pipe(
        Effect.logDebug("adding session", session),
        Effect.andThen(Ref.update(sessions, HashMap.set(session.id, session))),
        Effect.as(session),
      );

    const refreshSession = (s: Session): Effect.Effect<Session, { _tag: "Failed" }> =>
      pipe(
        Effect.logTrace(`Refreshing session ${s.id}`),
        Effect.andThen(Effect.fromNullable(s.token.refresh_token)),
        Effect.andThen(
          getNewAccessTokenUsingRefreshToken(s.token, {
            onlyIfExpiringWithin: appConfig.oauth.tokenExpirationWindow,
          }),
        ),
        Effect.andThen(accessToken => ({ ...s, accessToken })),
        Effect.catchAll(e =>
          "_tag" in e && e._tag === "NoSuchElementException"
            ? Effect.logWarning("no refresh_token, not trying to refresh").pipe(Effect.as(s))
            : Effect.logError(`Error refreshing token for ${s.id}`, e).pipe(
                Effect.andThen(Effect.fail({ _tag: "Failed" } as const)),
              ),
        ),
      );

    const getSession = (sessionId: SessionId) =>
      pipe(
        sessions.pipe(
          SynchronizedRef.updateAndGetEffect(sessions =>
            pipe(
              sessions,
              HashMap.get(sessionId),
              Effect.andThen(refreshSession),
              Effect.andThen(s => HashMap.set(sessions, sessionId, s)),
              Effect.catchTag("Failed", () => Effect.succeed(HashMap.remove(sessions, sessionId))),
            ),
          ),
        ),
        Effect.andThen(HashMap.get(sessionId)),
        Effect.catchTag("NoSuchElementException", () => new SessionNotFound()),
      );

    return { addSession, getSession };
  }),
}) {}
