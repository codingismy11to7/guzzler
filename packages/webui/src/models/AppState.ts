import { Autos, SessionApi } from "@guzzlerapp/domain";
import { Schema, Schema as S, Struct } from "effect";
import { AutosData } from "./AutosData.js";
import SessionInfo = SessionApi.SessionInfo;
import React from "react";

/* session */

export const SessionLoading = Schema.Struct({
  loading: Schema.Literal(true).pipe(
    Schema.optionalWith({ default: () => true }),
  ),
});
const Rest = Schema.Struct({
  loading: Schema.Literal(false).pipe(
    Schema.optionalWith({ default: () => false }),
  ),
});
export const Unauthenticated = Schema.TaggedStruct(
  "Unauthenticated",
  Rest.fields,
);
export const Succeeded = Schema.TaggedStruct("Succeeded", {
  ...Rest.fields,
  sessionInfo: SessionInfo,
  connectedToBackend: Schema.Boolean,
});
export type Succeeded = typeof Succeeded.Type;

export const SessionState = Schema.Union(
  SessionLoading,
  Unauthenticated,
  Succeeded,
);
export type SessionState = typeof SessionState.Type;

/* userdata */

export const Loading = S.Struct({
  loading: S.Literal(true).pipe(S.optionalWith({ default: () => true })),
});

export const Loaded = S.Struct({
  loading: S.Literal(false).pipe(S.optionalWith({ default: () => false })),
  ...AutosData.fields,
});
export type Loaded = typeof Loaded.Type;

export const UserData = S.Union(Loading, Loaded);
export type UserData = typeof UserData.Type;

/* new fillup */

export const NewFillup = S.Struct({
  ...Struct.pick(Autos.FillupRecord.fields, "odometerReading"),
});
export type NewFillup = typeof NewFillup.Type;

export const NewFillupSection = S.Literal(
  "fillup",
  "fuel",
  "location",
  "other",
);
export type NewFillupSection = typeof NewFillupSection.Type;
export const SectionOpenMap = S.Record({
  key: NewFillupSection,
  value: S.Boolean,
});
export type SectionOpenMap = typeof SectionOpenMap.Type;

export type SectionRefMap = Record<
  NewFillupSection,
  React.RefObject<HTMLDivElement | null>
>;
