import { HttpApiSchema } from "@effect/platform";
import { Effect, Schema } from "effect";
import { gen } from "effect/Effect";
import { nanoid } from "nanoid";

export class ServerError extends Schema.TaggedError<ServerError>()(
  "ServerError",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 500 }),
) {}

export class RedactedError extends Schema.TaggedError<RedactedError>()(
  "RedactedError",
  {
    id: Schema.String.pipe(Schema.optionalWith({ default: () => nanoid() })),
  },
  HttpApiSchema.annotations({
    status: 500,
    description:
      "This is some problem that happened on the server. To report one of these errors, a unique id is provided for administrator analysis.",
  }),
) {
  static readonly logged = (
    ...message: readonly unknown[]
  ): Effect.Effect<never, RedactedError> =>
    gen(function* () {
      const id = nanoid();

      yield* Effect.logError(...message).pipe(Effect.annotateLogs({ id }));

      return yield* new RedactedError({ id });
    });
}
