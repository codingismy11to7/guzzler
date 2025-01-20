import { Effect, identity } from "effect";
import { gen } from "effect/Effect";
import {
  ClientSessionOptions,
  EndSessionOptions,
  TransactionOptions,
} from "mongodb";
import { createInTransaction } from "./internal/createInTransaction.js";
import { MongoError } from "./Model.js";
import { MongoClientLayer } from "./MongoClientLayer.js";

export class MongoTransactions extends Effect.Service<MongoTransactions>()(
  "MongoTransactions",
  {
    accessors: true,
    effect: gen(function* () {
      const client = yield* MongoClientLayer;

      const inTransactionRaw: (
        startSessionOptions?: ClientSessionOptions,
        endSessionOptions?: EndSessionOptions,
        transactionOptions?: TransactionOptions,
      ) => <A, E, R>(
        e: Effect.Effect<A, E, R>,
      ) => Effect.Effect<A, MongoError | E, R> = createInTransaction(
        client,
        identity,
      );

      const inTransaction: (
        startSessionOptions?: ClientSessionOptions,
        endSessionOptions?: EndSessionOptions,
        transactionOptions?: TransactionOptions,
      ) => <A, E, R>(e: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =
        createInTransaction(client, Effect.die);

      return {
        inTransactionRaw,
        inTransaction,
      };
    }),
  },
) {}
