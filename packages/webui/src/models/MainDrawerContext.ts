import { Dispatch, SetStateAction } from "react";

export type DrawerOpen = boolean;
export type MainDrawerContext = Readonly<{
  open: DrawerOpen;
  setOpen: Dispatch<SetStateAction<boolean>>;
}>;
