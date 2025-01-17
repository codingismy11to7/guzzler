import { Effect } from "effect";
import { gen } from "effect/Effect";
import { GridFSBucket } from "mongodb";
import * as internal from "./internal/gridfs.js";
import { MongoDatabaseLayer } from "./MongoDatabaseLayer.js";

export class GridFS extends Effect.Service<GridFS>()("GridFS", {
  accessors: true,
  effect: gen(function* () {
    const db = yield* MongoDatabaseLayer;

    const bucket = new GridFSBucket(db);

    return {
      delete: internal._delete(bucket),
      find: internal.find(bucket),
      findAttachments: internal.findAttachments(bucket),
      openDownloadStream: internal.openDownloadStream(bucket),
      openDownloadStreamByName: internal.openDownloadStreamByName(bucket),
      openUploadSink: internal.openUploadSink(bucket),
      openUploadSinkWithId: internal.openUploadSinkWithId(bucket),
    };
  }),
}) {}
