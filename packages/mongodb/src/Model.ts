import { FancyTypes } from "@guzzler/utils";
import { Data, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import { MongoError as RealMongoError } from "mongodb";
import { AnySchema } from "./MongoCollection.js";

type AsSortEntries<T> = { [K in keyof T]: -1 | 1 };

export type SortParam<SchemaT extends AnySchema> = FancyTypes.ExactlyOne<AsSortEntries<Schema.Schema.Type<SchemaT>>>;
export type SortParams<SchemaT extends AnySchema> = ReadonlyArray<SortParam<SchemaT>>;

export class NotFound extends Data.TaggedError("NotFound") {}
export class Conflict extends Data.TaggedError("Conflict")<{ underlying: MongoError }> {}
export class SchemaMismatch extends Data.TaggedError("SchemaMismatch")<{ underlying: ParseError }> {
  get message() {
    return this.underlying.message;
  }
}
export class MongoError extends Data.TaggedError("MongoError")<{ underlying: RealMongoError }> {}

export const AppStateId = Schema.Literal("AppStateId");
export type AppStateId = typeof AppStateId.Type;
export const AppStateDocId = "AppStateId";
export const AppState = Schema.Struct({
  id: Schema.propertySignature(AppStateId).pipe(Schema.fromKey("_id")),
  migrationVersion: Schema.NonNegativeInt,
});
export type AppState = typeof AppState.Type;
