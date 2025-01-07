import { Mongo, MongoMigrations as MM } from "@guzzler/mongodb";
import { Effect, Layer, Redacted } from "effect";
import { AppConfig, ProdMode } from "../../AppConfig.js";
import { CollectionRegistry, CollectionRegistryLive } from "./CollectionRegistry.js";

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { abc, def } = yield* CollectionRegistry;
  const mmh = yield* MM.MongoMigrationHandler;

  yield* mmh.handleMigrations(
    MM.addIndex(abc, { unique: true }, abc.sortBy("a", "asc")),
    MM.addIndex(def, { name: "coolidx" }, def.sortBy("c", "desc"), def.sortBy("b", "desc")),
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
          directConnection: isDevMode,
        }),
      ),
    );
  }),
);
