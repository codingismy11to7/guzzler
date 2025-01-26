import { createContext } from "react";
import * as Models from "../../models/MainDrawerContext.js";

export const defaultMainDrawerContext = (): Models.MainDrawerContext => ({
  open: false,
  setOpen: () => {
    /* placeholder */
  },
});

export const MainDrawerContext = createContext(defaultMainDrawerContext());
