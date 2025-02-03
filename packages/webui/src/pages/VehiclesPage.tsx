import { StandardPageBox } from "../components/StandardPageBox.js";
import { VehicleList } from "../components/VehicleList.js";
import { routes } from "../router.js";

const VehiclesPage = () => (
  <StandardPageBox pOverride={0}>
    <VehicleList routeForVehicle={vehicleId => routes.Vehicle({ vehicleId })} />
  </StandardPageBox>
);

export default VehiclesPage;
