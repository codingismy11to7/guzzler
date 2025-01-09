import { HttpApiDecodeError } from "@effect/platform/HttpApiError";
import { RequestError, ResponseError } from "@effect/platform/HttpClientError";
import { Unauthenticated } from "@guzzler/domain/Authentication";
import { Effect, pipe } from "effect";

export const httpClientMethodDieFromFatal = pipe("", () => {
  const logAnd = (err: unknown, e: Effect.Effect<never>) => Effect.logError(err).pipe(Effect.andThen(e));
  return {
    HttpApiDecodeError: (e: HttpApiDecodeError) => logAnd(e, Effect.dieMessage(e.message)),
    Unauthenticated: (e: Unauthenticated) => logAnd(e, Effect.die(e)),
    RequestError: (e: RequestError) => logAnd(e, Effect.dieMessage(e.message)),
    ResponseError: (e: ResponseError) => logAnd(e, Effect.dieMessage(e.message)),
  } as const;
});
