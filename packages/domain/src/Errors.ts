import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
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
  HttpApiSchema.annotations({ status: 500 }),
) {}
