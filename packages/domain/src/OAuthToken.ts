import { Schema } from "effect";

// not really sure what all is required here, so since our code only
// requires access_token, mark the others as optional maybe someday
// i'll look up the standard, the library sure doesn't type this token
export const OAuthToken = Schema.Struct({
  access_token: Schema.Redacted(Schema.String),
  refresh_token: Schema.String.pipe(Schema.Redacted, Schema.optional),
  expires_in: Schema.Number.pipe(Schema.optional),
  scope: Schema.String.pipe(Schema.optional),
  token_type: Schema.String.pipe(Schema.optional),
  id_token: Schema.String.pipe(Schema.Redacted, Schema.optional),
  expires_at: Schema.DateFromSelf.pipe(Schema.optional),
});
export type OAuthToken = typeof OAuthToken.Type;
