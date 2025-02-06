import { GridFS } from "@guzzlerapp/mongodb/GridFS";
import { DocumentNotFound } from "@guzzlerapp/mongodb/Model";
import { ObjectId } from "bson";
import { Array, Effect, Option } from "effect";
import { gen } from "effect/Effect";

export class FileFetcher extends Effect.Service<FileFetcher>()("FileFetcher", {
  accessors: true,
  effect: gen(function* () {
    const { openDownloadStream, find: findFile } = yield* GridFS;

    const getFileById = (_id: ObjectId) =>
      gen(function* () {
        const fileOpt = Array.head(yield* findFile({ _id }));

        if (Option.isNone(fileOpt))
          return yield* new DocumentNotFound({
            method: "FileFetcher.getFileById",
            filter: { _id },
          });

        const file = fileOpt.value;

        const stream = openDownloadStream(_id);

        return {
          stream,
          contentType: file.metadata?.mimeType ?? "application/octet-stream",
          fileName: file.filename,
        };
      });

    return { getFileById };
  }),
}) {}
