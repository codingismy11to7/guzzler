import { Session, SessionId } from "@guzzler/domain/Session";
import { Data, Effect, pipe } from "effect";
import { AppConfig } from "./AppConfig.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import { OAuth2 } from "./OAuth2.js";

export class SessionNotFound extends Data.TaggedError("SessionNotFound") {}

export class SessionStorage extends Effect.Service<SessionStorage>()("SessionStorage", {
  accessors: true,
  effect: Effect.gen(function* () {
    const { sessions } = yield* CollectionRegistry;
    const appConfig = yield* AppConfig;
    const { getNewAccessTokenUsingRefreshToken } = yield* OAuth2;

    const persistSession = (session: Session) => sessions.upsert({ _id: session.id }, session);
    const clearSession = (sessionId: SessionId) => sessions.deleteOne({ _id: sessionId }).pipe(Effect.asVoid);

    const addSession = (session: Session): Effect.Effect<Session> =>
      pipe(Effect.logDebug("adding session", session), Effect.andThen(persistSession(session)), Effect.as(session));

    const refreshSession = (s: Session) =>
      pipe(
        Effect.logTrace(`Refreshing session ${s.id}`),
        Effect.andThen(Effect.fromNullable(s.token.refresh_token)),
        Effect.andThen(
          getNewAccessTokenUsingRefreshToken(s.token, {
            onlyIfExpiringWithin: appConfig.googleOAuth.tokenExpirationWindow,
          }),
        ),
        Effect.andThen(accessToken => ({ ...s, accessToken })),
        Effect.tap(persistSession),
        Effect.catchAll(e =>
          "_tag" in e && e._tag === "NoSuchElementException"
            ? Effect.logWarning("no refresh_token, not trying to refresh").pipe(Effect.as(s))
            : Effect.logError(`Error refreshing token for ${s.id}`, e).pipe(
                // error, kill this session
                Effect.andThen(clearSession(s.id)),
                Effect.andThen(new SessionNotFound()),
              ),
        ),
      );

    const getSession = (sessionId: SessionId): Effect.Effect<Session, SessionNotFound> =>
      pipe(
        sessions.findOne({ _id: sessionId }),
        Effect.andThen(refreshSession),
        Effect.catchTag("NotFound", () => new SessionNotFound()),
      );

    return { addSession, getSession, clearSession };
  }),
}) {}
