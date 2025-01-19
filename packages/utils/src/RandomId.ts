import { Effect } from "effect";
import { monotonicFactory } from "ulid";

export class RandomId extends Effect.Service<RandomId>()("RandomId", {
  accessors: true,
  sync: () => {
    const ulid = monotonicFactory();
    const randomId = (seedTime?: number): Effect.Effect<string> =>
      Effect.sync(() => ulid(seedTime));
    const randomIdSync = (seedTime?: number): string => ulid(seedTime);

    return { randomId, randomIdSync };
  },
}) {}
