import { Cause, Chunk, Context, Effect, Exit, Option, pipe } from "effect";
import { gen } from "effect/Effect";
import {
  ClientSession,
  ClientSessionOptions,
  EndSessionOptions,
  MongoClient,
  MongoError as RealMongoError,
  MongoServerError,
  TransactionOptions,
} from "mongodb";
import { MongoError } from "../Model.js";

/** @internal */
export class MongoTxnCtx extends Context.Tag("MongoTxnCtx")<
  MongoTxnCtx,
  ClientSession
>() {}

const provideSession = (session: ClientSession) =>
  Effect.provideService(MongoTxnCtx, session);

export const createInTransaction =
  <CommitErr = MongoError>(
    client: MongoClient,
    handleCommitErr: (err: MongoError) => Effect.Effect<never, CommitErr>,
  ) =>
  (
    startSessionOptions?: ClientSessionOptions,
    endSessionOptions?: EndSessionOptions,
    transactionOptions?: TransactionOptions,
  ) =>
  <A, E, R>(e: Effect.Effect<A, E, R>): Effect.Effect<A, E | CommitErr, R> =>
    gen(function* () {
      const alreadyInTxn = Option.isSome(
        yield* Effect.serviceOption(MongoTxnCtx),
      );
      if (alreadyInTxn) return yield* e;

      const session = yield* Effect.acquireRelease(
        Effect.sync(() => client.startSession(startSessionOptions)),
        s =>
          Effect.tryPromise(() => s.endSession(endSessionOptions)).pipe(
            Effect.catchTag("UnknownException", Effect.logError),
            Effect.annotateLogs({ action: "endSession" }),
          ),
      );

      const collectErrors = (c: Cause.Cause<unknown>) =>
        Chunk.appendAll(Cause.failures(c), Cause.defects(c));

      // rip code from the mongo node driver docs below

      const doCommit: Effect.Effect<void, CommitErr> = pipe(
        Effect.tryPromise({
          try: () => session.commitTransaction(),
          catch: e => e as RealMongoError,
        }),
        Effect.catchAll(e =>
          e instanceof MongoServerError &&
          e.hasErrorLabel("UnknownTransactionCommitResult")
            ? doCommit
            : handleCommitErr(new MongoError({ underlying: e })),
        ),
      );

      const isRetryable = (i: unknown) =>
        i instanceof MongoServerError &&
        i.hasErrorLabel("TransientTransactionError");
      const isRetryableWrapped = (i: unknown) =>
        isRetryable(i) ||
        (i instanceof MongoError && isRetryable(i.underlying));

      const runTxnWithRetry = <A, E, R>(
        e: Effect.Effect<A, E, R>,
      ): Effect.Effect<A, E, R> =>
        gen(function* () {
          const exit = yield* e.pipe(Effect.exit);
          if (Exit.isSuccess(exit)) return exit.value;
          else {
            const shouldRetry = Chunk.some(
              collectErrors(exit.cause),
              isRetryableWrapped,
            );
            return yield* shouldRetry
              ? runTxnWithRetry(e)
              : Effect.failCause(exit.cause);
          }
        });

      return yield* runTxnWithRetry(
        gen(function* () {
          session.startTransaction(transactionOptions);

          const ret = yield* e.pipe(provideSession(session));

          yield* pipe(
            doCommit,
            Effect.tapError(() =>
              Effect.promise(() => session.abortTransaction()),
            ),
          );

          return ret;
        }),
      );
    }).pipe(Effect.scoped);
