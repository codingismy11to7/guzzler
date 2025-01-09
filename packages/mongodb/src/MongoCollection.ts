import { Document } from "bson";
import { Effect, Schema } from "effect";
import {
  Collection,
  CountDocumentsOptions,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  ReplaceOptions,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
} from "mongodb";
import * as internal from "./internal/collection.js";
import { Conflict, MongoError, NotFound, SchemaMismatch } from "./Model.js";
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
/*
// the fields in the document
export type SomeFields = Schema.Struct.Fields;
// a Schema.Struct that represents our document
export type StructSchema<SchemaT extends AnySchema, FieldsT extends SomeFields> = SchemaT &
  Schema.Schema<any, any> &
  Schema.Struct<FieldsT>;
// a Schema.Union<Schema.TaggedStruct[]> that represents our document
export type StructUnionSchema<
  SchemaT extends AnySchema,
  Structs extends ReadonlyArray<Schema.TaggedStruct<any, any>>,
> = SchemaT & Schema.Schema<any, any> & Schema.Union<Structs>;
*/

// this is the type of the document in the db
// eg: our doc is defined as Schema.Struct({a:Schema<X>, b:Schema<Redacted<Y>>})
// this type of the document/DbSchema is {a: X, b: Y}
type DbSchema<SchemaT extends AnySchema> = Schema.Schema.Encoded<SchemaT>;
// this type is the instantiated Schema object, with type {a: X, B: Redacted<Y>}
type MemSchema<SchemaT extends AnySchema> = Schema.Schema.Type<SchemaT>;

export type MongoCollection<CName extends string, SchemaT extends AnySchema> = Readonly<{
  name: CName;
  schema: SchemaT;
  connection: Effect.Effect<Collection<DbSchema<SchemaT>>>;
  sortBy: (field: keyof DbSchema<SchemaT>, order: "asc" | "desc") => Model.SortParam<SchemaT>;

  countRaw: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: CountDocumentsOptions,
  ) => Effect.Effect<number, MongoError | SchemaMismatch>;
  count: (filter?: Filter<MemSchema<SchemaT>>, options?: CountDocumentsOptions) => Effect.Effect<number>;

  findOneRaw: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<MemSchema<SchemaT> | null, MongoError | SchemaMismatch>;
  findOne: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<MemSchema<SchemaT>, NotFound>;

  findRaw: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: FindOptions,
  ) => Effect.Effect<FindResult<MemSchema<SchemaT>, DbSchema<SchemaT>>, SchemaMismatch>;
  find: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: FindOptions,
  ) => Effect.Effect<FindResult<MemSchema<SchemaT>, DbSchema<SchemaT>>>;

  insertOneRaw: (
    doc: MemSchema<SchemaT>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DbSchema<SchemaT>>, MongoError | SchemaMismatch>;
  insertOne: (
    doc: MemSchema<SchemaT>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DbSchema<SchemaT>>, Conflict>;

  replaceOneRaw: (
    filter: Filter<MemSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document, MongoError | SchemaMismatch>;
  replaceOne: (
    filter: Filter<MemSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document>;

  /**
   * Warning: these two functions don't do schema encoding for you
   */
  updateOneRaw: (
    filter: Filter<DbSchema<SchemaT>>,
    update: UpdateFilter<DbSchema<SchemaT>> | Document[],
    options?: UpdateOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>>, MongoError>;
  updateOne: (
    filter: Filter<DbSchema<SchemaT>>,
    update: UpdateFilter<DbSchema<SchemaT>> | Document[],
    options?: UpdateOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>>>;

  setFieldsOneRaw: (
    filter: Filter<MemSchema<SchemaT>>,
    fields: Partial<MemSchema<SchemaT>>,
    options?: UpdateOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>>, MongoError | SchemaMismatch>;
  setFieldsOne: (
    filter: Filter<MemSchema<SchemaT>>,
    fields: Partial<MemSchema<SchemaT>>,
    options?: UpdateOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>>>;

  upsertRaw: (
    filter: Filter<MemSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document, MongoError | SchemaMismatch>;
  upsert: (
    filter: Filter<MemSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document>;

  deleteOneRaw: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: DeleteOptions,
  ) => Effect.Effect<DeleteResult, MongoError | SchemaMismatch>;
  deleteOne: (filter?: Filter<MemSchema<SchemaT>>, options?: DeleteOptions) => Effect.Effect<DeleteResult>;

  deleteManyRaw: (
    filter?: Filter<MemSchema<SchemaT>>,
    options?: DeleteOptions,
  ) => Effect.Effect<DeleteResult, MongoError | SchemaMismatch>;
  deleteMany: (filter?: Filter<MemSchema<SchemaT>>, options?: DeleteOptions) => Effect.Effect<DeleteResult>;
}>;

// TODO lots more to add
export type FindResult<MemSchema, DbSchema> = Readonly<{
  raw: FindCursor<WithId<DbSchema>>;
  toArrayRaw: Effect.Effect<readonly MemSchema[], MongoError | SchemaMismatch>;
  toArray: Effect.Effect<readonly MemSchema[]>;
}>;

export class MongoCollectionLayer extends Effect.Service<MongoCollectionLayer>()("MongoCollectionLayer", {
  accessors: true,
  effect: Effect.gen(function* () {
    const db = yield* MongoDatabaseLayer.MongoDatabaseLayer;

    const RegistryCreator = {
      collection: <CName extends string, SchemaT extends AnySchema>(
        collectionName: CName,
        schema: SchemaT,
      ): MongoCollection<CName, SchemaT> => internal.make(db, collectionName, schema),
    };
    const createCollectionRegistry = <T>(f: (creator: typeof RegistryCreator) => T) => f(RegistryCreator);

    return { createCollectionRegistry };
  }),
}) {}
