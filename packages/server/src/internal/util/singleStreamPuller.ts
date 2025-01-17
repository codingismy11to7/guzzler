import { Chunk, Effect, Stream } from "effect";

export const singleStreamPuller = <A, E, R>(s: Stream.Stream<A, E, R>) =>
  Effect.gen(function* () {
    const pullChunk = yield* Stream.toPull(s);

    let buffered = Chunk.empty<A>();

    const bufferNextChunk = Effect.gen(function* () {
      if (Chunk.isEmpty(buffered)) buffered = yield* pullChunk;
      if (!Chunk.isNonEmpty(buffered)) throw new Error("precondition failed");
      return buffered;
    });

    const pullNext = Effect.gen(function* () {
      const next = yield* bufferNextChunk;

      const first = Chunk.headNonEmpty(next);
      buffered = Chunk.drop(buffered, 1);
      return first;
    });
    const peekNext = bufferNextChunk.pipe(Effect.andThen(Chunk.headNonEmpty));

    return { pullNext, peekNext };
  });
