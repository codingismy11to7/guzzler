import { VehicleId } from "@guzzlerapp/domain/models/Autos";
import { LazyArg } from "effect/Function";
import { FullScreenDialog } from "./FullScreenDialog.js";
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
}: Props) => (
  <FullScreenDialog open={open} onClose={onClose}>
    <VehicleList onVehicleClick={onVehicleSelect} />
  </FullScreenDialog>
);
