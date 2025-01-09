import { Mongo } from "@guzzler/mongodb";
import {
  addIndex,
  clearCollection,
  dropCollection,
  MongoMigrationHandler,
  noOp,
} from "@guzzler/mongodb/MongoMigrations";
import { Effect, Layer, Redacted } from "effect";
import { AppConfig, ProdMode } from "../../AppConfig.js";
import { CollectionRegistry, CollectionRegistryLive } from "./CollectionRegistry.js";

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { sessions, users } = yield* CollectionRegistry;
  const mmh = yield* MongoMigrationHandler;

  yield* mmh.handleMigrations(
    noOp(),
    noOp(),
    clearCollection(sessions),
    addIndex(users, { unique: true, name: "username" }, users.sortBy("username", "asc")),
    dropCollection("abc"),
    dropCollection("def"),
    clearCollection(sessions),
  );
}).pipe(Effect.withLogSpan("migrations"));

export const mongoLiveLayers = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { url, dbName, username, password } = yield* AppConfig.mongo;
    const { isDevMode } = yield* ProdMode;

    return CollectionRegistryLive.pipe(
      Layer.provideMerge(
        Mongo.liveLayers(dbName, url, {
          auth: { username: Redacted.value(username), password: Redacted.value(password) },
          // TODO this keeps us from connecting when we change to prod mode locally,
          //  can we always set it to true? do change streams still work? to test
          directConnection: isDevMode,
        }),
      ),
    );
  }),
);
