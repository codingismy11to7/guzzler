import { Effect, identity } from "effect";
import { gen } from "effect/Effect";
import { createInTransaction } from "./internal/createInTransaction.js";
import { MongoClientLayer } from "./MongoClientLayer.js";

export class MongoTransactions extends Effect.Service<MongoTransactions>()(
  "MongoTransactions",
  {
    accessors: true,
    effect: gen(function* () {
      const client = yield* MongoClientLayer;

      return {
        inTransactionRaw: createInTransaction(client, identity),
        inTransaction: createInTransaction(client, Effect.die),
      };
    }),
  },
) {}
