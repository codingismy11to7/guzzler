import { Autos, AutosApiModel } from "@guzzlerapp/domain";
import { FuelCategory, FuelTypeId } from "@guzzlerapp/domain/models/Autos";
import { type Location } from "@guzzlerapp/domain/models/Location";
import { MoreBigDecimal } from "@guzzlerapp/utils";
import {
  Add,
  CarCrashTwoTone,
  ChevronRight,
  ExpandMore,
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
  Grid as Grid2,
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
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useLocalStorage, usePrevious } from "@uidotdev/usehooks";
import {
  Array,
  BigDecimal as BD,
  Effect,
  Option as O,
  Order,
  pipe,
  String,
  Struct,
} from "effect";
import { catchTags, gen } from "effect/Effect";
import { fromNullable, isNone } from "effect/Option";
import { isNotNull } from "effect/Predicate";
import React, {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppState } from "../AppStore.js";
import MobileInfoIcon from "../components/MobileInfoIcon.js";
import {
  type OnLocationSelect,
  PlaceChooserDialog,
} from "../components/PlaceChooserDialog.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { UnitsTextField } from "../components/UnitsTextField.js";
import { VehicleAvatar } from "../components/VehicleAvatar.js";
import { VehicleChooserDialog } from "../components/VehicleChooserDialog.js";
import {
  useFillupInformationForVehicle,
  useUserData,
} from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";
import { randomId, runSync } from "../internal/runtimes/Main.js";
import { NewFillupSection } from "../models/AppState.js";
import { routes } from "../router.js";
import GasStationResponsePlace = AutosApiModel.GasStationResponsePlace;

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

const FormSectionHeader = ({
  section,
  children,
}: PropsWithChildren<{ section: NewFillupSection }>) => {
  const openMap = useAppState(s => s.sectionOpenMap);
  const open = openMap[section];
  const toggleOpen = useAppState(s => s.toggleSectionOpen);

  return (
    <Divider textAlign="left" sx={{ pt: 1 }}>
      <Button
        onClick={() => toggleOpen(section)}
        endIcon={
          open ? <ExpandMore color="action" /> : <ChevronRight color="action" />
        }
      >
        {children}
      </Button>
    </Divider>
  );
};

const LabeledSelect = <Value,>({
  fullWidth,
  ...props
}: Omit<SelectProps<Value>, "label"> &
  Pick<Required<SelectProps<Value>>, "label">) => {
  const labelId = useRef(randomId());

  return (
    <FormControl fullWidth={fullWidth ?? false}>
      <InputLabel id={labelId.current}>{props.label}</InputLabel>
      <Select<Value> {...props} labelId={labelId.current} />
    </FormControl>
  );
};

const FormTextField = (props: TextFieldProps) => (
  <TextField size="small" fullWidth {...props} />
);

const scrollIntoView = (div: HTMLDivElement, first: boolean) =>
  div.scrollIntoView({ behavior: "smooth", block: first ? "end" : "start" });

const SectionStack = ({
  section,
  children,
  first,
}: PropsWithChildren<{
  section: NewFillupSection;
  first: boolean;
}>) => {
  const openMap = useAppState(s => s.sectionOpenMap);
  const open = openMap[section];
  const stackRef = useAppState(s => s.sectionRefMap)[section];

  const wasOpen = usePrevious(open);

  useEffect(() => {
    if (open && isNotNull(wasOpen) && !wasOpen && stackRef.current)
      scrollIntoView(stackRef.current, first);
  }, [first, open, stackRef, wasOpen]);

  return (
    open && (
      <Stack
        direction="column"
        spacing={1}
        component={Paper}
        padding={1}
        ref={stackRef}
      >
        {children}
      </Stack>
    )
  );
};

const FormSection = ({
  label,
  section,
  children,
  first = false,
}: PropsWithChildren<{
  label: ReactNode;
  section: NewFillupSection;
  first?: boolean;
}>) => (
  <>
    <FormSectionHeader section={section}>{label}</FormSectionHeader>
    <SectionStack section={section} first={first}>
      {children}
    </SectionStack>
  </>
);

