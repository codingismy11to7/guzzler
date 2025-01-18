import { FileSystem, Path } from "@effect/platform";
import { effectify } from "@effect/platform/Effectify";
import { PlatformError, SystemError } from "@effect/platform/Error";
import { NodeStream } from "@effect/platform-node";
import { Chunk, Data, Effect, pipe, Schema, Stream } from "effect";
import { andThen, catchTags, ensuring, gen, mapError } from "effect/Effect";
import { Scope } from "effect/Scope";
import { Readable } from "stream";
import yauzl, { Entry, ZipFile as YauzlZipFile } from "yauzl";

export class ZipError extends Data.TaggedError("ZipError")<{ cause: Error }> {}

const open = effectify(yauzl.open);

const openStream = (z: YauzlZipFile, entry: Entry) =>
  Effect.async<Readable, ZipError>(cb =>
    z.openReadStream(entry, (err, stream) => cb(err ? new ZipError({ cause: err }) : Effect.succeed(stream))),
  );

export class ZipFile extends Schema.Class<ZipFile>("ZipFile")({ isDirectory: Schema.Boolean, fileName: Schema.Trim }) {}

type ZipEntry = Data.TaggedEnum<{
  File: Readonly<{
    entry: Entry;
    contents: Stream.Stream<Uint8Array, ZipError>;
    doneProcessing: Effect.Effect<void>;
  }>;
  Directory: Readonly<{ entry: Entry }>;
}>;
const ZipEntry = Data.taggedEnum<ZipEntry>();

const zipStream = (zipFilePath: string): Stream.Stream<ZipEntry, ZipError> =>
  Stream.unwrap(
    gen(function* () {
      const zipFile = yield* open(zipFilePath, { autoClose: true, lazyEntries: true }).pipe(
        mapError(cause => new ZipError({ cause })),
      );

      return Stream.async<ZipEntry, ZipError>(emit => {
        zipFile.on("close", () => emit.end());
        zipFile.on("entry", (entry: Entry) => {
          // skip directories
          if (entry.fileName.endsWith("/")) emit.single(ZipEntry.Directory({ entry })).then(() => zipFile.readEntry());
          else {
            const stream = pipe(
              openStream(zipFile, entry),
              andThen(r =>
                NodeStream.fromReadable(
                  () => r,
                  e => new ZipError({ cause: e as Error }),
                ),
              ),
              Stream.unwrap,
            );

            void emit.single(
              ZipEntry.File({ entry, doneProcessing: Effect.sync(() => zipFile.readEntry()), contents: stream }),
            );
          }
        });

        zipFile.readEntry();
      });
    }),
  );

export class Zip extends Effect.Service<Zip>()("Zip", {
  accessors: true,
  effect: gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const getZipContents = (zipFilePath: string): Effect.Effect<readonly ZipFile[], ZipError | SystemError, Scope> =>
      gen(function* () {
        const tmpDir = yield* fs.makeTempDirectoryScoped({ prefix: "guzzler" });

        const handleEntry =
          (isDirectory: boolean, entry: Entry) =>
          <E>(
            withFileName: (fileName: string) => Effect.Effect<unknown, E>,
          ): Effect.Effect<ZipFile, PlatformError | E> =>
            gen(function* () {
              const relFileName = entry.fileName;
              const fileName = path.resolve(tmpDir, relFileName);

              yield* withFileName(fileName);

              yield* fs.utimes(fileName, entry.getLastModDate(), entry.getLastModDate());

              return new ZipFile({ isDirectory, fileName });
            });

        return yield* pipe(
          zipStream(zipFilePath),
          Stream.mapEffect(
            ZipEntry.$match({
              Directory: ({ entry }) =>
                handleEntry(true, entry)(fileName => fs.makeDirectory(fileName, { recursive: true })),

              File: ({ entry, contents, doneProcessing }) =>
                handleEntry(
                  false,
                  entry,
                )(fileName =>
                  gen(function* () {
                    // just in case they didn't store a directory entry earlier
                    yield* fs.makeDirectory(path.resolve(fileName, ".."), { recursive: true });
                    yield* pipe(contents, Stream.run(fs.sink(fileName)));
                  }),
                ).pipe(ensuring(doneProcessing)),
            }),
          ),
          Stream.runCollect,
          andThen(Chunk.toArray),
        );
      }).pipe(catchTags({ BadArgument: Effect.die }));

    return {
      getZipContents,
    };
  }),
}) {}