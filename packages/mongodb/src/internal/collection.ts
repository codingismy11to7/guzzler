import { Document } from "bson";
import { Effect, flow, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import {
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  MongoServerError,
  OptionalUnlessRequiredId,
  ReplaceOptions,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
} from "mongodb";
import { Model } from "../index.js";
import { Conflict, MongoError, NotFound, SchemaMismatch } from "../Model.js";
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
  const encodePartial = (fields: Partial<MemSchema>) =>
    Schema.encode(Schema.partial(schema))(fields).pipe(toMismatch) as Effect.Effect<Partial<DbSchema>, SchemaMismatch>;

  const connection = Effect.sync(() => db.collection<DbSchema>(collectionName));

  const sortBy = (field: keyof DbSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<MemSchema>;

  const dieMongo = { MongoError: (e: MongoError) => Effect.die(e.underlying) } as const;
  const dieSchema = { SchemaMismatch: (s: SchemaMismatch) => Effect.die(s) } as const;
  const dieFromFatal = { ...dieMongo, ...dieSchema } as const;

  const encodeFilter = (filter?: Filter<MemSchema>) => (filter ? encodePartial(filter) : Effect.succeed(undefined));

  const countRaw = (
    filter?: Filter<MemSchema>,
    options?: CountDocumentsOptions,
  ): Effect.Effect<number, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodeFilter(filter);
      return yield* mongoEff(() => coll.countDocuments(filt, options));
    });
  const count = flow(countRaw, Effect.catchTags(dieFromFatal));

  const findOneRaw = (
    filter?: Filter<MemSchema>,
    options?: Omit<FindOptions, "timeoutMode">,
  ): Effect.Effect<MemSchema | null, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodeFilter(filter);
      const res = yield* mongoEff(() =>
        filt && options ? coll.findOne(filt, options) : filt ? coll.findOne(filt) : coll.findOne(),
      );
      return yield* res ? decode(res) : Effect.succeed(null);
    });
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
  const findRaw = (
    filter?: Filter<MemSchema>,
    options?: FindOptions,
  ): Effect.Effect<FindResult<MemSchema, DbSchema>, SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodeFilter(filter);
      return toFindResult(filt ? coll.find(filt, options) : coll.find());
    });
  const find = flow(findRaw, Effect.catchTags(dieSchema));

  const insertOneRaw = (
    doc: MemSchema,
    options?: InsertOneOptions,
  ): Effect.Effect<InsertOneResult<DbSchema>, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const toIns = yield* encode(doc);
      return yield* mongoEff(() => coll.insertOne(toIns as OptionalUnlessRequiredId<DbSchema>, options));
    });
  // noinspection SuspiciousTypeOfGuard
  const insertOne = flow(
    insertOneRaw,
    Effect.catchTag("MongoError", e =>
      Effect.fail(e instanceof MongoServerError && e.code === 11000 ? new Conflict({ underlying: e }) : e),
    ),
    Effect.catchTags(dieFromFatal),
  );

  const replaceOneRaw = (
    filter: Filter<MemSchema>,
    replacement: MemSchema,
    options?: ReplaceOptions,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodePartial(filter);
      const toIns = yield* encode(replacement);
      return yield* mongoEff(() => coll.replaceOne(filt, toIns, options));
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
    filter: Filter<MemSchema>,
    fields: Partial<MemSchema>,
    options?: UpdateOptions,
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const filt = yield* encodePartial(filter);
      const $set = yield* encodePartial(fields);
      return yield* updateOneRaw(filt, { $set }, options);
    });
  const setFieldsOne = flow(setFieldsOneRaw, Effect.catchTags(dieFromFatal));

  const upsertRaw = (
    filter: Filter<MemSchema>,
    replacement: MemSchema,
    options?: Omit<ReplaceOptions, "upsert">,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | SchemaMismatch> =>
    replaceOneRaw(filter, replacement, { ...options, upsert: true });
  const upsert = flow(upsertRaw, Effect.catchTags(dieFromFatal));

  const deleteOneRaw = (
    filter?: Filter<MemSchema>,
    options?: DeleteOptions,
  ): Effect.Effect<DeleteResult, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodeFilter(filter);
      return yield* mongoEff(() => coll.deleteOne(filt, options));
    });
  const deleteOne = flow(deleteOneRaw, Effect.catchTags(dieFromFatal));

  const deleteManyRaw = (
    filter?: Filter<MemSchema>,
    options?: DeleteOptions,
  ): Effect.Effect<DeleteResult, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const filt = yield* encodeFilter(filter);
      return yield* mongoEff(() => coll.deleteMany(filt, options));
    });
  const deleteMany = flow(deleteManyRaw, Effect.catchTags(dieFromFatal));

  return {
    name: collectionName,
    schema,
    connection,
    sortBy,
    countRaw,
    count,
    findOneRaw,
    findOne,
    findRaw,
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
