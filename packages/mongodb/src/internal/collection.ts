import { Document } from "bson";
import { Effect, flow, Option, pipe, Schema } from "effect";
import { andThen, gen } from "effect/Effect";
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
import { MongoTxnCtx } from "./createInTransaction.js";
import { mongoEff } from "./utils.js";

export const make = <CName extends string, SchemaT extends AnySchema>(
  db: Db,
  collectionName: CName,
  schema: SchemaT,
): MongoCollection<CName, SchemaT> => {
  type DbSchema = Schema.Schema.Encoded<SchemaT>;
  type MemSchema = Schema.Schema.Type<SchemaT>;

  const toMismatch = Effect.catchTags({
    ParseError: (p: ParseError) => new SchemaMismatch({ underlying: p }),
  });
  const encode = (d: MemSchema) =>
    Schema.encode(schema)(d).pipe(toMismatch) as Effect.Effect<
      DbSchema,
      SchemaMismatch
    >;
  const decode = (d: unknown) =>
    Schema.decodeUnknown(schema)(d).pipe(toMismatch) as Effect.Effect<
      MemSchema,
      SchemaMismatch
    >;
  const encodePartial = (fields: Partial<MemSchema>) =>
    Schema.encode(Schema.partial(schema))(fields).pipe(
      toMismatch,
    ) as Effect.Effect<Partial<DbSchema>, SchemaMismatch>;

  const coll = db.collection<DbSchema>(collectionName);

  const sortBy = (field: keyof DbSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<MemSchema>;

  const dieMongo = {
    MongoError: (e: MongoError) => Effect.die(e.underlying),
  } as const;
  const dieSchema = {
    SchemaMismatch: (s: SchemaMismatch) => Effect.die(s),
  } as const;
  const dieFromFatal = { ...dieMongo, ...dieSchema } as const;

  const encodeFilter = (filter?: Filter<MemSchema>) =>
    filter ? encodePartial(filter) : Effect.succeed(undefined);

  const txnSession = Effect.serviceOption(MongoTxnCtx).pipe(
    andThen(
      Option.match({ onNone: () => ({}), onSome: s => ({ session: s }) }),
    ),
  );

  const countRaw = (
    filter?: Filter<MemSchema>,
    options?: CountDocumentsOptions,
  ): Effect.Effect<number, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const filt = yield* encodeFilter(filter);
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.countDocuments(filt, { ...options, ...session }),
      );
    });
  const count = flow(countRaw, Effect.catchTags(dieFromFatal));

  const findOneRaw = (
    filter?: Filter<MemSchema>,
    options?: Omit<FindOptions, "timeoutMode">,
  ): Effect.Effect<MemSchema | null, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const filt = yield* encodeFilter(filter);
      const session = yield* txnSession;
      const res = yield* mongoEff(() =>
        coll.findOne(filt ?? {}, { ...options, ...session }),
      );
      return yield* res ? decode(res) : Effect.succeed(null);
    });
  const findOne = (
    filter?: Filter<MemSchema>,
    options?: Omit<FindOptions, "timeoutMode">,
  ): Effect.Effect<MemSchema, NotFound> =>
    pipe(
      findOneRaw(filter, options),
      Effect.andThen(Effect.fromNullable),
      Effect.catchTags({
        ...dieFromFatal,
        NoSuchElementException: () =>
          new NotFound({ method: "findOne", filter }),
      }),
    );

  const toFindResult = (
    c: FindCursor<WithId<DbSchema>>,
  ): FindResult<MemSchema, DbSchema> => {
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
      const filt = yield* encodeFilter(filter);
      const session = yield* txnSession;
      return toFindResult(coll.find(filt ?? {}, { ...options, ...session }));
    });
  const find = flow(findRaw, Effect.catchTags(dieSchema));

  const insertOneRaw = (
    doc: MemSchema,
    options?: InsertOneOptions,
  ): Effect.Effect<InsertOneResult<DbSchema>, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const toIns = yield* encode(doc);
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.insertOne(toIns as OptionalUnlessRequiredId<DbSchema>, {
          ...options,
          ...session,
        }),
      );
    });
  // noinspection SuspiciousTypeOfGuard
  const insertOne = flow(
    insertOneRaw,
    Effect.catchTag("MongoError", e =>
      Effect.fail(
        e instanceof MongoServerError && e.code === 11000
          ? new Conflict({ underlying: e })
          : e,
      ),
    ),
    Effect.catchTags(dieFromFatal),
  );

  const replaceOneRaw = (
    filter: Filter<MemSchema>,
    replacement: MemSchema,
    options?: ReplaceOptions,
  ): Effect.Effect<
    UpdateResult<DbSchema> | Document,
    MongoError | SchemaMismatch
  > =>
    Effect.gen(function* () {
      const filt = yield* encodePartial(filter);
      const toIns = yield* encode(replacement);
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.replaceOne(filt, toIns, { ...options, ...session }),
      );
    });
  const replaceOne = flow(replaceOneRaw, Effect.catchTags(dieFromFatal));

  const updateOneRaw = (
    filter: Filter<DbSchema>,
    update: UpdateFilter<DbSchema> | Document[],
    options?: UpdateOptions,
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError> =>
    gen(function* () {
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.updateOne(filter, update, { ...options, ...session }),
      );
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
  ): Effect.Effect<
    UpdateResult<DbSchema> | Document,
    MongoError | SchemaMismatch
  > => replaceOneRaw(filter, replacement, { ...options, upsert: true });
  const upsert = flow(upsertRaw, Effect.catchTags(dieFromFatal));

  const deleteOneRaw = (
    filter?: Filter<MemSchema>,
    options?: DeleteOptions,
  ): Effect.Effect<DeleteResult, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const filt = yield* encodeFilter(filter);
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.deleteOne(filt, { ...options, ...session }),
      );
    });
  const deleteOne = flow(deleteOneRaw, Effect.catchTags(dieFromFatal));

  const deleteManyRaw = (
    filter?: Filter<MemSchema>,
    options?: DeleteOptions,
  ): Effect.Effect<DeleteResult, MongoError | SchemaMismatch> =>
    Effect.gen(function* () {
      const filt = yield* encodeFilter(filter);
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.deleteMany(filt, { ...options, ...session }),
      );
    });
  const deleteMany = flow(deleteManyRaw, Effect.catchTags(dieFromFatal));

  return {
    name: collectionName,
    schema,
    connection: coll,
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
