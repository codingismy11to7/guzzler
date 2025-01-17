import { identity, Schema } from "effect";

export const OptionalString = Schema.Trim.pipe(Schema.optional);
export const OptionalNumber = Schema.Number.pipe(Schema.optional);
export const OptionalBigDecimal = Schema.OptionFromUndefinedOr(Schema.BigDecimal);

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
