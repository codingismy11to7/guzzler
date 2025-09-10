import {
  Forbidden,
  HttpApiDecodeError,
  Unauthorized,
} from "@effect/platform/HttpApiError";
import { RequestError, ResponseError } from "@effect/platform/HttpClientError";
import { Effect, ParseResult } from "effect";
import { ParseError } from "effect/ParseResult";

const logAnd = (err: unknown, e: Effect.Effect<never>) =>
  Effect.logError(err).pipe(Effect.andThen(e));

export const dieFromFatalExceptBadInput = {
  Unauthorized: (e: Unauthorized) => logAnd(e, Effect.die(e)),
  Forbidden: (e: Forbidden) => logAnd(e, Effect.die(e)),
  ParseError: (e: ParseError) =>
    logAnd(e, Effect.dieMessage(ParseResult.TreeFormatter.formatErrorSync(e))),
  RequestError: (e: RequestError) => logAnd(e, Effect.dieMessage(e.message)),
  ResponseError: (e: ResponseError) => logAnd(e, Effect.dieMessage(e.message)),
};

export const dieFromFatal = {
  HttpApiDecodeError: (e: HttpApiDecodeError) =>
    logAnd(e, Effect.dieMessage(e.message)),
  ...dieFromFatalExceptBadInput,
};
