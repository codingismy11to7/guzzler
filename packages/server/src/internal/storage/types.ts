import { ContentType } from "@guzzlerapp/domain/ContentType";
import { MongoError } from "@guzzlerapp/mongodb/Model";
import { Stream } from "effect";

export type StoredFile = Readonly<{
  stream: Stream.Stream<Uint8Array, MongoError>;
  contentType: ContentType;
  fileName: string;
}>;
