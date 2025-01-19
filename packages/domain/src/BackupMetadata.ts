import { Schema } from "effect";
import { PhotoId } from "./Autos.js";
import { ContentType } from "./ContentType.js";

export const BackupMetadata = Schema.Struct({
  version: Schema.Int.pipe(Schema.greaterThan(0)),
  name: Schema.Trim,
  createdOn: Schema.DateFromString.pipe(
    Schema.optionalWith({ default: () => new Date() }),
  ),
  photoTypeMap: Schema.Record({ key: PhotoId, value: ContentType }),
});

export type BackupMetadata = typeof BackupMetadata.Type;

export const make = Schema.decodeSync(BackupMetadata);
export const encode = Schema.encodeSync(BackupMetadata);
