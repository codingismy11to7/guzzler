import { FileSystem, Path } from "@effect/platform";
import { ArchiverError } from "archiver";
import { Data, Effect, Stream } from "effect";
import { gen } from "effect/Effect";
import { flatMap, fromEffect } from "effect/Stream";
import { getZipContents } from "./internal/util/unzip.js";
import { Input, streamToZip } from "./internal/util/zip.js";

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
}) {
  static readonly streamToZip = <E1, E2>(
    input: Stream.Stream<Input<E1>, E2>,
  ): Stream.Stream<Uint8Array, E1 | E2 | ZipError, Zip> =>
    fromEffect(Zip).pipe(flatMap(z => z.streamToZip(input)));
}
