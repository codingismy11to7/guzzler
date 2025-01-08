import { Chunk, Effect, Match, pipe } from "effect";
import { CreateIndexesOptions } from "mongodb";
import { mongoEff } from "./internal/utils.js";
import { AppState } from "./Model.js";
import { AnySchema, SomeFields } from "./MongoCollection.js";
import { Model, MongoCollection } from "./index.js";

const AppStateDbName = "appState";

type BaseMigration<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
> = Readonly<{ collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT> }>;

type AddIndex<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
> = BaseMigration<CollName, SchemaT, FieldsT> &
  Readonly<{ _tag: "AddIndex"; indexSpec: Model.SortParams<SchemaT>; options: CreateIndexesOptions }>;

type ClearCollection<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
> = BaseMigration<CollName, SchemaT, FieldsT> & Readonly<{ _tag: "ClearCollection" }>;

type Migration<CollName extends string, SchemaT extends AnySchema, FieldsT extends SomeFields> =
  | AddIndex<CollName, SchemaT, FieldsT>
  | ClearCollection<CollName, SchemaT, FieldsT>;

export class MongoMigrationHandler extends Effect.Service<MongoMigrationHandler>()("MongoMigrationHandler", {
  accessors: true,
  effect: Effect.gen(function* () {
    const mcl = yield* MongoCollection.MongoCollectionLayer;
    const appStateColl = mcl.createCollectionRegistry(c => c.collection(AppStateDbName, Model.AppState)({})).appState;

    const addIndex = ({ options, collection, indexSpec }: AddIndex<any, any, any>) =>
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

    const clearCollection = ({ collection }: ClearCollection<any, any, any>) =>
      pipe(
        Effect.logInfo(`Deleting documents from ${collection.name}`),
        Effect.andThen(collection.connection),
        Effect.andThen(c => c.deleteMany()),
        Effect.andThen(r => Effect.logInfo(` - deleted ${r.deletedCount}`)),
      );

    const handleMigration = (mig: Migration<any, any, any>) =>
      Match.value(mig).pipe(
        Match.tag("AddIndex", addIndex),
        Match.tag("ClearCollection", clearCollection),
        Match.exhaustive,
      );

    const handleMigrations = (...migrations: ReadonlyArray<Migration<any, any, any>>) =>
      Effect.gen(function* () {
        const appState = yield* appStateColl
          .findOne({ _id: Model.AppStateDocId })
          .pipe(Effect.catchTag("NotFound", () => Effect.succeed(AppState.make())));

        yield* Effect.logInfo(`Current db migration version is ${appState.migrationVersion}`);

        const outstanding = Chunk.unsafeFromArray(migrations).pipe(Chunk.drop(appState.migrationVersion));

        if (Chunk.isEmpty(outstanding)) yield* Effect.logInfo("No migrations to run");
        else {
          yield* Effect.forEach(outstanding, handleMigration, { discard: true });

          yield* Effect.logInfo("Saving app state...");

          yield* appStateColl.upsert(
            { _id: Model.AppStateDocId },
            { ...appState, migrationVersion: migrations.length },
          );
        }

        yield* Effect.logInfo("Complete");
      });

    return { handleMigrations };
  }),
}) {}

export const addIndex = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT>,
  options: CreateIndexesOptions,
  initial: Model.SortParam<SchemaT>,
  ...fields: Model.SortParams<SchemaT>
): Migration<any, any, any> => {
  // TODO got something going on here with variance that needs to get fixed
  //  to remove casts and the anys
  const x: AddIndex<CollName, SchemaT, FieldsT> = {
    collection,
    _tag: "AddIndex",
    options,
    indexSpec: [initial, ...fields],
  };
  return x as unknown as AddIndex<any, any, any>;
};

export const clearCollection = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
  FieldsT extends MongoCollection.SomeFields,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT, FieldsT>,
): Migration<any, any, any> => {
  const x: ClearCollection<CollName, SchemaT, FieldsT> = { collection, _tag: "ClearCollection" };
  return x as unknown as ClearCollection<any, any, any>;
};
