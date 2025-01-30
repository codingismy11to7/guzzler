import { Either, identity, ParseResult, pipe, Schema as S } from "effect";
import { isString } from "effect/String";

export const RemoveField = S.Struct({
  remove: S.Literal(true),
}).annotations({
  identifier: "RemoveField",
  description:
    "Include this as the field value to remove it, instead of setting it to another value or blank.",
});
export const isRemoveField = S.is(RemoveField);

export const StringFromSelfOrUint8Array = S.transformOrFail(
  S.Union(S.Uint8ArrayFromSelf, S.String),
  S.String,
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

export const OptionalString = S.Trim.pipe(S.optional);
export const OptionalNumber = S.Number.pipe(S.optional);
export const OptionalBigDecimal = S.OptionFromUndefinedOr(S.BigDecimal);

export const Timestamp = S.Int.pipe(S.positive());

export const BooleanFromSelfOrString = S.transform(
  S.Union(S.Boolean, S.BooleanFromString),
  S.Boolean,
  { decode: identity, encode: identity },
);

export const NumberFromSelfOrString = S.transform(
  S.Union(S.Number, S.NumberFromString),
  S.Number,
  {
    decode: identity,
    encode: identity,
  },
);

export const IntFromSelfOrString = NumberFromSelfOrString.pipe(S.int());

export const ObjectIdStringSchema = S.Trimmed.pipe(
  S.pattern(/[0-9a-fA-F]{24}/, {
    identifier: "ObjectIdString",
    description: "String representation of a BSON ObjectId",
  }),
);
