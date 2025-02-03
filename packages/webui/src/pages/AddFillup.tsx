import { Autos } from "@guzzler/domain";
import {
  Add,
  CarCrashTwoTone,
  NearMeTwoTone,
  SyncAlt,
} from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardActionArea,
  CardHeader,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectProps,
  Skeleton,
  Stack,
  TextField,
  TextFieldProps,
  TextFieldVariants,
  Typography,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Array, Option, Order, pipe, String, Struct } from "effect";
import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import MobileInfoIcon from "../components/MobileInfoIcon.js";
import { PlaceChooserDialog } from "../components/PlaceChooserDialog.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { UnitsTextField } from "../components/UnitsTextField.js";
import { VehicleAvatar } from "../components/VehicleAvatar.js";
import { VehicleChooserDialog } from "../components/VehicleChooserDialog.js";
import {
  useFillupInformationForVehicle,
  useUserData,
} from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";
import { randomId } from "../internal/bootstrap.js";
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

const FormSectionHeader = ({ children }: PropsWithChildren) => (
  <Divider textAlign="left" sx={{ pt: 1 }}>
    <Typography variant="button" color="primary">
      {children}
    </Typography>
  </Divider>
);

const LabeledSelect = ({
  fullWidth,
  ...props
}: Omit<SelectProps, "label"> & Pick<Required<SelectProps>, "label">) => {
  const labelId = useRef(randomId());

  return (
    <FormControl fullWidth={fullWidth ?? false}>
      <InputLabel id={labelId.current}>{props.label}</InputLabel>
      <Select {...props} labelId={labelId.current} />
    </FormControl>
  );
};

const FormTextField = (props: TextFieldProps) => (
  <TextField size="small" fullWidth {...props} />
);

const SectionStack = ({ children }: PropsWithChildren) => (
  <Stack direction="column" spacing={1} component={Paper} padding={1}>
    {children}
  </Stack>
);

const AddFillupLocation = ({
  variant,
  route,
}: { variant: TextFieldVariants } & Props) => {
  const { t } = useTranslation();

  const searchOpen = route.params.searchingNearby;

  const setSearchOpen = (open: boolean) =>
    routes
      .AddFillup({
        ...Struct.omit(route.params, "searchingNearby"),
        ...(open ? { searchingNearby: true } : {}),
      })
      .push();

  return (
    <SectionStack>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<NearMeTwoTone />}
        color="secondary"
        onClick={() => setSearchOpen(true)}
      >
        Search...
      </Button>
      <FormTextField variant={variant} label="Name" />
      <FormTextField variant={variant} label="Street" />
      <FormTextField variant={variant} label="City" />
      <FormTextField variant={variant} label="State" />
      <FormTextField variant={variant} label="Zip Code" />
      <FormTextField variant={variant} label="Country" />
      {searchOpen && (
        <PlaceChooserDialog
          onClose={() => setSearchOpen(false)}
          onLocationSelect={(x, y) => {
            console.log(x, y);
            setSearchOpen(false);
          }}
          open
        />
      )}
    </SectionStack>
  );
};

const AddFillupForm = ({ route }: Props) => {
  const { t } = useTranslation();

  const userData = useUserData();

  const variant: TextFieldVariants = "standard";

  const fuelCategories = useMemo(
    () =>
      userData.loading
        ? []
        : pipe(
            Object.values(userData.types.fuelTypes),
            Array.map(ft => ft.category),
            Array.dedupe,
            Array.sort(Order.string),
          ),
    [userData],
  );

  const fuelTypes = useMemo(
    () =>
      userData.loading
        ? []
        : Object.values(userData.types.fuelTypes).map(f => ({
            // eslint-disable-next-line @typescript-eslint/no-misused-spread
            ...f,
            displayName: `${f.name}${f.rating ? ` [${f.rating}]` : ""}`,
          })),
    [userData],
  );

  return (
    <>
      <FormSectionHeader>Fillup Information</FormSectionHeader>
      <SectionStack>
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
        <UnitsTextField
          units="$"
          position="start"
          variant={variant}
          label="Price per gallon"
        />
        <UnitsTextField units="gal" variant={variant} label="Volume" />
        <UnitsTextField
          units="$"
          position="start"
          variant={variant}
          label="Total cost"
        />
        <Stack direction="row" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Checkbox />}
              label="Partial fillup"
              slotProps={{ typography: { noWrap: true } }}
            />
            <MobileInfoIcon tooltip="Check this box if you did not completely fill the tank, so we know not to attempt efficiency calculation." />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Checkbox />}
              label="Missed fillup(s)"
              slotProps={{ typography: { noWrap: true } }}
            />
            <MobileInfoIcon tooltip="Check this box if you did not record a fillup (or multiple) that happened before this one. Efficiency will be calculated from the last complete fillup." />
          </Stack>
        </Stack>
        <DateTimePicker
          defaultValue={new Date()}
          slotProps={{ textField: { variant, label: "Fillup time" } }}
        />
      </SectionStack>

      <FormSectionHeader>Fuel Information</FormSectionHeader>
      <SectionStack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1 }}>
          <LabeledSelect
            fullWidth
            variant={variant}
            size="small"
            label="Category"
          >
            {fuelCategories.map(c => (
              <MenuItem key={c} value={c}>
                {String.capitalize(c)}
              </MenuItem>
            ))}
          </LabeledSelect>
          <LabeledSelect fullWidth variant={variant} size="small" label="Type">
            {userData.loading
              ? []
              : fuelTypes.map(f => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.displayName}
                  </MenuItem>
                ))}
          </LabeledSelect>
        </Stack>
      </SectionStack>

      <FormSectionHeader>Location Information</FormSectionHeader>
      <AddFillupLocation variant={variant} route={route} />

      <FormSectionHeader>Notes</FormSectionHeader>
      <SectionStack>
        <TextField variant={variant} size="small" multiline fullWidth />
      </SectionStack>
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
        ...Struct.omit(route.params, "switchingVehicle"),
        ...(open ? { switchingVehicle: true } : {}),
      })
      .push();

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

  return (
    <StandardPageBox pOverride={1}>
      {!data.loading && !Object.keys(data.vehicles).length ? (
        <NeedAVehicle />
      ) : (
        <Stack direction="column" spacing={2}>
          <Card>
            <CardHeader
              avatar={
                <CardActionArea
                  onClick={() => {
                    if (vehicleId) routes.Vehicle({ vehicleId }).push();
                  }}
                >
                  {currentVehicle.loading ? (
                    <VehicleAvatar />
                  ) : (
                    <VehicleAvatar
                      name={currentVehicle.value.name}
                      imageId={currentVehicle.value.photoId}
                    />
                  )}
                </CardActionArea>
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
          {switchingVehicle && (
            <VehicleChooserDialog
              onClose={() => setSwitchOpen(false)}
              onVehicleSelect={vehicleId =>
                routes.AddFillup({ vehicleId }).replace()
              }
              open
            />
          )}
          <AddFillupForm route={route} />
        </Stack>
      )}
    </StandardPageBox>
  );
};

export default AddFillup;
