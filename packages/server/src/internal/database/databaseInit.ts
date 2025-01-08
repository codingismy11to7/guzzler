import { Mongo, MongoMigrations as MM } from "@guzzler/mongodb";
import { Effect, Layer, Redacted } from "effect";
import { AppConfig, ProdMode } from "../../AppConfig.js";
import { CollectionRegistry, CollectionRegistryLive } from "./CollectionRegistry.js";

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { sessions, users } = yield* CollectionRegistry;
  const mmh = yield* MM.MongoMigrationHandler;

  yield* mmh.handleMigrations(
    MM.noOp(),
    MM.noOp(),
    MM.clearCollection(sessions),
    MM.addIndex(users, { unique: true, name: "username" }, users.sortBy("username", "asc")),
    MM.dropCollection("abc"),
    MM.dropCollection("def"),
    MM.clearCollection(sessions),
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
