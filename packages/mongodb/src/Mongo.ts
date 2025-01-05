import { Layer, pipe } from "effect";
import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { MongoCollectionLayer } from "./MongoCollection.js";
import { MongoMigrationHandler } from "./MongoMigrations.js";
import { MongoClientLayer, MongoDatabaseLayer } from "./index.js";

export const liveLayers = (
  dbName: string,
  dbUrl: string,
  clientOptions: MongoClientOptions,
): Layer.Layer<MongoClient | Db | MongoCollectionLayer | MongoMigrationHandler> =>
  pipe(
    MongoMigrationHandler.Default,
    Layer.provideMerge(MongoCollectionLayer.Default),
    Layer.provideMerge(MongoDatabaseLayer.make(dbName)),
    Layer.provideMerge(MongoClientLayer.make(dbUrl, clientOptions)),
  );
