import { Schema } from "effect";

export const SimpleStructSchema = Schema.Struct({
  str: Schema.String,
  num: Schema.Number,
  bool: Schema.Boolean,
});
