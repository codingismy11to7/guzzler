import { MoreVert } from "@mui/icons-material";
import { IconButton, IconButtonProps, IconButtonTypeMap, Menu } from "@mui/material";
import { isFunction } from "effect/Function";
import { isNotNull } from "effect/Predicate";
import { nanoid } from "nanoid";
import React, { ReactNode, useRef, useState } from "react";

type Props<D extends React.ElementType = IconButtonTypeMap["defaultComponent"], P = object> = Readonly<{
  "aria-label": string;
  menuItems: readonly ReactNode[] | ((closeMenu: () => void) => readonly ReactNode[]);
  buttonProps?: IconButtonProps<D, P>;
  buttonIcon?: ReactNode;
}>;

export const PopupMenuButton = <D extends React.ElementType = IconButtonTypeMap["defaultComponent"], P = object>({
  "aria-label": ariaLabel,
  buttonProps,
  buttonIcon,
  menuItems,
}: Props<D, P>) => {
  const menuButtonId = useRef(nanoid());
  const menuId = useRef(nanoid());
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = isNotNull(anchorEl);
  const onMenuClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        {...buttonProps}
        id={menuButtonId.current}
        aria-controls={menuOpen ? menuId.current : undefined}
        aria-haspopup="true"
        aria-label={ariaLabel}
        aria-expanded={menuOpen ? "true" : undefined}
        onClick={e => setAnchorEl(e.currentTarget)}
      >
        {buttonIcon ?? <MoreVert />}
      </IconButton>
      {!menuOpen ? (
        <></>
      ) : (
        <Menu
          id={menuId.current}
          open={true}
          anchorEl={anchorEl}
          onClose={onMenuClose}
          MenuListProps={{ "aria-labelledby": menuButtonId.current }}
        >
          {isFunction(menuItems) ? menuItems(onMenuClose) : menuItems}
        </Menu>
      )}
    </>
  );
};
