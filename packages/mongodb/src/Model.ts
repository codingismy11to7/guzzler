import { FancyTypes } from "@guzzlerapp/utils";
import { Data, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import { MongoError as RealMongoError } from "mongodb";
import { AnySchema } from "./MongoCollection.js";

type AsSortEntries<T> = { [K in keyof T]: -1 | 1 };

export type SortParam<SchemaT extends AnySchema> = FancyTypes.ExactlyOne<
  AsSortEntries<Schema.Schema.Type<SchemaT>>
>;
export type SortParams<SchemaT extends AnySchema> = ReadonlyArray<
  SortParam<SchemaT>
>;

export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  "DocumentNotFound",
  { method: Schema.String, filter: Schema.Object.pipe(Schema.optional) },
) {
  get message() {
    return `DocumentNotFound: ${this.method}${this.filter ? ` (filter=${JSON.stringify(this.filter)})` : ""}`;
  }
}
export class DocumentConflict extends Schema.TaggedError<DocumentConflict>()(
  "DocumentConflict",
  {},
) {}
export class SchemaMismatch extends Data.TaggedError("SchemaMismatch")<{
  cause: ParseError;
}> {
  get message() {
    return this.cause.message;
  }
}
export class MongoError extends Data.TaggedError("MongoError")<{
  cause: RealMongoError;
}> {}

export const AppStateId = Schema.Literal("AppStateId");
export type AppStateId = typeof AppStateId.Type;
export const AppStateDocId = "AppStateId";
export const AppState = Schema.Struct({
  id: Schema.propertySignature(AppStateId).pipe(Schema.fromKey("_id")),
  migrationVersion: Schema.NonNegativeInt,
});
export type AppState = typeof AppState.Type;
