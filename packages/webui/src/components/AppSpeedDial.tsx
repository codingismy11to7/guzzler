import {
  CarRepairTwoTone,
  LocalGasStationTwoTone,
  MapTwoTone,
} from "@mui/icons-material";
import {
  Backdrop,
  SpeedDial,
  SpeedDialAction,
  SpeedDialActionProps,
  SpeedDialIcon,
  Typography,
} from "@mui/material";
import React, { ReactNode, useState } from "react";
import { useIsTouch } from "../hooks/useIsTouch.js";
import { useTranslation } from "../i18n.js";
import { AppRoute, routes } from "../router.js";

type AppSpeedDialActionProps = Readonly<{
  isTouch: boolean;
  icon: ReactNode;
  label: string;
}> &
  SpeedDialActionProps;

const AppSpeedDialAction = ({
  isTouch,
  icon,
  label,
  ...rest
}: AppSpeedDialActionProps) => (
  <SpeedDialAction
    icon={icon}
    slotProps={{
      tooltip: {
        open: isTouch,
        title: (
          <Typography variant="body2" noWrap>
            {label}
          </Typography>
        ),
      },
    }}
    {...rest}
  />
);

export const AppSpeedDial = () => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const isTouch = useIsTouch();

  const nav = (route: AppRoute) => () => {
    route.push();
    if (isTouch) setOpen(false);
  };

  return (
    <>
      <Backdrop open={open} />
      <SpeedDial
        {...(isTouch ? { open } : {})}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        ariaLabel="add items"
        icon={<SpeedDialIcon />}
        FabProps={{
          color: "secondary",
          ...(isTouch ? { onClick: () => setOpen(o => !o) } : {}),
        }}
        sx={{
          position: "absolute",
          zIndex: 1,
          bottom: 30,
          left: 0,
          right: 0,
          margin: "0 auto",
        }}
      >
        <AppSpeedDialAction
          isTouch={isTouch}
          icon={<LocalGasStationTwoTone color="primary" />}
          label={t("speedDial.fillup")}
          onClick={nav(routes.AddFillup())}
        />
        <AppSpeedDialAction
          isTouch={isTouch}
          icon={<CarRepairTwoTone color="primary" />}
          label={t("speedDial.event")}
        />
        <AppSpeedDialAction
          isTouch={isTouch}
          icon={<MapTwoTone color="primary" />}
          label={t("speedDial.trip")}
        />
      </SpeedDial>
    </>
  );
};
