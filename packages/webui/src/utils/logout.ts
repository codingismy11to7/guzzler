import { SessionApi } from "@guzzler/domain";

export const logout = () => document.location.assign(SessionApi.SessionApi.endpoints[SessionApi.Logout].path);
