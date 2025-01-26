import { Chunk, Effect, Match, pipe, Stream } from "effect";
import { gen, logInfo } from "effect/Effect";
import { CreateIndexesOptions, DropCollectionOptions } from "mongodb";
import * as internalCollection from "./internal/collection.js";
import { mongoEff } from "./internal/utils.js";
import { AppState, AppStateDocId, SortParam, SortParams } from "./Model.js";
import { AnySchema } from "./MongoCollection.js";
import { MongoCollection, MongoDatabaseLayer } from "./index.js";

/**
 * Optional code for dealing with migrations
 */

const AppStateDbName = "appState";

type BaseMigration<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
> = Readonly<{
  collection: MongoCollection.MongoCollection<CollName, SchemaT>;
}>;

type NoOp = Readonly<{ _tag: "NoOp" }>;

type AddIndex<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
> = BaseMigration<CollName, SchemaT> &
  Readonly<{
    _tag: "AddIndex";
    indexSpec: SortParams<SchemaT>;
    options: CreateIndexesOptions;
  }>;

type ClearCollection<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
> = BaseMigration<CollName, SchemaT> & Readonly<{ _tag: "ClearCollection" }>;

type DropCollection = Readonly<{
  _tag: "DropCollection";
  collectionName: string;
  options?: DropCollectionOptions;
}>;

type EncryptCollection<
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
> = BaseMigration<CollName, SchemaT> & Readonly<{ _tag: "EncryptCollection" }>;

type Migration<
  CollName extends string,
  SchemaT extends AnySchema = AnySchema,
> =
  | NoOp
  | AddIndex<CollName, SchemaT>
  | DropCollection
  | EncryptCollection<CollName, SchemaT>
  | ClearCollection<CollName, SchemaT>;

export class MongoMigrationHandler extends Effect.Service<MongoMigrationHandler>()(
  "MongoMigrationHandler",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const db = yield* MongoDatabaseLayer.MongoDatabaseLayer;
      const mcl = yield* MongoCollection.MongoCollectionLayer;
      const appStateColl = mcl.createCollectionRegistry(c => ({
        [AppStateDbName]: c.collection(AppStateDbName, AppState),
      })).appState;

      const addIndex = ({
        options,
        collection,
        indexSpec,
      }: AddIndex<any, AnySchema>) =>
        Effect.gen(function* () {
          const { unique, name } = options;

          yield* Effect.logInfo(
            `Adding ${unique ? "" : "non-"}unique index${name ? ` named '${name}'` : ""} to ${collection.name} on field(s) ${indexSpec
              .map(p => JSON.stringify(p))
              .map(s => `'${s}'`)
              .join(", ")}`,
          );

          yield* mongoEff(() =>
            collection.connection.createIndex(indexSpec, options),
          );
        });

      const dropCollection = ({ collectionName, options }: DropCollection) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Dropping collection '${collectionName}'`);

          yield* mongoEff(() => db.dropCollection(collectionName, options));
        });

      const clearCollection = ({
        collection,
      }: ClearCollection<any, AnySchema>) =>
        pipe(
          Effect.logInfo(`Deleting documents from ${collection.name}`),
          Effect.andThen(collection.connection),
          Effect.andThen(c => c.deleteMany()),
          Effect.andThen(r => Effect.logInfo(` - deleted ${r.deletedCount}`)),
        );

      const encryptCollection = ({
        collection,
      }: EncryptCollection<any, AnySchema>) =>
        gen(function* () {
          yield* logInfo(`Encrypting collection ${collection.name}`);

          const oldColl = (
            collection as internalCollection.InternalMongoColl<any, AnySchema>
          ).unencrypted();

          const cursor = yield* oldColl.find();

          yield* pipe(
            cursor.stream,
            Stream.runForEach(d => collection.upsert({ _id: d._id }, d)),
          );
        });

      const handleMigration = Match.type<Migration<any>>().pipe(
        Match.tagsExhaustive({
          NoOp: () => Effect.void,
          AddIndex: addIndex,
          DropCollection: dropCollection,
          ClearCollection: clearCollection,
          EncryptCollection: encryptCollection,
        }),
      );

      const handleMigrations = (...migrations: ReadonlyArray<Migration<any>>) =>
        Effect.gen(function* () {
          const appState = yield* appStateColl
            .findOne({ id: AppStateDocId })
            .pipe(
              Effect.catchTag("DocumentNotFound", () =>
                Effect.succeed(
                  AppState.make({ id: AppStateDocId, migrationVersion: 0 }),
                ),
              ),
            );

          yield* Effect.logInfo(
            `Current db migration version is ${appState.migrationVersion}`,
          );

          const outstanding = Chunk.unsafeFromArray(migrations).pipe(
            Chunk.drop(appState.migrationVersion),
          );

          if (Chunk.isEmpty(outstanding))
            yield* Effect.logInfo("No migrations to run");
          else {
            yield* Effect.forEach(outstanding, handleMigration, {
              discard: true,
            });

            const newState = {
              ...appState,
              migrationVersion: migrations.length,
            };
            yield* Effect.logInfo(
              `New db migration version is ${newState.migrationVersion}`,
            );

            yield* Effect.logInfo("Saving app state...");
            yield* appStateColl.upsert({ id: AppStateDocId }, newState);
          }

          yield* Effect.logInfo("Complete");

          return migrations.length;
        });

      return { handleMigrations };
    }),
  },
) {}

/**
 * To be used for removed migrations
 */
export const noOp = (): NoOp => ({ _tag: "NoOp" });

export const addIndex = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT>,
  options: CreateIndexesOptions,
  initial: SortParam<SchemaT>,
  ...fields: SortParams<SchemaT>
): Migration<CollName> => {
  const x: AddIndex<CollName, SchemaT> = {
    collection,
    _tag: "AddIndex",
    options,
    indexSpec: [initial, ...fields],
  };
  return x as Migration<CollName>;
};

export const dropCollection = (
  collectionName: string,
  options?: DropCollectionOptions,
): DropCollection => ({
  _tag: "DropCollection",
  collectionName,
  ...(options ? { options } : {}),
});

export const encryptCollection = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT>,
): Migration<CollName> => {
  const x: EncryptCollection<CollName, SchemaT> = {
    collection,
    _tag: "EncryptCollection",
  };
  return x as Migration<CollName>;
};

export const clearCollection = <
  CollName extends string,
  SchemaT extends MongoCollection.AnySchema,
>(
  collection: MongoCollection.MongoCollection<CollName, SchemaT>,
): Migration<CollName> => {
  const x: ClearCollection<CollName, SchemaT> = {
    collection,
    _tag: "ClearCollection",
  };
  return x as Migration<CollName>;
};
