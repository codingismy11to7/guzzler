import { Schema } from "effect";

export const ContentType = Schema.String.pipe(Schema.brand("ContentType"));
export type ContentType = typeof ContentType.Type;
