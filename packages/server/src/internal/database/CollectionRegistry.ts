import { Todo } from "@guzzler/domain/AppApi";
import { Session } from "@guzzler/domain/Session";
import { User } from "@guzzler/domain/User";
import { MongoCollection } from "@guzzler/mongodb";
import { Context, Effect, Layer, pipe } from "effect";

const collections = Effect.gen(function* () {
  const mcl = yield* MongoCollection.MongoCollectionLayer;

  return mcl.createCollectionRegistry(c =>
    pipe({}, c.collection("sessions", Session), c.collection("todos", Todo), c.collection("users", User)),
  );
});

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  Effect.Effect.Success<typeof collections>
>() {}

export const CollectionRegistryLive = Layer.effect(CollectionRegistry, collections);
