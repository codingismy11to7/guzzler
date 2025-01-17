import { HelpOutline } from "@mui/icons-material";
import { ClickAwayListener, Tooltip, Zoom } from "@mui/material";
import { useState } from "react";

/**
 * This exists because i want to make the default experience mobile, and
 * the default tooltip settings there don't make sense to me (you have to hold
 * for 700ms i think? and then it disappears so fast you can't read it).
 *
 * the better solution will be to use mobile detection and fall back to normal
 * tooltip when using mouse, for now it's good on mobile and usable on desktop
 */

type Props = Readonly<{ tooltip: string; disabled?: boolean }>;

const MobileInfoIcon = ({ tooltip, disabled }: Props) => {
  const [zoneTooltip, setZoneTooltip] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setZoneTooltip(false)}>
      <Tooltip
        onClose={() => setZoneTooltip(false)}
        open={zoneTooltip}
        disableFocusListener
        disableHoverListener
        disableTouchListener
        title={tooltip}
        arrow
        slots={{ transition: Zoom }}
      >
        <HelpOutline
          color={disabled ? "disabled" : "inherit"}
          onClick={() => !disabled && setZoneTooltip(o => !o)}
          cursor={disabled ? undefined : "pointer"}
        />
      </Tooltip>
    </ClickAwayListener>
  );
};

export default MobileInfoIcon;
