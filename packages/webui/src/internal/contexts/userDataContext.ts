import { createContext } from "react";
import * as Model from "../../models/UserDataContext.js";

export const defaultUserDataContext = (): Model.UserDataContext =>
  Model.Loading.make();

export const UserDataContext = createContext(defaultUserDataContext());
