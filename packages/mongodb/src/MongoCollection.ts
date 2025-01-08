import { ObjectUtils } from "@guzzler/utils";
import { Document } from "bson";
import { Effect, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import {
  Collection,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  ReplaceOptions,
  UpdateResult,
  WithId,
} from "mongodb";
import * as internal from "./internal/collection.js";
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
export type StructSchema<SchemaT extends AnySchema, FieldsT extends SomeFields> = SchemaT &
  Schema.Struct<FieldsT> &
  Schema.Schema<any, any>;

// this is the type of the document in the db
// eg: our doc is defined as Schema.Struct({a:Schema<X>, b:Schema<Redacted<Y>>})
// this type of the document/DbSchema is {a: X, b: Y}
type DbSchema<SchemaT extends AnySchema> = Schema.Schema.Encoded<SchemaT>;
// this type is the instantiated Schema object, with type {a: X, B: Redacted<Y>}
type MemSchema<SchemaT extends AnySchema> = Schema.Schema.Type<SchemaT>;

export type MongoCollection<CName extends string, SchemaT extends AnySchema, FieldsT extends SomeFields> = Readonly<{
  name: CName;
  schema: StructSchema<SchemaT, FieldsT>;
  connection: Effect.Effect<Collection<DbSchema<SchemaT>>>;
  sortBy: (field: keyof DbSchema<SchemaT>, order: "asc" | "desc") => Model.SortParam<SchemaT>;

  findOneRaw: (
    filter?: Filter<DbSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<MemSchema<SchemaT> | null, MongoError | ParseError>;
  findOne: (
    filter?: Filter<DbSchema<SchemaT>>,
    options?: Omit<FindOptions, "timeoutMode">,
  ) => Effect.Effect<MemSchema<SchemaT>, NotFound>;

  find: (
    filter?: Filter<DbSchema<SchemaT>>,
    options?: FindOptions,
  ) => Effect.Effect<FindResult<MemSchema<SchemaT>, DbSchema<SchemaT>>>;

  insertOneRaw: (
    doc: MemSchema<SchemaT>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DbSchema<SchemaT>>, MongoError | ParseError>;
  insertOne: (
    doc: MemSchema<SchemaT>,
    options?: InsertOneOptions,
  ) => Effect.Effect<InsertOneResult<DbSchema<SchemaT>>, Conflict>;

  replaceOneRaw: (
    filter: Filter<DbSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document, MongoError | ParseError>;
  replaceOne: (
    filter: Filter<DbSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: ReplaceOptions,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document>;

  upsertRaw: (
    filter: Filter<DbSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document, MongoError | ParseError>;
  upsert: (
    filter: Filter<DbSchema<SchemaT>>,
    replacement: MemSchema<SchemaT>,
    options?: Omit<ReplaceOptions, "upsert">,
  ) => Effect.Effect<UpdateResult<DbSchema<SchemaT>> | Document>;

  deleteOneRaw: (
    filter?: Filter<DbSchema<SchemaT>>,
    options?: DeleteOptions,
  ) => Effect.Effect<DeleteResult, MongoError>;
  deleteOne: (filter?: Filter<DbSchema<SchemaT>>, options?: DeleteOptions) => Effect.Effect<DeleteResult>;

  deleteManyRaw: (
    filter?: Filter<DbSchema<SchemaT>>,
    options?: DeleteOptions,
  ) => Effect.Effect<DeleteResult, MongoError>;
  deleteMany: (filter?: Filter<DbSchema<SchemaT>>, options?: DeleteOptions) => Effect.Effect<DeleteResult>;
}>;

// TODO lots more to add
export type FindResult<MemSchema, DbSchema> = Readonly<{
  raw: FindCursor<WithId<DbSchema>>;
  toArrayRaw: Effect.Effect<readonly MemSchema[], MongoError | ParseError>;
  toArray: Effect.Effect<readonly MemSchema[]>;
}>;

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
          ObjectUtils.addField(self, collectionName, internal.make(db, collectionName, schema)),
    };
    const createCollectionRegistry = <T>(f: (creator: typeof RegistryCreator) => T) => f(RegistryCreator);

    return { createCollectionRegistry };
  }),
}) {}
