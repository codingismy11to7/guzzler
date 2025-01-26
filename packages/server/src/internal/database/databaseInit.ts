import { Mongo } from "@guzzler/mongodb";
import { GridFS } from "@guzzler/mongodb/GridFS";
import { MongoChangeStreams } from "@guzzler/mongodb/MongoChangeStreams";
import {
  addIndex,
  clearCollection,
  dropCollection,
  MongoMigrationHandler,
  noOp,
} from "@guzzler/mongodb/MongoMigrations";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { Effect, Layer, Redacted } from "effect";
import { AppConfig } from "../../AppConfig.js";
import {
  CollectionRegistry,
  CollectionRegistryLive,
} from "./CollectionRegistry.js";

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { sessions, users } = yield* CollectionRegistry;
  const mmh = yield* MongoMigrationHandler;

  return yield* mmh.handleMigrations(
    noOp(),
    noOp(),
    clearCollection(sessions),
    addIndex(
      users,
      { unique: true, name: "username" },
      users.sortBy("username", "asc"),
    ),
    dropCollection("abc"),
    dropCollection("def"),
    clearCollection(sessions),
    noOp(),
    noOp(),
    noOp(),
    noOp(),
  );
}).pipe(Effect.withLogSpan("migrations"));

export const mongoLiveLayers = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { url, dbName, username, password } = yield* AppConfig.mongo;

    return CollectionRegistryLive.pipe(
      Layer.provideMerge(GridFS.Default),
      Layer.provideMerge(MongoChangeStreams.Default),
      Layer.provideMerge(MongoTransactions.Default),
      Layer.provideMerge(
        Mongo.liveLayers(dbName, url, {
          auth: {
            username: Redacted.value(username),
            password: Redacted.value(password),
          },
          directConnection: true,
        }),
      ),
    );
  }),
);
