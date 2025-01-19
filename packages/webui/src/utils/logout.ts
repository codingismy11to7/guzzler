import { SessionApi } from "@guzzler/domain";

export const logoutPath =
  SessionApi.SessionApi.endpoints[SessionApi.Logout].path;
export const logout = () => document.location.assign(logoutPath);