const AddFillupLocation = ({
  variant,
  onLocationSelect,
  route,
  name,
  onNameChange,
  street,
  onStreetChange,
  city,
  onCityChange,
  state,
  onStateChange,
  zip,
  onZipChange,
  country,
  onCountryChange,
}: {
  variant: TextFieldVariants;
  onLocationSelect: OnLocationSelect;
  name: string;
  onNameChange: (s: string) => void;
  street: string;
  onStreetChange: (s: string) => void;
  city: string;
  onCityChange: (s: string) => void;
  state: string;
  onStateChange: (s: string) => void;
  zip: string;
  onZipChange: (s: string) => void;
  country: string;
  onCountryChange: (s: string) => void;
} & Props) => {
  const { t } = useTranslation();

  const searchOpen = route.params.searchingNearby;

  const setSearchOpen = (open: boolean) =>
    routes
      .AddFillup({
        ...Struct.omit(route.params, "searchingNearby"),
        ...(open ? { searchingNearby: true } : {}),
      })
      .push();

  /*
  const ref = useAppState(s => s.sectionRefMap).location;

  const searchWasOpen = usePrevious(searchOpen);
  useEffect(() => {
    if (searchOpen && searchWasOpen === false && isNotNull(ref.current))
      scrollIntoView(ref.current, false);
  }, [ref, searchOpen, searchWasOpen]);
*/

  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<NearMeTwoTone />}
        color="secondary"
        onClick={
          () => setSearchOpen(true)
          // console.log(ref);
          // if (isNotNull(ref.current)) scrollIntoView(ref.current, false);
          // setTimeout(() => setSearchOpen(true), 10);
        }
      >
        Search...
      </Button>
      <FormTextField
        variant={variant}
        label="Name"
        value={name}
        onChange={e => onNameChange(e.target.value)}
      />
      <FormTextField
        variant={variant}
        label="Street"
        value={street}
        onChange={e => onStreetChange(e.target.value)}
      />
      <FormTextField
        variant={variant}
        label="City"
        value={city}
        onChange={e => onCityChange(e.target.value)}
      />
      <FormTextField
        variant={variant}
        label="State"
        value={state}
        onChange={e => onStateChange(e.target.value)}
      />
      <FormTextField
        variant={variant}
        label="Zip Code"
        value={zip}
        onChange={e => onZipChange(e.target.value)}
      />
      <FormTextField
        variant={variant}
        label="Country"
        value={country}
        onChange={e => onCountryChange(e.target.value)}
      />
      {searchOpen && (
        <PlaceChooserDialog
          onClose={() => setSearchOpen(false)}
          onLocationSelect={(loc, place) => {
            setSearchOpen(false);
            onLocationSelect(loc, place);
          }}
          open
        />
      )}
    </>
  );
};

const ignoreNone = { NoSuchElementException: () => Effect.void };

