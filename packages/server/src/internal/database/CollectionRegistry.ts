import { Todo } from "@guzzler/domain/AppApi";
import { Session } from "@guzzler/domain/Session";
import { User } from "@guzzler/domain/User";
import { MongoCollectionLayer } from "@guzzler/mongodb/MongoCollection";
import { Context, Effect, Layer, pipe } from "effect";

const collections = pipe(
  MongoCollectionLayer,
  Effect.andThen(mcl =>
    mcl.createCollectionRegistry(c => ({
      sessions: c.collection("sessions", Session),
      todos: c.collection("todos", Todo),
      users: c.collection("users", User),
    })),
  ),
);

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  Effect.Effect.Success<typeof collections>
>() {}

export const CollectionRegistryLive = Layer.effect(CollectionRegistry, collections);
