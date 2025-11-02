import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";
import {
  FullSession,
  Logout,
  SessionWithoutUser,
} from "@guzzlerapp/domain/apis/SessionApi";
import { AppApi } from "@guzzlerapp/domain/AppApi";
import { RawCurrentSession_DoNotUse } from "@guzzlerapp/domain/Authentication";
import { Match, Option } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { fn, mapError, serviceOption } from "effect/Effect";
import { tagsExhaustive } from "effect/Match";
import { SessionStorage } from "../SessionStorage.js";

export const SessionApiLive = HttpApiBuilder.group(
  AppApi,
  "session",
  fn("SessionApiLive")(function* (handlers) {
    const { clearSession } = yield* SessionStorage;

    return handlers
      .handle(
        "getSessionInfo",
        fn("getSessionInfo")(function* () {
          const sessOpt = yield* serviceOption(RawCurrentSession_DoNotUse);

          const sess = yield* sessOpt.pipe(
            mapError((_: NoSuchElementException) => new Unauthorized()),
          );

          return Match.value(sess).pipe(
            tagsExhaustive({
              UserSession: s =>
                FullSession.make({ user: s.user, userInfo: s.oAuthUserInfo }),

              UnknownUserSession: s =>
                SessionWithoutUser.make({ userInfo: s.oAuthUserInfo }),
            }),
          );
        }),
      )

      .handleRaw(
        Logout,
        fn(Logout)(function* () {
          const sessOpt = yield* serviceOption(RawCurrentSession_DoNotUse);

          if (Option.isSome(sessOpt)) yield* clearSession(sessOpt.value._id);

          return HttpServerResponse.redirect("/", { status: 303 });
        }),
      );
  }),
);
