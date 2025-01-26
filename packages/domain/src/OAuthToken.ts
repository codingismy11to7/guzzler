import { Schema } from "effect";
import { isNumber } from "effect/Number";

const DateToTimestamp = Schema.transform(
  Schema.Union(Schema.DateFromSelf, Schema.Int),
  Schema.Int,
  {
    encode: input => input,
    decode: input => (isNumber(input) ? input : input.getTime()),
  },
);

// not really sure what all is required here, so since our code only
// requires access_token, mark the others as optional maybe someday
// i'll look up the standard, the library sure doesn't type this token
// also the library is modifying it - for instance expires_at is a Date,
// so i know that's not coming from the rest call
export const OAuthToken = Schema.Struct({
  access_token: Schema.Redacted(Schema.String),
  refresh_token: Schema.String.pipe(Schema.Redacted, Schema.optional),
  expires_in: Schema.Number.pipe(Schema.optional),
  scope: Schema.String.pipe(Schema.optional),
  token_type: Schema.String.pipe(Schema.optional),
  id_token: Schema.String.pipe(Schema.Redacted, Schema.optional),
  expires_at: Schema.OptionFromUndefinedOr(DateToTimestamp),
});
export type OAuthToken = typeof OAuthToken.Type;
