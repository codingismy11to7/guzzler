import { Autos, Location } from "@guzzler/domain";
import { GasStationQueryMode } from "@guzzler/domain/models/AutosApiModel";
import { Place } from "@guzzler/domain/models/Place";
import { Add, CarCrashTwoTone, SyncAlt } from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardHeader,
  Link,
  Skeleton,
  Stack,
  TextFieldVariants,
  Typography,
} from "@mui/material";
import { useGeolocation, useLocalStorage } from "@uidotdev/usehooks";
import { Array, Boolean, Option, pipe, Schema, Struct } from "effect";
import { andThen, catchAll, logError } from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";
import { isNotNullable } from "effect/Predicate";
import { useEffect, useState } from "react";
import { AutosClient } from "../apiclients/AutosClient.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { UnitsTextField } from "../components/UnitsTextField.js";
import { VehicleAvatar } from "../components/VehicleAvatar.js";
import { VehicleChooserDialog } from "../components/VehicleChooserDialog.js";
import {
  useFillupInformationForVehicle,
  useUserData,
} from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";
import { runP } from "../internal/bootstrap.js";
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

const LocationBox = () => {
  const locationState = useGeolocation({ enableHighAccuracy: true });

  const loadingOrError =
    locationState.loading || isNotNullable(locationState.error);

  const [stations, setStations] = useState<readonly Place[]>([]);

  const currentLocation = Schema.decodeUnknownOption(Location.Location)(
    locationState,
  ).pipe(Option.getOrUndefined);

  useEffect(() => {
    console.log(currentLocation);
  }, [currentLocation]);

  const onFetch = (mode: GasStationQueryMode) => () => {
    if (!loadingOrError && currentLocation) {
      return pipe(
        AutosClient.getGasStations(mode, currentLocation),
        andThen(setStations),
        catchAll(e => logError("handle this better", e)),
        runP,
      );
    }
  };

  return (
    <Stack direction="column" spacing={1}>
      <Box>
        <Typography whiteSpace="pre-wrap">
          {stringifyCircular(locationState, 2)}
        </Typography>
      </Box>
      <Box>
        <Link
          aria-disabled={loadingOrError}
          href={
            loadingOrError
              ? "#"
              : `https://maps.google.com/?q=${locationState.latitude},${locationState.longitude}`
          }
          onClick={loadingOrError ? e => e.preventDefault() : undefined}
          target="_blank"
        >
          {locationState.loading ? (
            <Skeleton width={200} />
          ) : locationState.error ? (
            "Location not enabled"
          ) : (
            "View in Maps"
          )}
        </Link>
      </Box>
      {!loadingOrError && (
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onFetch("GasStations")}>
            Fetch Gas
          </Button>
          <Button variant="outlined" onClick={onFetch("EVChargingStations")}>
            Fetch Charging
          </Button>
        </Stack>
      )}
      {!!stations.length && (
        <Box>
          <Typography whiteSpace="pre-wrap">
            {stringifyCircular(stations, 2)}
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

const AddFillupForm = () => {
  const { t } = useTranslation();

  const variant: TextFieldVariants = "standard"; //"standard";

  return (
    <>
      <Stack direction="row" spacing={1}>
        <UnitsTextField
          units="mi"
          size="small"
          variant={variant}
          label="Trip distance"
        />
        <UnitsTextField
          units="mi"
          size="small"
          variant={variant}
          label="Current odometer"
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        <UnitsTextField
          units="$"
          position="start"
          variant={variant}
          label="Price per gallon"
        />
        <UnitsTextField units="gal" variant={variant} label="Volume" />
      </Stack>
    </>
  );
};

type Props = Readonly<{ route: ReturnType<typeof routes.AddFillup> }>;

const AddFillup = ({ route }: Props) => {
  const { t } = useTranslation();

  const { vehicleId, switchingVehicle } = route.params;

  const setSwitchOpen = (open: boolean) =>
    routes
      .AddFillup({
        ...(vehicleId ? { vehicleId } : {}),
        ...(open ? { switchingVehicle: true } : {}),
      })
      .replace();

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
        console.log("hey here", vehicleId);
        setDefaultVehicle(vehicleId);
        routes.AddFillup({ vehicleId }).replace();
      }
    } else if (vehicleId && vehicleId !== defaultVehicle) {
      // save this as default for next time
      setDefaultVehicle(vehicleId);
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

  const [showLocation, setShowLocation] = useState(false);

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
              action={
                <Button onClick={() => setSwitchOpen(true)}>Switch</Button>
              }
            />
          </Card>
          <Button
            onClick={() => setShowLocation(Boolean.not)}
            variant="contained"
          >
            Toggle Location
          </Button>
          {showLocation && <LocationBox />}
          {switchingVehicle && (
            <VehicleChooserDialog
              onClose={() => setSwitchOpen(false)}
              onVehicleSelect={vehicleId =>
                routes.AddFillup({ vehicleId }).replace()
              }
              open
            />
          )}
          <AddFillupForm />
        </Stack>
      )}
    </StandardPageBox>
  );
};

export default AddFillup;
