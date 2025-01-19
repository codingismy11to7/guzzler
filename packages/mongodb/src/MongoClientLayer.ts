import { Context, Effect, Layer } from "effect";
import { MongoClient, MongoClientOptions } from "mongodb";

export class MongoClientLayer extends Context.Tag("MongoClientLayer")<
  MongoClient,
  MongoClient
>() {}

export const make = (
  url: string,
  options?: MongoClientOptions,
): Layer.Layer<MongoClient> =>
  Layer.scoped(
    MongoClientLayer,
    Effect.acquireRelease(
      Effect.sync(() => new MongoClient(url, options)),
      c =>
        Effect.tryPromise(() => c.close()).pipe(
          Effect.catchAllCause(Effect.logWarning),
        ),
    ),
  );
