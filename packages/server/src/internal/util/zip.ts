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

type Input<E, R> = Readonly<{
  metadataPath: string;
  fileData: Stream.Stream<Uint8Array, E, R>;
}>;

export const streamToZip =
  <E1, R1, E2, R2>(runtime: Runtime.Runtime<R1 | R2>) =>
  (
    input: Stream.Stream<Input<E1, R1>, E2, R2>,
  ): Stream.Stream<Uint8Array, E1 | E2 | ZipError, R1 | R2> =>
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
