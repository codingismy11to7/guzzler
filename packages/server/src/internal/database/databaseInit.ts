import { Mongo } from "@guzzlerapp/mongodb";
import { GridFS } from "@guzzlerapp/mongodb/GridFS";
import { MongoChangeStreams } from "@guzzlerapp/mongodb/MongoChangeStreams";
import { MongoCrypto, MongoCryptoKey } from "@guzzlerapp/mongodb/MongoCrypto";
import {
  addIndex,
  clearCollection,
  dropCollection,
  MongoMigrationHandler,
  noOp,
} from "@guzzlerapp/mongodb/MongoMigrations";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { Effect, Layer, Redacted } from "effect";
import { AppConfig } from "../../AppConfig.js";
import {
  CollectionRegistry,
  CollectionRegistryLive,
} from "./CollectionRegistry.js";

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { sessions, users, eventRecords, fillupRecords } =
    yield* CollectionRegistry;
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
    clearCollection(sessions),
    addIndex(eventRecords, { name: "username" }, { "_id.username": 1 }),
    addIndex(fillupRecords, { name: "username" }, { "_id.username": 1 }),
  );
}).pipe(Effect.withLogSpan("migrations"));

export const mongoLiveLayers = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { url, dbName, username, password, encryptionKey } =
      yield* AppConfig.mongo;

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
      Layer.provideMerge(
        MongoCrypto.Default.pipe(
          Layer.provide(MongoCryptoKey.make(Redacted.value(encryptionKey))),
        ),
      ),
    );
  }),
);
