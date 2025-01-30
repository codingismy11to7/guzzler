import { Autos } from "@guzzler/domain";
import { Add, CarCrashTwoTone, SyncAlt } from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Avatar,
  Button,
  Card,
  CardHeader,
  IconButton,
  Skeleton,
  Stack,
} from "@mui/material";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Array, Option, Struct } from "effect";
import { useEffect } from "react";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { VehicleAvatar } from "../components/VehicleAvatar.js";
import {
  useFillupInformationForVehicle,
  useUserData,
} from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";
import { routes } from "../router.js";

const NeedAVehicle = () => {
  const { t } = useTranslation();

  return (
    <Stack direction="column" spacing={1}>
      <Alert color="info" icon={<CarCrashTwoTone />}>
        <AlertTitle>Need a Vehicle</AlertTitle>
        It looks like you don&apos;t have any vehicles, so it&apos;s going to be
        difficult to add a fillup.
      </Alert>
      <Button
        fullWidth
        color="info"
        variant="outlined"
        startIcon={<Add />}
        onClick={() => routes.Vehicles().push()}
      >
        Add
      </Button>
      <Button
        fullWidth
        color="info"
        variant="outlined"
        startIcon={<SyncAlt />}
        onClick={() => routes.ImportExport().push()}
      >
        Import
      </Button>
    </Stack>
  );
};

type Props = Readonly<{ route: ReturnType<typeof routes.AddFillup> }>;

const AddFillup = ({ route }: Props) => {
  const { t } = useTranslation();

  const { vehicleId } = route.params;

  const data = useUserData();

  const [defaultVehicle, setDefaultVehicle] = useLocalStorage<
    Autos.VehicleId | undefined
  >("guzzler-default-vehicle");

  useEffect(() => {
    if (!data.loading && !vehicleId) {
      const { vehicles } = data;

      console.log("vehicles", vehicles, defaultVehicle);

      if (defaultVehicle && defaultVehicle in vehicles) {
        routes.AddFillup({ vehicleId: defaultVehicle }).replace();
        return;
      }

      const vehicleIdOpt = Array.head(Struct.keys(vehicles));
      if (Option.isSome(vehicleIdOpt)) {
        const vehicleId = vehicleIdOpt.value;
        setDefaultVehicle(vehicleId);
        routes.AddFillup({ vehicleId }).replace();
      }
    }
  }, [data, data.loading, defaultVehicle, setDefaultVehicle, vehicleId]);

  const currentVehicle =
    data.loading || !vehicleId
      ? { loading: true as const }
      : { loading: false as const, value: data.vehicles[vehicleId] };

  const fillupInfo = useFillupInformationForVehicle(vehicleId);

  useEffect(() => {
    console.log(fillupInfo);
  }, [fillupInfo]);

  return (
    <StandardPageBox>
      {!data.loading && !Object.keys(data.vehicles).length ? (
        <NeedAVehicle />
      ) : (
        <Stack direction="column" spacing={1}>
          <Card>
            <CardHeader
              avatar={
                currentVehicle.loading ? (
                  <VehicleAvatar />
                ) : (
                  <VehicleAvatar
                    name={currentVehicle.value.name}
                    imageId={currentVehicle.value.photoId}
                  />
                )
              }
              title={currentVehicle.value?.name ?? <Skeleton />}
              subheader={
                fillupInfo.loading ? (
                  <Skeleton />
                ) : fillupInfo.highestOdometer ? (
                  `${fillupInfo.highestOdometer} mi`
                ) : undefined
              }
              slotProps={{ action: { sx: { alignSelf: "center" } } }}
              action={<Button>Switch</Button>}
            />
          </Card>
        </Stack>
      )}
    </StandardPageBox>
  );
};

export default AddFillup;
