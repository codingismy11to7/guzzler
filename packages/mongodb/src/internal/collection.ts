import { Document } from "bson";
import { Effect, flow, pipe, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import {
  Db,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  OptionalUnlessRequiredId,
  ReplaceOptions,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
} from "mongodb";
import { Model } from "../index.js";
import { MongoError, NotFound, SchemaMismatch } from "../Model.js";
import { AnySchema, FindResult, MongoCollection } from "../MongoCollection.js";
import { mongoEff } from "./utils.js";

export const make = <CName extends string, SchemaT extends AnySchema>(
  db: Db,
  collectionName: CName,
  schema: SchemaT,
): MongoCollection<CName, SchemaT> => {
  type DbSchema = Schema.Schema.Encoded<SchemaT>;
  type MemSchema = Schema.Schema.Type<SchemaT>;

  const toMismatch = Effect.catchTags({ ParseError: (p: ParseError) => new SchemaMismatch({ underlying: p }) });
  const encode = (d: MemSchema) => Schema.encode(schema)(d).pipe(toMismatch) as Effect.Effect<DbSchema, SchemaMismatch>;
  const decode = (d: unknown) =>
    Schema.decodeUnknown(schema)(d).pipe(toMismatch) as Effect.Effect<MemSchema, SchemaMismatch>;

  const connection = Effect.sync(() => db.collection<DbSchema>(collectionName));

  const sortBy = (field: keyof DbSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<MemSchema>;

  const dieMongo = { MongoError: (e: MongoError) => Effect.die(e.underlying) } as const;
  const dieSchema = { SchemaMismatch: (s: SchemaMismatch) => Effect.die(s) } as const;
  const dieFromFatal = { ...dieMongo, ...dieSchema } as const;

  const findOneRaw = (
    filter?: Filter<DbSchema>,
    options?: Omit<FindOptions, "timeoutMode">,
  ): Effect.Effect<MemSchema | null, MongoError | SchemaMismatch> =>
    pipe(
      connection,
      Effect.andThen(coll =>
        mongoEff(() =>
          options && filter ? coll.findOne(filter, options) : filter ? coll.findOne(filter) : coll.findOne(),
        ),
      ),
      Effect.andThen(d => (d ? decode(d) : Effect.succeed(null))),
    );
  const findOne = flow(
    findOneRaw,
    Effect.andThen(Effect.fromNullable),
    Effect.catchTags({ ...dieFromFatal, NoSuchElementException: () => new NotFound() }),
  );

  const toFindResult = (c: FindCursor<WithId<DbSchema>>): FindResult<MemSchema, DbSchema> => {
    const toArrayRaw = mongoEff(() => c.toArray()).pipe(
      Effect.andThen(Effect.forEach(decode, { concurrency: "unbounded" })),
    );
    const toArray = toArrayRaw.pipe(Effect.catchTags(dieFromFatal));

    return { raw: c, toArrayRaw, toArray };
  };
  const find = (filter?: Filter<DbSchema>, options?: FindOptions): Effect.Effect<FindResult<MemSchema, DbSchema>> =>
    pipe(
      connection,
      Effect.andThen(coll => (filter ? coll.find(filter, options) : coll.find())),
      Effect.andThen(toFindResult),
    );

  const insertOneRaw = (
    doc: MemSchema,
    options?: InsertOneOptions,
  ): Effect.Effect<InsertOneResult<DbSchema>, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const toIns = yield* encode(doc);
      return yield* mongoEff(() => coll.insertOne(toIns as OptionalUnlessRequiredId<DbSchema>, options));
    });
  const insertOne = flow(insertOneRaw, Effect.catchTags(dieFromFatal));

  const replaceOneRaw = (
    filter: Filter<DbSchema>,
    replacement: MemSchema,
    options?: ReplaceOptions,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const toIns = yield* encode(replacement);
      return yield* mongoEff(() => coll.replaceOne(filter, toIns, options));
    });
  const replaceOne = flow(replaceOneRaw, Effect.catchTags(dieFromFatal));

  const updateOneRaw = (
    filter: Filter<DbSchema>,
    update: UpdateFilter<DbSchema> | Document[],
    options?: UpdateOptions,
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError> =>
    Effect.gen(function* () {
      const coll = yield* connection;

      return yield* mongoEff(() => coll.updateOne(filter, update, options));
    });
  const updateOne = flow(updateOneRaw, Effect.catchTags(dieMongo));

  const setFieldsOneRaw = (
    filter: Filter<DbSchema>,
    fields: Partial<MemSchema>,
    options?: UpdateOptions,
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError | SchemaMismatch> =>
    pipe(
      Schema.encode(Schema.partial(schema))(fields).pipe(toMismatch) as Effect.Effect<
        Partial<DbSchema>,
        SchemaMismatch
      >,
      Effect.map($set => ({ $set }) as UpdateFilter<DbSchema>),
      Effect.andThen(upd => updateOneRaw(filter, upd, options)),
    );
  const setFieldsOne = flow(setFieldsOneRaw, Effect.catchTags(dieFromFatal));

  const upsertRaw = (
    filter: Filter<DbSchema>,
    replacement: MemSchema,
    options?: Omit<ReplaceOptions, "upsert">,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | SchemaMismatch> =>
    replaceOneRaw(filter, replacement, { ...options, upsert: true });
  const upsert = flow(upsertRaw, Effect.catchTags(dieFromFatal));

  const deleteOneRaw = (filter?: Filter<DbSchema>, options?: DeleteOptions): Effect.Effect<DeleteResult, MongoError> =>
    pipe(
      connection,
      Effect.andThen(coll => mongoEff(() => coll.deleteOne(filter, options))),
    );
  const deleteOne = flow(deleteOneRaw, Effect.catchTags(dieMongo));

  const deleteManyRaw = (filter?: Filter<DbSchema>, options?: DeleteOptions): Effect.Effect<DeleteResult, MongoError> =>
    pipe(
      connection,
      Effect.andThen(coll => mongoEff(() => coll.deleteMany(filter, options))),
    );
  const deleteMany = flow(deleteManyRaw, Effect.catchTags(dieMongo));

  return {
    name: collectionName,
    schema,
    connection,
    sortBy,
    findOneRaw,
    findOne,
    find,
    insertOneRaw,
    insertOne,
    replaceOneRaw,
    replaceOne,
    updateOneRaw,
    updateOne,
    setFieldsOneRaw,
    setFieldsOne,
    upsertRaw,
    upsert,
    deleteOneRaw,
    deleteOne,
    deleteManyRaw,
    deleteMany,
  };
};
