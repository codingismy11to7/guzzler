import { Either, identity, ParseResult, pipe, Schema } from "effect";
import { isString } from "effect/String";

export const RemoveField = Schema.Struct({
  remove: Schema.Literal(true),
}).annotations({
  identifier: "RemoveField",
  description:
    "Include this as the field value to remove it, instead of setting it to another value or blank.",
});
export const isRemoveField = Schema.is(RemoveField);

export const StringFromSelfOrUint8Array = Schema.transformOrFail(
  Schema.Union(Schema.Uint8ArrayFromSelf, Schema.String),
  Schema.String,
  {
    strict: true,
    encode: ParseResult.succeed,
    decode: (input, _, ast) =>
      isString(input)
        ? ParseResult.succeed(input)
        : pipe(
            Either.try(() => new TextDecoder().decode(input)),
            Either.mapLeft(
              () =>
                new ParseResult.Type(
                  ast,
                  input,
                  `${input} is not valid utf-8 text`,
                ),
            ),
          ),
  },
);

export const OptionalString = Schema.Trim.pipe(Schema.optional);
export const OptionalNumber = Schema.Number.pipe(Schema.optional);
export const OptionalBigDecimal = Schema.OptionFromUndefinedOr(
  Schema.BigDecimal,
);

export const Timestamp = Schema.Int.pipe(Schema.positive());

export const BooleanFromSelfOrString = Schema.transform(
  Schema.Union(Schema.Boolean, Schema.BooleanFromString),
  Schema.Boolean,
  { decode: identity, encode: identity },
);

export const NumberFromSelfOrString = Schema.transform(
  Schema.Union(Schema.Number, Schema.NumberFromString),
  Schema.Number,
  {
    decode: identity,
    encode: identity,
  },
);

export const IntFromSelfOrString = NumberFromSelfOrString.pipe(Schema.int());

export const ObjectIdStringSchema = Schema.Trimmed.pipe(
  Schema.pattern(/[0-9a-fA-F]{24}/, {
    identifier: "ObjectIdString",
    description: "String representation of a BSON ObjectId",
  }),
);
