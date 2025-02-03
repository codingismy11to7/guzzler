import { Location } from "@guzzler/domain";
import { GasStationResponsePlace } from "@guzzler/domain/models/AutosApiModel";
import { MoreArray } from "@guzzler/utils";
import {
  ArrowRightTwoTone,
  CloudOffTwoTone,
  ErrorTwoTone,
  HelpTwoTone,
  LocalGasStationTwoTone,
  NearMeDisabledTwoTone,
  OpenInNewTwoTone,
} from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { GeolocationState, useGeolocation } from "@uidotdev/usehooks";
import {
  Chunk,
  Effect,
  Match as M,
  Option as O,
  pipe,
  Schema as S,
} from "effect";
import { andThen, catchAll, ensuring, sync } from "effect/Effect";
import { LazyArg } from "effect/Function";
import { isNotNullable } from "effect/Predicate";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AutosClient,
  GasStationFetchError,
} from "../apiclients/AutosClient.js";
import { useTranslation } from "../i18n.js";
import { runP } from "../internal/bootstrap.js";
import { routes } from "../router.js";
import { AppLink } from "./AppLink.js";
import { FullScreenDialog } from "./FullScreenDialog.js";
import { RedactedErrorInfoPanel } from "./RedactedErrorInfoPanel.js";

type PlaceListItemProps = Readonly<{
  displayName?: ReactNode;
  secondaryText?: ReactNode;
  onClick?: LazyArg<void>;
}>;
const PlaceListItem = ({
  displayName = <Skeleton />,
  onClick,
  secondaryText = <Skeleton />,
}: PlaceListItemProps) => (
  <ListItem disablePadding>
    <ListItemButton onClick={onClick}>
      <ListItemAvatar>
        <LocalGasStationTwoTone />
      </ListItemAvatar>
      <ListItemText primary={displayName} secondary={secondaryText} />
    </ListItemButton>
  </ListItem>
);

type DisplayErrorProps = Readonly<{
  locStateError: GeolocationState["error"];
  fetchError: GasStationFetchError | undefined;
  onClose: LazyArg<void>;
}>;
const DisplayError = ({
  locStateError,
  fetchError,
  onClose,
}: DisplayErrorProps) => {
  const { t } = useTranslation();

  return (
    <Snackbar
      open={!!locStateError || !!fetchError}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      onClose={onClose}
    >
      <Alert
        color="error"
        icon={
          fetchError ? (
            M.value(fetchError).pipe(
              M.tagsExhaustive({
                BadGateway: () => <CloudOffTwoTone />,
                RedactedError: () => <ErrorTwoTone />,
                NoMapsApiKeySet: () => <HelpTwoTone />,
              }),
            )
          ) : (
            <NearMeDisabledTwoTone />
          )
        }
        onClose={onClose}
      >
        <AlertTitle>{t("addFillups.nearbySearch.errorTitle")}</AlertTitle>
        {locStateError
          ? t("addFillups.nearbySearch.locationDisabled")
          : fetchError
            ? M.value(fetchError).pipe(
                M.tagsExhaustive({
                  BadGateway: () => t("addFillups.nearbySearch.badGateway"),

                  RedactedError: e => <RedactedErrorInfoPanel e={e} />,

                  NoMapsApiKeySet: () => (
                    <>
                      <Box>
                        {t("addFillups.nearbySearch.noMapsKey.text01Preamble")}
                      </Box>
                      <Button
                        size="large"
                        endIcon={<OpenInNewTwoTone />}
                        target="_blank"
                        href={t("settings.setKey.keyUrl")}
                        component="a"
                      >
                        {t(
                          "addFillups.nearbySearch.noMapsKey.text02CreateButton",
                        )}
                      </Button>
                      <Box>
                        {t("addFillups.nearbySearch.noMapsKey.text03AndThen")}
                      </Box>
                      <Button
                        size="large"
                        endIcon={<ArrowRightTwoTone />}
                        component={AppLink}
                        route={routes.Settings()}
                      >
                        {t(
                          "addFillups.nearbySearch.noMapsKey.text04ProvideItButton",
                        )}
                      </Button>
                      <Box>
                        {t("addFillups.nearbySearch.noMapsKey.text05Fin")}
                      </Box>
                    </>
                  ),
                }),
              )
            : ""}
      </Alert>
    </Snackbar>
  );
};

const PlaceList = ({
  onLocationSelect,
  onClose,
}: Pick<Props, "onLocationSelect" | "onClose">) => {
  const locState = useGeolocation({ enableHighAccuracy: true });

  const locError = isNotNullable(locState.error);

  const loadingOrError = locState.loading || locError;

  const [places, setPlaces] = useState(
    MoreArray.empty<GasStationResponsePlace>(),
  );
  const [fetching, setFetching] = useState(false);

  const currentLocation = useMemo(
    () =>
      S.decodeUnknownOption(Location.Location)(locState).pipe(O.getOrUndefined),
    [locState],
  );

  const [fetchError, setFetchError] = useState<GasStationFetchError>();

  useEffect(() => {
    if (!loadingOrError && currentLocation && !places.length) {
      setFetching(true);
      void pipe(
        AutosClient.getGasStations("GasStations", currentLocation),
        ensuring(sync(() => setFetching(false))),
        andThen(x => setPlaces(x)),
        catchAll(e => Effect.sync(() => setFetchError(e))),
        runP,
      );
    }
  }, [currentLocation, loadingOrError, places.length]);

  return (
    <>
      <List>
        {pipe(
          locState.loading || fetching || locState.error || fetchError
            ? Chunk.makeBy(20, i => <PlaceListItem key={i} />)
            : places.map((p, idx) => (
                <PlaceListItem
                  key={idx}
                  displayName={
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>{p.name}</Typography>
                      <Typography variant="caption">
                        {p.distanceFromSearchLocation}
                      </Typography>
                    </Stack>
                  }
                  secondaryText={p.shortAddress}
                  onClick={() => onLocationSelect(currentLocation, p)}
                />
              )),
          MoreArray.intersperse(i => (
            <Divider component="li" key={`divider${i}`} />
          )),
        )}
      </List>
      <DisplayError
        fetchError={fetchError}
        locStateError={locState.error}
        onClose={onClose}
      />
    </>
  );
};

type Props = Readonly<{
  open: boolean;
  onClose: LazyArg<void>;
  onLocationSelect: (
    deviceLocation: Location.Location | undefined,
    place: GasStationResponsePlace,
  ) => void;
}>;

export const PlaceChooserDialog = ({
  open,
  onClose,
  onLocationSelect,
}: Props) => (
  <FullScreenDialog open={open} onClose={onClose}>
    <PlaceList onLocationSelect={onLocationSelect} onClose={onClose} />
  </FullScreenDialog>
);
