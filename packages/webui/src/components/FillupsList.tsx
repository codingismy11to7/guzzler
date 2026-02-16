import type { VehicleId } from "@guzzlerapp/domain/models/Autos";
import {
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { BigDecimal, Chunk, Option, pipe } from "effect";
import { StandardPageBox } from "./StandardPageBox.js";
import { useFillupInformationForVehicle } from "../hooks/useUserData.js";

const formatBD = (bd: BigDecimal.BigDecimal, scale = 2) =>
  pipe(bd, BigDecimal.scale(scale), BigDecimal.format);

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

type Props = Readonly<{ vehicleId: VehicleId }>;

export const FillupsList = ({ vehicleId }: Props) => {
  const fillupInfo = useFillupInformationForVehicle(vehicleId);

  if (fillupInfo.loading) return null;

  const fillups = fillupInfo.value.pipe(
    Option.map(v => v.fillupsByDate),
    Option.getOrElse(() => Chunk.empty()),
  );

  if (Chunk.isEmpty(fillups)) {
    return (
      <StandardPageBox>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          No fillups recorded yet.
        </Typography>
      </StandardPageBox>
    );
  }

  const reversed = Chunk.reverse(fillups);

  return (
    <StandardPageBox pOverride={0}>
      <List disablePadding>
        {Chunk.toReadonlyArray(reversed).map(f => (
          <ListItem key={f.id} divider>
            <ListItemText
              primary={formatDate(f.date)}
              secondary={
                <Stack component="span" spacing={0.5}>
                  <span>
                    {formatBD(f.odometerReading, 1)} mi &middot;{" "}
                    {formatBD(f.volume)} gal &middot; ${formatBD(f.totalCost)}
                  </span>
                  {Option.isSome(f.fuelEfficiency) && (
                    <span>{f.fuelEfficiency.value.toFixed(1)} mpg</span>
                  )}
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>
    </StandardPageBox>
  );
};
