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
  UpdateResult,
  WithId,
} from "mongodb";
import { Model } from "../index.js";
import { MongoError, NotFound } from "../Model.js";
import { AnySchema, FindResult, MongoCollection, SomeFields, StructSchema } from "../MongoCollection.js";
import { mongoEff } from "./utils.js";

export const make = <CName extends string, SchemaT extends AnySchema, FieldsT extends SomeFields>(
  db: Db,
  collectionName: CName,
  schema: StructSchema<SchemaT, FieldsT>,
): MongoCollection<CName, SchemaT, FieldsT> => {
  type DbSchema = Schema.Schema.Encoded<SchemaT>;
  type MemSchema = Schema.Schema.Type<SchemaT>;

  const encode = (d: MemSchema) => Schema.encode(schema)(d) as Effect.Effect<DbSchema, ParseError>;
  const decode = (d: unknown) => Schema.decodeUnknown(schema)(d) as Effect.Effect<MemSchema, ParseError>;

  const connection = Effect.sync(() => db.collection<DbSchema>(collectionName));

  const sortBy = (field: keyof DbSchema, order: "asc" | "desc") =>
    ({ [field]: order === "asc" ? 1 : -1 }) as Model.SortParam<MemSchema>;

  const dieMongo = {
    MongoError: (e: MongoError) => Effect.die(e.underlying),
  } as const;
  const dieSchema = {
    ParseError: (p: ParseError) => Effect.die(p),
  } as const;
  const die = { ...dieMongo, ...dieSchema } as const;

  const findOneRaw = (
    filter?: Filter<DbSchema>,
    options?: Omit<FindOptions, "timeoutMode">,
  ): Effect.Effect<MemSchema | null, MongoError | ParseError> =>
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
    Effect.catchTags({ ...die, NoSuchElementException: () => new NotFound() }),
  );

  const toFindResult = (c: FindCursor<WithId<DbSchema>>): FindResult<MemSchema, DbSchema> => {
    const toArrayRaw = mongoEff(() => c.toArray()).pipe(
      Effect.andThen(Effect.forEach(decode, { concurrency: "unbounded" })),
    );
    const toArray = toArrayRaw.pipe(Effect.catchTags(die));

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
  ): Effect.Effect<InsertOneResult<DbSchema>, MongoError | ParseError> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const toIns = yield* encode(doc);
      return yield* mongoEff(() => coll.insertOne(toIns as OptionalUnlessRequiredId<DbSchema>, options));
    });
  const insertOne = flow(insertOneRaw, Effect.catchTags(die));

  const replaceOneRaw = (
    filter: Filter<DbSchema>,
    replacement: MemSchema,
    options?: ReplaceOptions,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | ParseError> =>
    Effect.gen(function* () {
      const coll = yield* connection;
      const toIns = yield* encode(replacement);
      return yield* mongoEff(() => coll.replaceOne(filter, toIns, options));
    });
  const replaceOne = flow(replaceOneRaw, Effect.catchTags(die));

  const upsertRaw = (
    filter: Filter<DbSchema>,
    replacement: MemSchema,
    options?: Omit<ReplaceOptions, "upsert">,
  ): Effect.Effect<UpdateResult<DbSchema> | Document, MongoError | ParseError> =>
    replaceOneRaw(filter, replacement, { ...options, upsert: true });
  const upsert = flow(upsertRaw, Effect.catchTags(die));

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
    upsertRaw,
    upsert,
    deleteOneRaw,
    deleteOne,
    deleteManyRaw,
    deleteMany,
  };
};
