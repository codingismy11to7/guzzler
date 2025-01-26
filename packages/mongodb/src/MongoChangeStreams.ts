import { Document } from "bson";
import { Effect, pipe, PubSub, Ref, Runtime, Stream } from "effect";
import { gen } from "effect/Effect";
import {
  ChangeStream,
  ChangeStreamDocument,
  ChangeStreamOptions,
} from "mongodb";
import { RealMongoError } from "./internal/utils.js";
import { MongoError } from "./Model.js";
import { MongoDatabaseLayer } from "./MongoDatabaseLayer.js";

export class MongoChangeStreams extends Effect.Service<MongoChangeStreams>()(
  "MongoChangeStreams",
  {
    accessors: true,
    effect: gen(function* () {
      const db = yield* MongoDatabaseLayer;

      const subscriberAddedToSharedStream = yield* Ref.make(false);
      const sharedStream = yield* PubSub.bounded<ChangeStreamDocument>(4);

      const watchRaw = <
        TSchema extends Document = Document,
        TChange extends Document = ChangeStreamDocument<TSchema>,
      >(
        pipeline?: Document[],
        options?: ChangeStreamOptions,
      ): Readonly<{
        stream: Stream.Stream<TChange, MongoError>;
        changeStream: ChangeStream<TSchema, TChange>;
      }> => {
        const changeStream = db.watch<TSchema, TChange>(pipeline, options);
        const stream = pipe(
          Stream.fromAsyncIterable(
            changeStream,
            e => new MongoError({ cause: e as RealMongoError }),
          ),
        );

        return { stream, changeStream };
      };
      const watch = <
        TSchema extends Document = Document,
        TChange extends Document = ChangeStreamDocument<TSchema>,
      >(
        pipeline?: Document[],
        options?: ChangeStreamOptions,
      ): Readonly<{
        stream: Stream.Stream<TChange>;
        changeStream: ChangeStream<TSchema, TChange>;
      }> => {
        const { stream, ...rest } = watchRaw<TSchema, TChange>(
          pipeline,
          options,
        );

        return { stream: stream.pipe(Stream.orDie), ...rest };
      };

      const watchSharedStream = gen(function* () {
        yield* Effect.logDebug("adding watcher to shared stream");

        const wasStarted = yield* Ref.getAndUpdate(
          subscriberAddedToSharedStream,
          () => true,
        );
        if (!wasStarted) {
          yield* Effect.logInfo("Starting shared database change stream");

          pipe(
            watch().stream,
            Stream.ensuring(Ref.set(subscriberAddedToSharedStream, false)),
            Stream.runForEachChunk(es => PubSub.publishAll(sharedStream, es)),
            Runtime.runFork(yield* Effect.runtime()),
          );
        }

        return yield* PubSub.subscribe(sharedStream);
      });

      return { watchRaw, watch, watchSharedStream };
    }),
  },
) {}
