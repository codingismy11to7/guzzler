import { AppApi as Api } from "@guzzler/domain";
import { FullSession } from "@guzzler/domain/AppApi";
import { Schema } from "effect";
import { createContext, useContext } from "react";

const Loading = Schema.Struct({
  loading: Schema.Literal(true).pipe(Schema.optionalWith({ default: () => true })),
});
const Rest = Schema.Struct({
  loading: Schema.Literal(false).pipe(Schema.optionalWith({ default: () => false })),
});
export const Unauthenticated = Schema.TaggedStruct("Unauthenticated", Rest.fields);
export const Errored = Schema.TaggedStruct("Errored", {
  ...Rest.fields,
  error: Schema.String,
});
export const Succeeded = Schema.TaggedStruct("Succeeded", {
  ...Rest.fields,
  sessionInfo: Api.SessionInfo,
});

const GlobalContextS = Schema.Union(Loading, Unauthenticated, Errored, Succeeded);
type GlobalContextS = typeof GlobalContextS.Type;

export const defaultGlobalContext = (): GlobalContextS => Loading.make();
export const GlobalContext = createContext<GlobalContextS>(defaultGlobalContext());

export const useGlobalContext = () => useContext(GlobalContext);
export const useCurrentSessionInfo = (): Api.SessionInfo | undefined => {
  const gc = useGlobalContext();

  return !gc.loading && gc._tag === "Succeeded" ? gc.sessionInfo : undefined;
};

export const FullSessionContext = createContext<FullSession>(null!);

export const useCurrentFullSession = (): FullSession => useContext(FullSessionContext);
export const useCurrentUser = () => useCurrentFullSession().user;
