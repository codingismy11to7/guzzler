import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";
import {
  FullSession,
  Logout,
  SessionWithoutUser,
} from "@guzzler/domain/apis/SessionApi";
import { AppApi } from "@guzzler/domain/AppApi";
import { RawCurrentSession_DoNotUse } from "@guzzler/domain/Authentication";
import { Session } from "@guzzler/domain/Session";
import { Effect, identity, Match, Option, pipe } from "effect";
import { SessionStorage } from "../SessionStorage.js";

export const SessionApiLive = HttpApiBuilder.group(
  AppApi,
  "session",
  handlers =>
    Effect.gen(function* () {
      const { clearSession } = yield* SessionStorage;

      return handlers
        .handle("getSessionInfo", () =>
          pipe(
            Effect.serviceOption(RawCurrentSession_DoNotUse),
            Effect.flatMap(identity),
            Effect.andThen(
              Match.type<Session>().pipe(
                Match.tagsExhaustive({
                  UserSession: s =>
                    FullSession.make({
                      user: s.user,
                      userInfo: s.oAuthUserInfo,
                    }),

                  UnknownUserSession: s =>
                    SessionWithoutUser.make({ userInfo: s.oAuthUserInfo }),
                }),
              ),
            ),
            Effect.catchTag("NoSuchElementException", () => new Unauthorized()),
          ),
        )

        .handleRaw(Logout, () =>
          Effect.gen(function* () {
            const sessOpt = yield* Effect.serviceOption(
              RawCurrentSession_DoNotUse,
            );

            if (Option.isSome(sessOpt)) yield* clearSession(sessOpt.value._id);

            return HttpServerResponse.redirect("/", {
              status: 303,
            });
          }),
        );
    }),
);
