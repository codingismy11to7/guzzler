import { Mongo } from "@guzzler/mongodb";
import { MongoCollection, MongoMigrations as MM } from "@guzzler/mongodb";
import { Effect, Layer, pipe, Redacted, Schema } from "effect";
import { AppConfig, ProdMode } from "../AppConfig.js";

const SS = Schema.Struct({
  a: Schema.String,
  b: Schema.Boolean,
});
const SSE = Schema.Struct({
  ...SS.fields,
  c: Schema.Number,
});

export class CollectionRegistryService extends Effect.Service<CollectionRegistryService>()(
  "CollectionRegistryService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const mcl = yield* MongoCollection.MongoCollectionLayer;

      const collections = mcl.createCollectionRegistry(c =>
        pipe({}, c.collection("abc", SS), c.collection("def", SSE)),
      );

      return { collections };
    }),
  },
) {}
export type CollectionRegistry = Effect.Effect.Success<typeof CollectionRegistryService.collections>;

export const runMigrations = Effect.gen(function* () {
  yield* Effect.logInfo("Running migrations...");

  const { abc, def } = yield* CollectionRegistryService.collections;
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

    return CollectionRegistryService.Default.pipe(
      Layer.provideMerge(
        Mongo.liveLayers(dbName, url, {
          auth: { username: Redacted.value(username), password: Redacted.value(password) },
          directConnection: isDevMode,
        }),
      ),
    );
  }),
);
