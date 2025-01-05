import { FancyTypes } from "@guzzler/utils";
import { Data, Schema } from "effect";
import { MongoError as RealMongoError } from "mongodb";
import { AnySchema } from "./MongoCollection.js";

type AsSortEntries<T> = { [K in keyof T]: -1 | 1 };

export type SortParam<SchemaT extends AnySchema> = FancyTypes.ExactlyOne<AsSortEntries<Schema.Schema.Type<SchemaT>>>;
export type SortParams<SchemaT extends AnySchema> = ReadonlyArray<SortParam<SchemaT>>;

export class NotFound extends Data.TaggedError("NotFound") {}
export class Conflict extends Data.TaggedError("Conflict") {}
export class MongoError extends Data.TaggedError("MongoError")<{ underlying: RealMongoError }> {}

const AppStateId = Schema.String.pipe(Schema.brand("AppStateId"));
export const AppStateDocId = AppStateId.make("appState");
export const AppState = Schema.Struct({
  _id: AppStateId.pipe(Schema.optionalWith({ default: () => AppStateDocId, exact: true, nullable: true })),
  migrationVersion: Schema.NonNegativeInt.pipe(Schema.optionalWith({ default: () => 0, exact: true, nullable: true })),
});
