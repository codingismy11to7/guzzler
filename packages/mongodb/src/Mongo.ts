import { Layer, ParseResult, pipe, Schema } from "effect";
import { Db, MongoClient, MongoClientOptions, ObjectId } from "mongodb";
import { MongoCollectionLayer } from "./MongoCollection.js";
import { MongoMigrationHandler } from "./MongoMigrations.js";
import { MongoClientLayer, MongoDatabaseLayer } from "./index.js";

export const liveLayers = (
  dbName: string,
  dbUrl: string,
  clientOptions: MongoClientOptions,
): Layer.Layer<
  MongoClient | Db | MongoCollectionLayer | MongoMigrationHandler
> =>
  pipe(
    MongoMigrationHandler.Default,
    Layer.provideMerge(MongoCollectionLayer.Default),
    Layer.provideMerge(
      MongoDatabaseLayer.make(dbName, { ignoreUndefined: true }),
    ),
    Layer.provideMerge(MongoClientLayer.make(dbUrl, clientOptions)),
  );

export const ObjectIdFromSelf = Schema.instanceOf(ObjectId);
const ObjectIdFromHexString = Schema.Trimmed.pipe(
  Schema.transformOrFail(ObjectIdFromSelf, {
    encode: input => ParseResult.succeed(input.toHexString()),
    decode: (input, _, ast) =>
      ObjectId.isValid(input)
        ? ParseResult.succeed(ObjectId.createFromHexString(input))
        : ParseResult.fail(
            new ParseResult.Type(ast, input, "Not a valid ObjectId hex string"),
          ),
  }),
);
export const makeObjectIdFromHexString = Schema.decodeSync(
  ObjectIdFromHexString,
);

export const randomObjectId = () => new ObjectId();
