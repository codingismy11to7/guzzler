import { SessionApi } from "@guzzler/domain";
import { useAppState } from "../AppStore.js";
import { Succeeded } from "../models/AppState.js";
import SessionInfo = SessionApi.SessionInfo;
import FullSession = SessionApi.FullSession;

export const useSucceededSessionState_Unsafe = (): Succeeded => {
  const gc = useAppState(s => s.sessionState);

  if (gc.loading || gc._tag !== "Succeeded")
    throw new Error("sessionState isn't succeeded, don't use this function");
  return gc;
};

export const useCurrentSessionInfo = (): SessionInfo | undefined => {
  const gc = useAppState(s => s.sessionState);

  return !gc.loading && gc._tag === "Succeeded" ? gc.sessionInfo : undefined;
};

export const useCurrentFullSession_Unsafe = (): FullSession => {
  const gc = useAppState(s => s.sessionState);

  if (
    gc.loading ||
    gc._tag !== "Succeeded" ||
    gc.sessionInfo._tag !== "FullSession"
  )
    throw new Error("sessionState isn't full, don't use this function");
  return gc.sessionInfo;
};
