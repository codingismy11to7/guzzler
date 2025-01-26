import { useContext } from "react";
import * as internal from "../internal/contexts/userDataContext.js";

export const useUserData = () => useContext(internal.UserDataContext);
