import { Todo } from "@guzzler/domain/AppApi";
import { Session } from "@guzzler/domain/Session";
import { MongoCollection } from "@guzzler/mongodb";
import { Context, Effect, Layer, pipe, Schema } from "effect";

const SS = Schema.Struct({
  a: Schema.String,
  b: Schema.Boolean,
});
const SSE = Schema.Struct({
  ...SS.fields,
  c: Schema.Number,
});

const collections = Effect.gen(function* () {
  const mcl = yield* MongoCollection.MongoCollectionLayer;

  return mcl.createCollectionRegistry(c =>
    pipe(
      {},
      c.collection("sessions", Session),
      c.collection("todos", Todo),
      c.collection("abc", SS),
      c.collection("def", SSE),
    ),
  );
});

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  Effect.Effect.Success<typeof collections>
>() {}

export const CollectionRegistryLive = Layer.effect(CollectionRegistry, collections);
