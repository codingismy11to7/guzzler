import { Box, BoxProps } from "@mui/material";
import React, { useCallback } from "react";
import { useMainDrawer } from "../hooks/useMainDrawer.js";
import { SwipeCallback, useOnSwipe } from "../hooks/useOnSwipe.js";

type Props = BoxProps & Readonly<{ disablePadding?: boolean }>;

export const StandardPageBox = ({
  children,
  sx: _sx,
  ref: _ref,
  disablePadding,
  ...rest
}: Props) => {
  const [, setDrawerOpen] = useMainDrawer();

  const onSwipe: SwipeCallback = useCallback(
    d => {
      if (d === "right") setDrawerOpen(false);
      else if (d === "left") setDrawerOpen(true);
    },
    [setDrawerOpen],
  );

  const ref = useOnSwipe(onSwipe);

  return (
    // take away pb if we get rid of the speed dial
    <Box
      sx={{ height: 1, overflow: "auto", p: disablePadding ? 0 : 2, pb: 5 }}
      ref={ref}
      {...rest}
    >
      {children}
    </Box>
  );
};
