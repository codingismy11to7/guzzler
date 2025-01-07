import { Session } from "@guzzler/domain/Session";
import { Mongo, MongoCollection, MongoMigrations as MM } from "@guzzler/mongodb";
import { Context, Effect, Layer, pipe, Redacted, Schema } from "effect";
import { AppConfig, ProdMode } from "../AppConfig.js";

const SS = Schema.Struct({
  a: Schema.String,
  b: Schema.Boolean,
});
const SSE = Schema.Struct({
  ...SS.fields,
  c: Schema.Number,
});

const collections = Effect.gen(function* () {
  const mcl = yield* MongoCollection.MongoCollectionLayer;

  return mcl.createCollectionRegistry(c =>
    pipe({}, c.collection("sessions", Session), c.collection("abc", SS), c.collection("def", SSE)),
  );
});

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  Effect.Effect.Success<typeof collections>
>() {}

export const CollectionRegistryLive = Layer.effect(CollectionRegistry, collections);

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
