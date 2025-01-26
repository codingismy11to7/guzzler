import type { Vehicle } from "@guzzler/domain/Autos";
import { NoteTwoTone } from "@mui/icons-material";
import { Box, Button, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Chunk, Match, Option, pipe } from "effect";
import { isNotUndefined, isUndefined } from "effect/Predicate";
import { useState } from "react";
import { imageUrl } from "../apiclients/ImageClient.js";
import NotesViewerDialog from "../components/NotesViewerDialog.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { useUserData } from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";
import { routes } from "../router.js";

const getDescription = (v: Vehicle) => {
  const carDesc = (() => {
    const { year, make, model, subModel } = v;
    if ([year, make, model, subModel].every(isUndefined)) return undefined;
    else return [year, make, model, subModel].filter(isNotUndefined).join(" ");
  })();

  const { licensePlate: licensePlateStr } = v;
  const licensePlate = licensePlateStr ? (
    <Typography variant="overline" color="textPrimary">
      {licensePlateStr}
    </Typography>
  ) : undefined;

  return [carDesc, licensePlate].every(
    isUndefined,
  ) ? undefined : isNotUndefined(carDesc) && isNotUndefined(licensePlate) ? (
    <>
      <span>{carDesc}, </span>
      {licensePlate}
    </>
  ) : (
    [carDesc, licensePlate].find(isNotUndefined)
  );
};

type Props = Readonly<{ route: ReturnType<typeof routes.Vehicle> }>;

const VehiclePage = ({ route }: Props) => {
  const { t } = useTranslation();

  const userData = useUserData();

  const [notesOpen, setNotesOpen] = useState(false);

  return Match.value(
    (userData.loading ? undefined : userData.vehicles)?.[
      route.params.vehicleId
    ],
  ).pipe(
    Match.when(
      v => !userData.loading && isUndefined(v),
      () => (
        <StandardPageBox>
          <Typography variant="h3">Not Found</Typography>
        </StandardPageBox>
      ),
    ),
    Match.orElse(v => (
      <>
        <Paper square elevation={1}>
          {v?.photoId && Option.isSome(v.photoId) && (
            <Box
              role="img"
              title="vehicle image"
              sx={{
                backgroundImage: `url("${imageUrl(v.photoId)}")`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                height: 150,
                display: "block",
              }}
            />
          )}
          <Stack
            direction="row"
            spacing={1}
            padding={2}
            justifyContent="space-between"
            alignItems="start"
          >
            <Stack direction="column">
              <Typography variant="h5">{v?.name ?? <Skeleton />}</Typography>
              {pipe(
                v ? getDescription(v) : <Skeleton />,
                contents =>
                  contents && (
                    <Typography variant="subtitle2" color="textSecondary">
                      {contents}
                    </Typography>
                  ),
              )}
            </Stack>
            {v?.notes?.trim() && (
              <>
                <Button
                  disabled={notesOpen}
                  size="large"
                  endIcon={<NoteTwoTone />}
                  onClick={() => setNotesOpen(true)}
                >
                  {t("common.notes")}
                </Button>
                <NotesViewerDialog
                  notes={v.notes}
                  onClose={() => setNotesOpen(false)}
                  open={notesOpen}
                />
              </>
            )}
          </Stack>
        </Paper>
        <StandardPageBox>
          {Chunk.makeBy(10, i => (
            /*v?.notes &&*/ <Typography
              key={i}
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              {v?.notes ??
                "Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica"}
            </Typography>
          ))}
        </StandardPageBox>
      </>
    )),
  );
};

export default VehiclePage;
