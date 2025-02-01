import { PhotoId, VehicleId } from "@guzzler/domain/Autos";
import { Dialog, DialogContent, Paper, Slide } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import { LazyArg } from "effect/Function";
import { forwardRef, PropsWithChildren, ReactElement } from "react";
import { useTranslation } from "../i18n.js";
import { VehicleList } from "./VehicleList.js";

type Props = Readonly<{
  open: boolean;
  onClose: LazyArg<void>;
  onVehicleSelect: (vehicleId: VehicleId) => void;
}>;

export const VehicleChooserDialog = ({
  open,
  onClose,
  onVehicleSelect,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slots={{
        transition: forwardRef(function Transition(
          props: TransitionProps & { children: ReactElement },
          ref,
        ) {
          return (
            <Slide
              direction="up"
              ref={ref}
              {...props}
              appear={props.appear ?? false}
            />
          );
        }),
      }}
    >
      <DialogContent sx={{ overflow: "auto", p: 0 }}>
        <Paper>
          <VehicleList onVehicleClick={onVehicleSelect} />
        </Paper>
      </DialogContent>
    </Dialog>
  );
};
