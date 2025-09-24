import { Document } from "bson";
import { Effect, flow, Option, pipe, Schema, Stream } from "effect";
import { andThen, catchTags, dieMessage, forEach, gen } from "effect/Effect";
import { ParseError } from "effect/ParseResult";
import {
  BulkWriteOptions,
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  DeleteResult,
  Filter,
  FindCursor,
  FindOptions,
  InsertManyResult,
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
import {
  DocumentConflict,
  MongoError,
  DocumentNotFound,
  SchemaMismatch,
} from "../Model.js";
import { AnySchema, FindResult, MongoCollection } from "../MongoCollection.js";
import { MongoCrypto } from "../MongoCrypto.js";
import { MongoTxnCtx } from "./createInTransaction.js";
import { mongoEff, RealMongoError } from "./utils.js";

export type Options = Readonly<{
  encrypted?: Readonly<{ plainTextFields: readonly string[] }> | undefined;
}>;

export type InternalMongoColl<
  CName extends string,
  SchemaT extends AnySchema,
> = MongoCollection<CName, SchemaT> &
  Readonly<{ unencrypted: () => InternalMongoColl<CName, SchemaT> }>;

export const make = <CName extends string, SchemaT extends AnySchema>(
  db: Db,
  collectionName: CName,
  schema: SchemaT,
  options: Options,
  cryptoOpt: Option.Option<MongoCrypto>,
): InternalMongoColl<CName, SchemaT> => {
  type DbSchema = Schema.Schema.Encoded<SchemaT>;
  type MemSchema = Schema.Schema.Type<SchemaT>;

  const unencrypted = () =>
    make(
      db,
      collectionName,
      schema,
      { ...options, encrypted: undefined },
      cryptoOpt,
    );

  const crypto = pipe(
    cryptoOpt,
    catchTags({
      NoSuchElementException: () =>
        dieMessage(
          "An encrypted collection is configured, but no MongoCrypto layer was provided to MongoCollectionLayer",
        ),
    }),
  );

  const encrypt = (d: DbSchema): Effect.Effect<DbSchema> =>
    gen(function* () {
      if (!options.encrypted) return d;

      const mc = yield* crypto;

      // doesn't really return a DbSchema but we'll pretend
      const ret: DbSchema = yield* mc.encrypt(
        d,
        ...options.encrypted.plainTextFields,
      );

      return ret;
    });

  const decrypt = (d: unknown): Effect.Effect<unknown, ParseError> =>
    gen(function* () {
      if (!options.encrypted) return d;

      const mc = yield* crypto;

      return yield* mc.decrypt(d as Record<string, unknown>);
    });

  const toMismatch = {
    ParseError: (cause: ParseError) => new SchemaMismatch({ cause }),
  } as const;

  const doEncode = (u: unknown) =>
    Schema.encode(schema)(u) as Effect.Effect<DbSchema, ParseError>;
  const encode = (d: MemSchema): Effect.Effect<DbSchema, SchemaMismatch> =>
    gen(function* () {
      const db: DbSchema = yield* doEncode(d).pipe(catchTags(toMismatch));

      return yield* encrypt(db);
    });

  const doDecode = (d: unknown) =>
    Schema.decodeUnknown(schema)(d) as Effect.Effect<MemSchema, ParseError>;
  const decode = (d: unknown): Effect.Effect<MemSchema, SchemaMismatch> =>
    gen(function* () {
      const decrypted = yield* decrypt(d);

      return yield* doDecode(decrypted);
    }).pipe(catchTags(toMismatch));

  const encodePartial = (fields: Partial<MemSchema>) =>
    Schema.encode(Schema.partial(schema))(fields).pipe(
      catchTags(toMismatch),
    ) as Effect.Effect<Partial<DbSchema>, SchemaMismatch>;

  const coll = db.collection<DbSchema>(collectionName);

  const sortBy = (field: keyof DbSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<MemSchema>;

  const dieMongo = {
    MongoError: (e: MongoError) => Effect.die(e.cause),
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
  ): Effect.Effect<MemSchema, DocumentNotFound> =>
    pipe(
      findOneRaw(filter, options),
      Effect.andThen(Effect.fromNullable),
      Effect.catchTags({
        ...dieFromFatal,
        NoSuchElementException: () =>
          new DocumentNotFound({ method: "findOne", filter }),
      }),
    );

  const toFindResult = (
    c: FindCursor<WithId<DbSchema>>,
  ): FindResult<MemSchema, DbSchema> => {
    const toArrayRaw = mongoEff(() => c.toArray()).pipe(
      Effect.andThen(Effect.forEach(decode, { concurrency: "unbounded" })),
    );
    const toArray = toArrayRaw.pipe(Effect.catchTags(dieFromFatal));

    const streamRaw = Stream.fromAsyncIterable(
      c.stream(),
      e => new MongoError({ cause: e as RealMongoError }),
    ).pipe(Stream.mapEffect(decode));
    const stream = streamRaw.pipe(Stream.catchTags(dieFromFatal));

    return { raw: c, toArrayRaw, toArray, streamRaw, stream };
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
          ? new DocumentConflict({ cause: e })
          : e,
      ),
    ),
    Effect.catchTags(dieFromFatal),
  );

  const insertManyRaw = (
    docs: readonly MemSchema[],
    options?: BulkWriteOptions,
  ): Effect.Effect<InsertManyResult<DbSchema>, MongoError | SchemaMismatch> =>
    gen(function* () {
      const toIns = yield* forEach(docs, encode, { concurrency: "unbounded" });
      const session = yield* txnSession;
      return yield* mongoEff(() =>
        coll.insertMany(
          toIns as ReadonlyArray<OptionalUnlessRequiredId<DbSchema>>,
          { ...options, ...session },
        ),
      );
    });
  const insertMany = flow(insertManyRaw, catchTags(dieFromFatal));

  const replaceOneRaw = (
    filter: Filter<MemSchema>,
    replacement: MemSchema,
    options?: ReplaceOptions,
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError | SchemaMismatch> =>
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
  ): Effect.Effect<UpdateResult<DbSchema>, MongoError | SchemaMismatch> =>
    replaceOneRaw(filter, replacement, { ...options, upsert: true });
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
    unencrypted,
    sortBy,
    countRaw,
    count,
    findOneRaw,
    findOne,
    findRaw,
    find,
    insertOneRaw,
    insertOne,
    insertManyRaw,
    insertMany,
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
