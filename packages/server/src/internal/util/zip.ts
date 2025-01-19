import { NodeStream } from "@effect/platform-node";
import archiver from "archiver";
import {
  Cause,
  Effect,
  Either,
  Exit,
  Fiber,
  pipe,
  Runtime,
  Stream,
} from "effect";
import { gen } from "effect/Effect";
import { Writable } from "stream";
import { ZipError } from "../../Zip.js";

/** @internal */
export type Input<E = never> = Readonly<{
  metadataPath: string;
  fileData: Stream.Stream<Uint8Array, E>;
}>;

export const streamToZip =
  (runtime: Runtime.Runtime<never>) =>
  <E1, E2>(
    input: Stream.Stream<Input<E1>, E2>,
  ): Stream.Stream<Uint8Array, E1 | E2 | ZipError> =>
    Stream.async(emit => {
      const runFork = Runtime.runFork(runtime);
      const runPromiseExit = Runtime.runPromiseExit(runtime);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("error", cause => emit.fail(new ZipError({ cause })));
      archive.on("close", () =>
        runPromiseExit(Fiber.join(fib)).then(exit =>
          Exit.isFailure(exit)
            ? pipe(
                Cause.failureOrCause(exit.cause),
                Either.match({
                  onLeft: e => emit.fail(e),
                  onRight: c => emit.halt(c),
                }),
              )
            : Promise.resolve(),
        ),
      );

      archive.pipe(
        new Writable({
          write: (
            chunk: Buffer,
            _: BufferEncoding,
            callback: (error?: Error | null) => void,
          ) => {
            emit.single(chunk).then(() => callback());
          },
          final: (callback: (error?: Error | null) => void) => {
            emit.end().then(() => callback(), callback);
          },
        }),
      );

      const fib = pipe(
        input,
        Stream.mapEffect(e =>
          gen(function* () {
            archive.append(yield* NodeStream.toReadable(e.fileData), {
              name: e.metadataPath,
            });
          }),
        ),
        Stream.ensuring(Effect.promise(() => archive.finalize())),
        Stream.runDrain,
        runFork,
      );
    });
