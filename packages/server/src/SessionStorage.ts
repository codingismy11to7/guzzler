import { Session, SessionId } from "@guzzlerapp/domain/Session";
import { DocumentNotFound } from "@guzzlerapp/mongodb/Model";
import { Effect, pipe } from "effect";
import { andThen, as, asVoid, gen, logDebug } from "effect/Effect";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class SessionStorage extends Effect.Service<SessionStorage>()(
  "SessionStorage",
  {
    accessors: true,
    effect: gen(function* () {
      const { sessions } = yield* CollectionRegistry;

      const persistSession = (session: Session) =>
        sessions.upsert({ _id: session._id }, session);

      const clearSession = (sessionId: SessionId) =>
        sessions.deleteOne({ _id: sessionId }).pipe(asVoid);

      const addSession = (session: Session): Effect.Effect<Session> =>
        pipe(
          logDebug("adding session", session),
          andThen(persistSession(session)),
          as(session),
        );

      const getSession = (
        sessionId: SessionId,
      ): Effect.Effect<Session, DocumentNotFound> =>
        sessions.findOne({ _id: sessionId });

      return { addSession, getSession, clearSession };
    }),
  },
) {}
