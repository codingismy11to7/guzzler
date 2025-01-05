import { ObjectUtils } from "@guzzler/utils";
import { Document } from "bson";
import { Effect, flow, pipe, Schema } from "effect";
import {
  Collection,
  Db,
  Filter,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  OptionalUnlessRequiredId,
  ReplaceOptions,
  UpdateResult,
  WithId,
  WithoutId,
} from "mongodb";
import { mongoEff } from "./internal/utils.js";
import { Conflict, MongoError, NotFound } from "./Model.js";
import { Model, MongoDatabaseLayer } from "./index.js";

/*
Ok so the type parameters and types get hairy, so let's document.

CName - name of a collection
SchemaT - this says we must be using a Schema for our documents
FieldsT - the type of the fields in the schema
DocSchema<SchemaT> - the final type of the documents
 */

// it must be a Schema
export type AnySchema = Schema.Schema.Any;
// the fields in the document
export type SomeFields = Schema.Struct.Fields;
// a Schema.Struct that represents our document
export type StructSchema<SchemaT extends AnySchema, FieldsT extends SomeFields> = SchemaT & Schema.Struct<FieldsT>;

// this is the type of the document
// eg: our doc is defined as Schema.Struct({a:Schema<X>, b:Schema<Y>})
// this type of the document/DocSchema is {a: X, b: Y}
type DocSchema<SchemaT extends AnySchema> = Schema.Schema.Type<SchemaT>;

export type MongoCollection<CName extends string, SchemaT extends AnySchema, FieldsT extends SomeFields> = Readonly<{
  name: CName;
  schema: StructSchema<SchemaT, FieldsT>;
  connection: Effect.Effect<Collection<DocSchema<SchemaT>>>;
  sortBy: (field: keyof DocSchema<SchemaT>, order: "asc" | "desc") => Model.SortParam<SchemaT>;

  findOneRaw: (
    filter?: Filter<DocSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<WithId<DocSchema<SchemaT>> | null, MongoError>;
  findOne: (
    filter?: Filter<DocSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<WithId<DocSchema<SchemaT>>, NotFound>;

  insertOneRaw: (
    doc: OptionalUnlessRequiredId<DocSchema<SchemaT>>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DocSchema<SchemaT>>, MongoError>;
  insertOne: (
    doc: OptionalUnlessRequiredId<DocSchema<SchemaT>>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DocSchema<SchemaT>>, Conflict>;

  replaceOneRaw: (
    filter: Filter<DocSchema<SchemaT>>,
    replacement: WithoutId<DocSchema<SchemaT>>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DocSchema<SchemaT>> | Document, MongoError>;
  replaceOne: (
    filter: Filter<DocSchema<SchemaT>>,
    replacement: WithoutId<DocSchema<SchemaT>>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DocSchema<SchemaT>> | Document>;

  upsertRaw: (
    filter: Filter<DocSchema<SchemaT>>,
    replacement: WithoutId<DocSchema<SchemaT>>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DocSchema<SchemaT>> | Document, MongoError>;
  upsert: (
    filter: Filter<DocSchema<SchemaT>>,
    replacement: WithoutId<DocSchema<SchemaT>>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DocSchema<SchemaT>> | Document>;
}>;

const make = <CName extends string, SchemaT extends AnySchema, FieldsT extends SomeFields>(
  db: Db,
  collectionName: CName,
  schema: StructSchema<SchemaT, FieldsT>,
): MongoCollection<CName, SchemaT, FieldsT> => {
  type TSchema = Schema.Schema.Type<SchemaT>;

  const connection = Effect.sync(() => db.collection<TSchema>(collectionName));

  const sortBy = (field: keyof TSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<SchemaT>;

  const die = {
    MongoError: (e: MongoError) => Effect.die(e.underlying),
  } as const;

  const findOneRaw = (filter?: Filter<TSchema>, options?: Omit<FindOptions, "timeoutMode">) =>
    pipe(
      connection,
      Effect.andThen(coll =>
        mongoEff(() =>
          options && filter ? coll.findOne(filter, options) : filter ? coll.findOne(filter) : coll.findOne(),
        ),
      ),
    );
  const findOne = flow(
    findOneRaw,
    Effect.andThen(Effect.fromNullable),
    Effect.catchTags({ ...die, NoSuchElementException: () => new NotFound() }),
  );

  const insertOneRaw = (
    doc: OptionalUnlessRequiredId<TSchema>,
    options?: InsertOneOptions,
  ): Effect.Effect<InsertOneResult<TSchema>, MongoError> =>
    pipe(
      connection,
      Effect.andThen(coll => mongoEff(() => coll.insertOne(doc, options))),
    );
  const insertOne = flow(insertOneRaw, Effect.catchTags(die));

  const replaceOneRaw = (
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: ReplaceOptions,
  ): Effect.Effect<UpdateResult<TSchema> | Document, MongoError> =>
    pipe(
      connection,
      Effect.andThen(coll => mongoEff(() => coll.replaceOne(filter, replacement, options))),
    );
  const replaceOne = flow(replaceOneRaw, Effect.catchTags(die));

  const upsertRaw = (
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: Omit<ReplaceOptions, "upsert">,
  ): Effect.Effect<UpdateResult<TSchema> | Document, MongoError> =>
    replaceOneRaw(filter, replacement, { ...options, upsert: true });
  const upsert = flow(upsertRaw, Effect.catchTags(die));

  return {
    name: collectionName,
    schema,
    connection,
    sortBy,
    findOneRaw,
    findOne,
    insertOneRaw,
    insertOne,
    replaceOneRaw,
    replaceOne,
    upsertRaw,
    upsert,
  };
};

export class MongoCollectionLayer extends Effect.Service<MongoCollectionLayer>()("MongoCollectionLayer", {
  accessors: true,
  effect: Effect.gen(function* () {
    const db = yield* MongoDatabaseLayer.MongoDatabaseLayer;

    const RegistryCreator = {
      collection:
        <CName extends string, A extends object, SchemaT extends AnySchema, FieldsT extends SomeFields>(
          collectionName: Exclude<CName, keyof A>,
          schema: StructSchema<SchemaT, FieldsT>,
        ) =>
        (self: A) =>
          ObjectUtils.addField(self, collectionName, make(db, collectionName, schema)),
    };
    const createCollectionRegistry = <T>(f: (creator: typeof RegistryCreator) => T) => f(RegistryCreator);

    return { createCollectionRegistry };
  }),
}) {}
