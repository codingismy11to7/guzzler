import { PropsWithChildren, useState } from "react";
import * as internal from "../internal/contexts/mainDrawerContext.js";

export const MainDrawerContextProvider = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false);

  return (
    <internal.MainDrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </internal.MainDrawerContext.Provider>
  );
};
