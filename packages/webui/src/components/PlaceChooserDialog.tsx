import { Location } from "@guzzler/domain";
import { GasStationResponsePlace } from "@guzzler/domain/models/AutosApiModel";
import { MoreArray } from "@guzzler/utils";
import { LocalGasStationTwoTone } from "@mui/icons-material";
import {
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useGeolocation } from "@uidotdev/usehooks";
import { Chunk, Option, pipe, Schema } from "effect";
import { andThen, catchAll, ensuring, logError, sync } from "effect/Effect";
import { LazyArg } from "effect/Function";
import { isNotNullable } from "effect/Predicate";
import { ReactNode, useEffect, useState } from "react";
import { AutosClient } from "../apiclients/AutosClient.js";
import { runP } from "../internal/bootstrap.js";
import { FullScreenDialog } from "./FullScreenDialog.js";

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

const PlaceList = ({ onLocationSelect }: Pick<Props, "onLocationSelect">) => {
  const locationState = useGeolocation({ enableHighAccuracy: true });

  const error = isNotNullable(locationState.error);

  const loadingOrError = locationState.loading || error;

  const [places, setPlaces] = useState(
    MoreArray.empty<GasStationResponsePlace>(),
  );
  const [fetching, setFetching] = useState(false);

  const currentLocation = Schema.decodeUnknownOption(Location.Location)(
    locationState,
  ).pipe(Option.getOrUndefined);

  useEffect(() => {
    if (!loadingOrError && currentLocation && !places.length) {
      setFetching(true);
      void pipe(
        AutosClient.getGasStations("GasStations", currentLocation),
        ensuring(sync(() => setFetching(false))),
        andThen(x => setPlaces(x)),
        catchAll(e => logError("handle this better", e)),
        runP,
      );
    }
  }, [currentLocation, loadingOrError, places.length]);

  useEffect(() => {
    console.log(locationState);
  }, [locationState]);

  return (
    <List>
      {pipe(
        locationState.loading || fetching
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
    <PlaceList onLocationSelect={onLocationSelect} />
  </FullScreenDialog>
);
