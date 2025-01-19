import { Effect, pipe } from "effect";
import { UnknownException } from "effect/Cause";
import { LazyArg } from "effect/Function";
import type { MongoError as RealMongoError } from "mongodb";
import { MongoError } from "../Model.js";

export type { RealMongoError as RealMongoError };

export const toMongoErr = Effect.mapError(
  (e: UnknownException) =>
    new MongoError({ underlying: e.error as RealMongoError }),
);

export const mongoEff = <A>(p: LazyArg<Promise<A>>) =>
  pipe(Effect.tryPromise(p), toMongoErr);
