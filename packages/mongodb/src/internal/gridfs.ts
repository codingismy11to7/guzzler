import { NodeSink, NodeStream } from "@effect/platform-node";
import { Sink, Stream } from "effect";
import { gen } from "effect/Effect";
import {
  Filter,
  FindOptions,
  GridFSBucket,
  GridFSBucketReadStreamOptions,
  GridFSBucketReadStreamOptionsWithRevision,
  GridFSBucketWriteStreamOptions,
  GridFSFile,
  ObjectId,
} from "mongodb";
import { MongoError } from "../Model.js";
import { mongoEff, RealMongoError } from "./utils.js";

export const _delete =
  (bucket: GridFSBucket) =>
  (
    id: ObjectId,
    options?: {
      timeoutMS: number;
    },
  ) =>
    mongoEff(() => bucket.delete(id, options));

export const find =
  (bucket: GridFSBucket) =>
  (filter?: Filter<GridFSFile>, options?: FindOptions) =>
    gen(function* () {
      const cursor = bucket.find(filter, options);

      return yield* mongoEff(() => cursor.toArray());
    });

export const findAttachments =
  (bucket: GridFSBucket) => (query: Filter<GridFSFile>) =>
    mongoEff(() => bucket.find(query).toArray());

export const openDownloadStream =
  (bucket: GridFSBucket) =>
  (
    id: ObjectId,
    options?: GridFSBucketReadStreamOptions,
  ): Stream.Stream<Uint8Array, MongoError> =>
    NodeStream.fromReadable(
      () => bucket.openDownloadStream(id, options),
      e => new MongoError({ cause: e as RealMongoError }),
    );

export const openDownloadStreamByName =
  (bucket: GridFSBucket) =>
  (
    filename: string,
    options?: GridFSBucketReadStreamOptionsWithRevision,
  ): Stream.Stream<Uint8Array, MongoError> =>
    NodeStream.fromReadable(
      () => bucket.openDownloadStreamByName(filename, options),
      e => new MongoError({ cause: e as RealMongoError }),
    );

export const openUploadSink =
  (bucket: GridFSBucket) =>
  (
    filename: string,
    options?: GridFSBucketWriteStreamOptions,
  ): Sink.Sink<void, Uint8Array, never, MongoError> =>
    NodeSink.fromWritable(
      () => bucket.openUploadStream(filename, options),
      e => new MongoError({ cause: e as RealMongoError }),
    );

export const openUploadSinkWithId =
  (bucket: GridFSBucket) =>
  (
    id: ObjectId,
    filename: string,
    options?: GridFSBucketWriteStreamOptions,
  ): Sink.Sink<void, Uint8Array, never, MongoError> =>
    NodeSink.fromWritable(
      () => bucket.openUploadStreamWithId(id, filename, options),
      e => new MongoError({ cause: e as RealMongoError }),
    );