const AddFillupForm = ({
  route,
  fillupInfo,
}: Props &
  Readonly<{
    fillupInfo: ReturnType<typeof useFillupInformationForVehicle>;
  }>) => {
  const { t } = useTranslation();

  const userData = useUserData();
  const setPageAction = useAppState(s => s.setPageAction);

  const [tripDistance, setTripDistance] = useState("");
  const tripDistanceBD = useMemo(
    () => BD.fromString(tripDistance),
    [tripDistance],
  );
  const [currOdometer, setCurrOdometer] = useState("");
  const currOdometerBD = useMemo(
    () => BD.fromString(currOdometer),
    [currOdometer],
  );
  const [ppg, setPpg] = useState("");
  const ppgBD = useMemo(() => BD.fromString(ppg), [ppg]);
  const [volume, setVolume] = useState("");
  const volumeBD = useMemo(() => BD.fromString(volume), [volume]);
  const [total, setTotal] = useState("");
  const totalBD = useMemo(() => BD.fromString(total), [total]);
  const [partial, setPartial] = useState(false);
  const [missedFillups, setMissedFillups] = useState(false);
  const [fillupTime, setFillupTime] = useState(new Date());
  const [fuelCategory, setFuelCategory] = useState<FuelCategory | "">("");
  const [fuelTypeId, setFuelTypeId] = useState<FuelTypeId | "">("");
  const [deviceLoc, setDeviceLoc] = useState<Location>();
  const [place, _setPlace] = useState<GasStationResponsePlace>();

  const [pName, setPName] = useState("");
  const [pStreet, setPStreet] = useState("");
  const [pCity, setPCity] = useState("");
  const [pState, setPState] = useState("");
  const [pZip, setPZip] = useState("");
  const [pCountry, setPCountry] = useState("");

  const [notes, setNotes] = useState("");
  const [cityDriving, setCityDriving] = useState("50");
  const [freewayDriving, setFreewayDriving] = useState("50");

  const locationRef = useAppState(s => s.sectionRefMap).location;

  const setPlace = (p: GasStationResponsePlace | undefined) => {
    _setPlace(p);
    if (p) {
      setTimeout(() => {
        if (isNotNull(locationRef.current))
          scrollIntoView(locationRef.current, false);
      }, 10);
      setTimeout(() => {
        setPName(p.name);
        if (p.street) setPStreet(p.street);
        if (p.city) setPCity(p.city);
        if (p.state) setPState(p.state);
        if (p.postalCode) setPZip(p.postalCode);
        if (p.country) setPCountry(p.country);
      }, 300);
    }
  };

  const saveDisabled = useMemo(
    () =>
      [tripDistanceBD, currOdometerBD, ppgBD, volumeBD, totalBD].some(
        bd =>
          isNone(bd) || BD.lessThanOrEqualTo(bd.value, BD.unsafeFromNumber(0)),
      ),
    [currOdometerBD, ppgBD, totalBD, tripDistanceBD, volumeBD],
  );

  const action = useMemo(
    () => <Button disabled={saveDisabled}>{t("common.save")}</Button>,
    [saveDisabled, t],
  );
  useEffect(() => {
    setPageAction(action);

    return () => setPageAction(undefined);
  }, [action, setPageAction]);

  useEffect(
    () =>
      runSync(
        gen(function* () {
          if (!fillupInfo.loading && !userData.loading) {
            const info = yield* fillupInfo.value;
            const lastRec = yield* info.lastFillupRecord;

            if (!fuelTypeId) setFuelTypeId(lastRec.fuelTypeId);

            const lastFuelType = yield* fromNullable(
              userData.types.fuelTypes[lastRec.fuelTypeId],
            );
            if (!fuelCategory) setFuelCategory(lastFuelType.category);
          }
        }).pipe(catchTags(ignoreNone)),
      ),
    [fillupInfo, fuelCategory, fuelTypeId, userData],
  );

  const onDistanceBlur = () => {
    if (!fillupInfo.loading) {
      if (O.isNone(tripDistanceBD)) setTripDistance("");
      else {
        const lastOdom = fillupInfo.highestOdometer;
        if (O.isSome(lastOdom))
          setCurrOdometer(
            BD.format(lastOdom.value.pipe(BD.sum(tripDistanceBD.value))),
          );
      }
    }
  };
  const onCurrOdomBlur = () => {
    if (!fillupInfo.loading) {
      if (O.isNone(currOdometerBD)) setCurrOdometer("");
      else {
        const lastOdom = fillupInfo.highestOdometer;
        if (O.isSome(lastOdom))
          setTripDistance(
            BD.format(currOdometerBD.value.pipe(BD.subtract(lastOdom.value))),
          );
      }
    }
  };

  const onPpgOrVolumeBlur = () =>
    runSync(
      gen(function* () {
        const price = yield* ppgBD;
        const vol = yield* volumeBD;

        setTotal(
          BD.format(price.pipe(BD.multiply(vol), MoreBigDecimal.round(2))),
        );
      }).pipe(catchTags(ignoreNone)),
    );

  const onTotalBlur = () =>
    runSync(
      gen(function* () {
        const tot = yield* totalBD;
        const price = yield* ppgBD;

        const vol = tot.pipe(BD.divide(price));

        if (O.isSome(vol)) setVolume(BD.format(vol.value.pipe(BD.scale(4))));
      }).pipe(catchTags(ignoreNone)),
    );

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
            ...f,
            displayName: `${f.name}${f.rating ? ` [${f.rating}]` : ""}`,
          })),
    [userData],
  );

  return (
    <>
      <FormSection section="fillup" label="Fillup Information" first>
        <Stack direction="row" spacing={1}>
          <UnitsTextField
            units="mi"
            size="small"
            variant={variant}
            label="Trip distance"
            value={tripDistance}
            onChange={e => setTripDistance(e.target.value)}
            onBlur={onDistanceBlur}
          />
          <UnitsTextField
            units="mi"
            size="small"
            variant={variant}
            label="Current odometer"
            value={currOdometer}
            onChange={e => setCurrOdometer(e.target.value)}
            onBlur={onCurrOdomBlur}
          />
        </Stack>
        <UnitsTextField
          units="$"
          position="start"
          variant={variant}
          label="Price per gallon"
          value={ppg}
          onChange={e => setPpg(e.target.value)}
          onBlur={onPpgOrVolumeBlur}
        />
        <UnitsTextField
          units="gal"
          variant={variant}
          label="Volume"
          value={volume}
          onChange={e => setVolume(e.target.value)}
          onBlur={onPpgOrVolumeBlur}
        />
        <UnitsTextField
          units="$"
          position="start"
          variant={variant}
          label="Total cost"
          value={total}
          onChange={e => setTotal(e.target.value)}
          onBlur={onTotalBlur}
        />
        <Stack direction="row" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={partial}
                  onChange={e => setPartial(e.target.checked)}
                />
              }
              label="Partial fillup"
              slotProps={{ typography: { noWrap: true } }}
            />
            <MobileInfoIcon tooltip="Check this box if you did not completely fill the tank, so we know not to attempt efficiency calculation." />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={missedFillups}
                  onChange={e => setMissedFillups(e.target.checked)}
                />
              }
              label="Missed fillup(s)"
              slotProps={{ typography: { noWrap: true } }}
            />
            <MobileInfoIcon tooltip="Check this box if you did not record a fillup (or multiple) that happened before this one. Efficiency will be calculated from the last complete fillup." />
          </Stack>
        </Stack>
        <DateTimePicker
          value={fillupTime}
          onChange={date => {
            if (date) setFillupTime(date);
          }}
          slotProps={{ textField: { variant, label: "Fillup time" } }}
        />
      </FormSection>

      <FormSection label="Fuel Information" section="fuel">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1 }}>
          <LabeledSelect<FuelCategory>
            fullWidth
            variant={variant}
            size="small"
            label="Category"
            value={fuelCategory}
            onChange={e => setFuelCategory(e.target.value)}
          >
            {fuelCategories.map(c => (
              <MenuItem key={c} value={c}>
                {String.capitalize(c)}
              </MenuItem>
            ))}
          </LabeledSelect>
          <LabeledSelect
            fullWidth
            variant={variant}
            size="small"
            label="Type"
            disabled={!fuelCategory}
            value={fuelTypeId}
            onChange={e => setFuelTypeId(e.target.value)}
          >
            {userData.loading
              ? []
              : fuelTypes
                  .filter(f => f.category === fuelCategory)
                  .map(f => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.displayName}
                    </MenuItem>
                  ))}
          </LabeledSelect>
        </Stack>
      </FormSection>

      <FormSection label="Location Information" section="location">
        <AddFillupLocation
          variant={variant}
          route={route}
          onLocationSelect={(loc, p) => {
            setDeviceLoc(loc);
            setPlace(p);
          }}
          name={pName}
          onNameChange={setPName}
          street={pStreet}
          onStreetChange={setPStreet}
          city={pCity}
          onCityChange={setPCity}
          state={pState}
          onStateChange={setPState}
          zip={pZip}
          onZipChange={setPZip}
          country={pCountry}
          onCountryChange={setPCountry}
        />
      </FormSection>

      <FormSection label="Other Information" section="other">
        <TextField
          label="Notes"
          variant={variant}
          size="small"
          multiline
          fullWidth
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <Grid2 container spacing={1}>
          <Grid2 size={6}>
            <UnitsTextField
              label="City Driving"
              variant={variant}
              units="%"
              size="small"
              value={cityDriving}
              onChange={e => setCityDriving(e.target.value)}
            />
          </Grid2>
          <Grid2 size={6}>
            <UnitsTextField
              label="Freeway Driving"
              variant={variant}
              units="%"
              size="small"
              value={freewayDriving}
              onChange={e => setFreewayDriving(e.target.value)}
            />
          </Grid2>
        </Grid2>
      </FormSection>
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
      if (O.isSome(vehicleIdOpt)) {
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
                ) : fillupInfo.highestOdometerStr ? (
                  `${fillupInfo.highestOdometerStr} mi`
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
          <AddFillupForm route={route} fillupInfo={fillupInfo} />
        </Stack>
      )}
    </StandardPageBox>
  );
};

export default AddFillup;
