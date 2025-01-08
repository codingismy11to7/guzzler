import { Chunk, Effect, Match, pipe, Schema } from "effect";
import { CreateIndexesOptions, DropCollectionOptions } from "mongodb";
import { mongoEff } from "./internal/utils.js";
import { AppState } from "./Model.js";
import { AnySchema, SomeFields } from "./MongoCollection.js";
import { Model, MongoCollection, MongoDatabaseLayer } from "./index.js";

const AppStateDbName = "appState";

type BaseMigration<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
> = Readonly<{ collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT, Structs> }>;

type NoOp = Readonly<{ _tag: "NoOp" }>;

type AddIndex<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
> = BaseMigration<CollName, SchemaT, FieldsT, Structs> &
  Readonly<{ _tag: "AddIndex"; indexSpec: Model.SortParams<SchemaT>; options: CreateIndexesOptions }>;

type ClearCollection<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
> = BaseMigration<CollName, SchemaT, FieldsT, Structs> & Readonly<{ _tag: "ClearCollection" }>;

type DropCollection = Readonly<{ _tag: "DropCollection"; collectionName: string; options?: DropCollectionOptions }>;

type Migration<
  CollName extends string,
  SchemaT extends AnySchema,
  FieldsT extends SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
> =
  | NoOp
  | AddIndex<CollName, SchemaT, FieldsT, Structs>
  | DropCollection
  | ClearCollection<CollName, SchemaT, FieldsT, Structs>;

export class MongoMigrationHandler extends Effect.Service<MongoMigrationHandler>()("MongoMigrationHandler", {
  accessors: true,
  effect: Effect.gen(function* () {
    const db = yield* MongoDatabaseLayer.MongoDatabaseLayer;
    const mcl = yield* MongoCollection.MongoCollectionLayer;
    const appStateColl = mcl.createCollectionRegistry(c => c.collection(AppStateDbName, AppState)({})).appState;

    const addIndex = ({ options, collection, indexSpec }: AddIndex<any, any, any, any>) =>
      Effect.gen(function* () {
        const { unique, name } = options;

        yield* Effect.logInfo(
          `Adding ${unique ? "" : "non-"}unique index${name ? ` named '${name}'` : ""} to ${collection.name} on field(s) ${indexSpec
            .map(p => JSON.stringify(p))
            .map(s => `'${s}'`)
            .join(", ")}`,
        );

        const coll = yield* collection.connection;

        yield* mongoEff(() => coll.createIndex(indexSpec, options));
      });

    const dropCollection = ({ collectionName, options }: DropCollection) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Dropping collection '${collectionName}'`);

        yield* mongoEff(() => db.dropCollection(collectionName, options));
      });

    const clearCollection = ({ collection }: ClearCollection<any, any, any, any>) =>
      pipe(
        Effect.logInfo(`Deleting documents from ${collection.name}`),
        Effect.andThen(collection.connection),
        Effect.andThen(c => c.deleteMany()),
        Effect.andThen(r => Effect.logInfo(` - deleted ${r.deletedCount}`)),
      );

    const handleMigration = (mig: Migration<any, any, any, any>) =>
      Match.value(mig).pipe(
        Match.tag("NoOp", () => Effect.void),
        Match.tag("AddIndex", addIndex),
        Match.tag("DropCollection", dropCollection),
        Match.tag("ClearCollection", clearCollection),
        Match.exhaustive,
      );

    const handleMigrations = (...migrations: ReadonlyArray<Migration<any, any, any, any>>) =>
      Effect.gen(function* () {
        const appState = yield* appStateColl
          .findOne({ _id: Model.AppStateDocId })
          .pipe(Effect.catchTag("NotFound", () => Effect.succeed(AppState.make())));

        yield* Effect.logInfo(`Current db migration version is ${appState.migrationVersion}`);

        const outstanding = Chunk.unsafeFromArray(migrations).pipe(Chunk.drop(appState.migrationVersion));

        if (Chunk.isEmpty(outstanding)) yield* Effect.logInfo("No migrations to run");
        else {
          yield* Effect.forEach(outstanding, handleMigration, { discard: true });

          const newState = { ...appState, migrationVersion: migrations.length };
          yield* Effect.logInfo(`New db migration version is ${newState.migrationVersion}`);

          yield* Effect.logInfo("Saving app state...");
          yield* appStateColl.upsert({ _id: Model.AppStateDocId }, newState);
        }

        yield* Effect.logInfo("Complete");
      });

    return { handleMigrations };
  }),
}) {}

/**
 * To be used for removed migrations
 */
export const noOp = (): NoOp => ({ _tag: "NoOp" });

export const addIndex = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT, Structs>,
  options: CreateIndexesOptions,
  initial: Model.SortParam<SchemaT>,
  ...fields: Model.SortParams<SchemaT>
): Migration<any, any, any, any> => {
  // TODO got something going on here with variance that needs to get fixed
  //  to remove casts and the anys
  const x: AddIndex<CollName, SchemaT, FieldsT, Structs> = {
    collection,
    _tag: "AddIndex",
    options,
    indexSpec: [initial, ...fields],
  };
  return x as unknown as AddIndex<any, any, any, any>;
};

export const dropCollection = (collectionName: string, options?: DropCollectionOptions): DropCollection => ({
  _tag: "DropCollection",
  collectionName,
  ...(options ? { options } : {}),
});

export const clearCollection = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT, Structs>,
): Migration<any, any, any, any> => {
  const x: ClearCollection<CollName, SchemaT, FieldsT, Structs> = { collection, _tag: "ClearCollection" };
  return x as unknown as ClearCollection<any, any, any, any>;
};
