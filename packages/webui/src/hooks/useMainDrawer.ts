import { Dispatch, SetStateAction, useContext } from "react";
import * as internal from "../internal/contexts/mainDrawerContext.js";

export const useMainDrawer = (): [
  drawerOpen: boolean,
  setDrawerOpen: Dispatch<SetStateAction<boolean>>,
] => {
  const { open, setOpen } = useContext(internal.MainDrawerContext);
  return [open, setOpen];
};
