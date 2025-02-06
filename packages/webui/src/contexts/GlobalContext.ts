import { SessionApi } from "@guzzlerapp/domain";
import { Schema } from "effect";
import { isFunction } from "effect/Function";
import React, { createContext, useContext } from "react";
import SessionInfo = SessionApi.SessionInfo;
import FullSession = SessionApi.FullSession;

const Loading = Schema.Struct({
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
const SetReactBoolState = Schema.declare(
  (input: unknown): input is React.Dispatch<React.SetStateAction<boolean>> =>
    isFunction(input),
);
export const Succeeded = Schema.TaggedStruct("Succeeded", {
  ...Rest.fields,
  sessionInfo: SessionInfo,
  connected: Schema.Boolean,
  setConnected: SetReactBoolState,
});
export type Succeeded = typeof Succeeded.Type;

const GlobalContextS = Schema.Union(Loading, Unauthenticated, Succeeded);
type GlobalContextS = typeof GlobalContextS.Type;

export const defaultGlobalContext = (): GlobalContextS => Loading.make();
export const GlobalContext = createContext<GlobalContextS>(
  defaultGlobalContext(),
);

export const useGlobalContext = () => useContext(GlobalContext);
export const useSucceededGlobalContext_Unsafe = (): Succeeded => {
  const gc = useGlobalContext();
  if (gc.loading || gc._tag !== "Succeeded")
    throw new Error("global context isn't succeeded, don't use this function");
  return gc;
};
export const useCurrentSessionInfo = (): SessionInfo | undefined => {
  const gc = useGlobalContext();

  return !gc.loading && gc._tag === "Succeeded" ? gc.sessionInfo : undefined;
};

export const FullSessionContext = createContext<FullSession>(null!);

export const useCurrentFullSession = (): FullSession =>
  useContext(FullSessionContext);
export const useCurrentUser = () => useCurrentFullSession().user;
