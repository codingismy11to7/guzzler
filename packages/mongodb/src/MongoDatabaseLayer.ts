import { Context, Effect, Layer, pipe } from "effect";
import type { Db, DbOptions, MongoClient } from "mongodb";
import { MongoClientLayer } from "./MongoClientLayer.js";

export class MongoDatabaseLayer extends Context.Tag("MongoDatabaseLayer")<Db, Db>() {}

export const make = (dbName: string, dbOptions?: DbOptions): Layer.Layer<Db, never, MongoClient> =>
  Layer.effect(
    MongoDatabaseLayer,
    pipe(
      MongoClientLayer,
      Effect.andThen(client => client.db(dbName, dbOptions)),
    ),
  );
