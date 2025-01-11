import { KeyboardEvent } from "react";

export const onEnterKey = (thunk: (e: KeyboardEvent) => unknown) => (e: KeyboardEvent) => {
  if (e.key === "Enter") thunk(e);
};
