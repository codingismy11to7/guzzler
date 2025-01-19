import { FileSystem, Path } from "@effect/platform";
import { ArchiverError } from "archiver";
import { Data, Effect } from "effect";
import { gen } from "effect/Effect";
import { getZipContents } from "./internal/util/unzip.js";
import { streamToZip } from "./internal/util/zip.js";

export class UnzipError extends Data.TaggedError("UnzipError")<{
  cause: Error;
}> {}
export class ZipError extends Data.TaggedError("ZipError")<{
  cause: ArchiverError;
}> {}

export class Zip extends Effect.Service<Zip>()("Zip", {
  accessors: true,
  effect: gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const runtime = yield* Effect.runtime();

    return {
      getZipContents: getZipContents(fs, path),
      streamToZip: streamToZip(runtime),
    };
  }),
}) {}
