import { HttpApiSchema } from "@effect/platform";
import { RandomId } from "@guzzlerapp/utils";
import { Effect, Schema } from "effect";
import { gen } from "effect/Effect";

export class BadGateway extends HttpApiSchema.EmptyError<BadGateway>()({
  tag: "BadGateway",
  status: 502,
}) {}

export class GatewayTimeout extends HttpApiSchema.EmptyError<GatewayTimeout>()({
  tag: "GatewayTimeout",
  status: 504,
}) {}

export class ServerError extends Schema.TaggedError<ServerError>()(
  "ServerError",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 500 }),
) {}

export class RedactedError extends Schema.TaggedError<RedactedError>()(
  "RedactedError",
  { id: Schema.String },
  HttpApiSchema.annotations({
    status: 500,
    description:
      "This is some problem that happened on the server. To report one of these errors, a unique id is provided for administrator analysis.",
  }),
) {
  static readonly logged = (
    ...message: readonly unknown[]
  ): Effect.Effect<never, RedactedError, RandomId.RandomId> =>
    gen(function* () {
      const rand = yield* RandomId.RandomId;
      return yield* RedactedError.provideLogged(rand)(...message);
    });

  static readonly provideLogged =
    (randomId: RandomId.RandomId) =>
    (...message: readonly unknown[]): Effect.Effect<never, RedactedError> =>
      gen(function* () {
        const id = randomId.randomIdSync();

        yield* Effect.logError(...message).pipe(Effect.annotateLogs({ id }));

        return yield* new RedactedError({ id });
      });
}
