import { Schema } from "effect";
import { AutosData } from "./AutosData.js";

export const Loading = Schema.Struct({
  loading: Schema.Literal(true).pipe(
    Schema.optionalWith({ default: () => true }),
  ),
});

export const Loaded = Schema.Struct({
  loading: Schema.Literal(false).pipe(
    Schema.optionalWith({ default: () => false }),
  ),
  ...AutosData.fields,
});
export type Loaded = typeof Loaded.Type;

export const UserDataContext = Schema.Union(Loading, Loaded);
export type UserDataContext = typeof UserDataContext.Type;
