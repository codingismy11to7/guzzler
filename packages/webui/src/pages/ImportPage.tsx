import { AutosApi, AutosApiModel, TimeZone } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { Check, Close, CloudUpload, ContentCopy } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { Effect, Match, Option, pipe, Struct } from "effect";
import { acquireRelease, andThen, catchAll } from "effect/Effect";
import { LazyArg } from "effect/Function";
import { discriminatorsExhaustive } from "effect/Match";
import { isNotNull } from "effect/Predicate";
import {
  lazy,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { AutosClient } from "../apiclients/AutosClient.js";
import GPlayLogo from "../assets/Google_Play_2022_logo.svg?react";
import { RedactedErrorInfoPanel } from "../components/RedactedErrorInfoPanel.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { VisuallyHiddenInput } from "../components/VisuallyHiddenInput.js";
import { TFunction, useTranslation } from "../i18n.js";
import { runP } from "../internal/runtimes/Main.js";
import { routes } from "../router.js";
import { onEnterKey } from "../utils/onEnterKey.js";

const MobileInfoIconP = () => import("../components/MobileInfoIcon.js");
const MobileInfoIcon = lazy(MobileInfoIconP);

type AbpErrorDialogProps = Readonly<{
  error: AutosApiModel.AbpImportError | RedactedError;
  onClose: LazyArg<void>;
}>;
const AbpErrorDialog = ({ error, onClose }: AbpErrorDialogProps) => {
  const { t } = useTranslation();

  const [showDetails, setShowDetails] = useState(false);

  const getDetails = useCallback(
    () =>
      Match.value(error).pipe(
        Match.tagsExhaustive({
          RedactedError: e => <RedactedErrorInfoPanel e={e} />,

          AbpFileCorruptedError:
            Match.type<AutosApiModel.AbpFileCorruptedError>().pipe(
              discriminatorsExhaustive("type")({
                UnzipError: () =>
                  "The file is corrupted, or it's not an actual .abp file from aCar.",
                XmlParsingError: () =>
                  "An xml file in the backup is corrupted. Or the hamsters are rebelling.",
              }),
            ),

          AbpWrongFormatError:
            Match.type<AutosApiModel.AbpWrongFormatError>().pipe(
              discriminatorsExhaustive("type")({
                UnexpectedOpeningTag: () =>
                  "Something in the data didn't match what we expected.",
                ParseError: () =>
                  "Something in the data didn't match what we expected.",
                MissingBackupFile: () =>
                  "A file we were looking for inside of the backup wasn't there.",
              }),
            ),
        }),
      ),
    [error],
  );

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>{t("errorDialog.title")}</DialogTitle>
      {showDetails && (
        <DialogContent>
          <DialogContentText variant="body2">{getDetails()}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Stack width="100%" direction="row" justifyContent="space-between">
          <Button
            color="secondary"
            size="small"
            onClick={() => setShowDetails(o => !o)}
          >
            {t(`errorDialog.${showDetails ? "hideDetails" : "seeDetails"}`)}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {t("common.close")}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

// TODO remove copypasta
type BackupErrorDialogProps = Readonly<{
  error: AutosApiModel.BackupImportError | RedactedError;
  onClose: LazyArg<void>;
}>;
const BackupErrorDialog = ({ error, onClose }: BackupErrorDialogProps) => {
  const { t } = useTranslation();

  const [showDetails, setShowDetails] = useState(false);

  const [, copyToClipboard] = useCopyToClipboard();

  const getDetails = useCallback(
    () =>
      Match.value(error).pipe(
        Match.tagsExhaustive({
          RedactedError: e => (
            <Stack direction="column" spacing={1}>
              <div>
                Something went wrong on the server. We&apos;ll redouble the
                whipping of the hamsters.
              </div>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                onClick={() => copyToClipboard(e.id)}
              >
                <Typography
                  variant="inherit"
                  fontSize="smaller"
                  color="textDisabled"
                >
                  {`Error id: ${e.id}`}
                </Typography>
                <ContentCopy
                  fontSize="inherit"
                  sx={{ color: theme => theme.palette.text.disabled }}
                />
              </Stack>
            </Stack>
          ),
          BackupFileCorruptedError:
            Match.type<AutosApiModel.BackupFileCorruptedError>().pipe(
              discriminatorsExhaustive("type")({
                UnzipError: () =>
                  "The file is corrupted, or it's not an actual backup file" +
                  ` from ${t("appName")}.`,
              }),
            ),
          BackupWrongFormatError:
            Match.type<AutosApiModel.BackupWrongFormatError>().pipe(
              discriminatorsExhaustive("type")({
                ParseError: () =>
                  "Something in the data didn't match what we expected.",
                MissingBackupFile: () =>
                  "A file we were looking for inside of the backup wasn't there.",
                UnknownBackupVersion: () =>
                  `The backup file seems to be from ${t("appName")}, but perhaps too new of a version?`,
              }),
            ),
        }),
      ),
    [copyToClipboard, error, t],
  );

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>{t("errorDialog.title")}</DialogTitle>
      {showDetails && (
        <DialogContent>
          <DialogContentText variant="body2">{getDetails()}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Stack width="100%" direction="row" justifyContent="space-between">
          <Button
            color="secondary"
            size="small"
            onClick={() => setShowDetails(o => !o)}
          >
            {t(`errorDialog.${showDetails ? "hideDetails" : "seeDetails"}`)}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {t("common.close")}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

type SuccessDialogProps = Readonly<{ open: boolean; onClose: LazyArg<void> }>;
const SuccessDialog = ({ open, onClose }: SuccessDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t("successDialog.title")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t("successDialog.text")}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} fullWidth>
          <Check />
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type ImportSourceCardHeaderProps = Readonly<{
  title: string;
  selected: boolean;
  onClick: LazyArg<void>;
  sourceIconUrl: string;
  actionButton?: ReactNode;
  closeDisabled: boolean;
}>;

const ImportSourceCardHeader = ({
  title,
  selected,
  onClick,
  sourceIconUrl,
  actionButton,
  closeDisabled,
}: ImportSourceCardHeaderProps) => {
  const { t } = useTranslation();

  return (
    <Paper elevation={selected ? 5 : 1} data-test-id="import-card-header-paper">
      <CardHeader
        avatar={
          <img
            src={sourceIconUrl}
            alt={t("importDialog.appIconAltText", { title })}
            style={{ filter: closeDisabled ? "grayscale(1)" : undefined }}
          />
        }
        title={title}
        component={Button}
        disabled={closeDisabled}
        fullWidth
        color="inherit"
        onClick={onClick}
        action={
          selected ? (
            <IconButton component="div" disabled={closeDisabled}>
              <Close />
            </IconButton>
          ) : (
            (actionButton ?? <Box width={40} />)
          )
        }
      />
    </Paper>
  );
};

type UploadProps = Readonly<{
  setCloseDisabled: (disabled: boolean) => void;
}>;

const ACarUpload = ({ setCloseDisabled }: UploadProps) => {
  const { t } = useTranslation();

  const [timezone, setTimezone] = useState<TimeZone.TimeZone | null>(
    pipe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      Option.liftPredicate(TimeZone.isTimeZone),
      Option.getOrNull,
    ),
  );
  const [file, setFile] = useState<File>();
  const [importing, setImporting] = useState(false);

  const [error, setErrorSync] = useState<
    RedactedError | AutosApiModel.AbpImportError
  >();
  const setError = useCallback(
    (e: RedactedError | AutosApiModel.AbpImportError) =>
      Effect.sync(() => setErrorSync(e)),
    [],
  );
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => setCloseDisabled(importing), [importing, setCloseDisabled]);

  const doUpload = useCallback(() => {
    if (isNotNull(timezone) && file) {
      setImporting(true);

      pipe(
        acquireRelease(
          Effect.sync(() => setImporting(true)),
          () => Effect.sync(() => setImporting(false)),
        ),
        andThen(AutosClient.importACarBackup(timezone, file)),
        Effect.scoped,
        andThen(() => setSucceeded(true)),
        catchAll(setError),
        runP,
      );
    }
  }, [file, setError, timezone]);

  const onSuccessAcked = useCallback(() => routes.Vehicles().push(), []);

  return (
    <Stack direction="column" padding={2} spacing={2}>
      {error && (
        <AbpErrorDialog error={error} onClose={() => setErrorSync(undefined)} />
      )}
      <SuccessDialog open={succeeded} onClose={onSuccessAcked} />
      <Stack spacing={1} direction="row" alignItems="center">
        <Autocomplete
          disabled={importing}
          fullWidth
          size="small"
          value={timezone}
          onChange={(_, v) => setTimezone(v)}
          renderInput={params => (
            <TextField
              {...Struct.omit(params, "InputLabelProps")}
              slotProps={{ inputLabel: { ...params.InputLabelProps } }}
              variant="outlined"
              size={params.size === "small" ? "small" : "medium"}
              label={t("importDialog.aCar.timeZone")}
            />
          )}
          options={TimeZone.AllTimeZones}
        />
        <Suspense
          fallback={
            <Skeleton
              variant="rounded"
              width={/* left margin plus size */ 2 + 24}
              height={24}
            />
          }
        >
          <MobileInfoIcon
            tooltip={t("importDialog.aCar.timeZoneInfo")}
            disabled={importing}
          />
        </Suspense>
      </Stack>
      <Typography
        variant="caption"
        color={
          importing
            ? "textDisabled"
            : file
              ? file.name.endsWith(".abp")
                ? "success"
                : "warning"
              : "textPrimary"
        }
      >
        {file
          ? t("importDialog.selectedFile", { fileName: file.name })
          : t("importDialog.noSelectedFile")}
      </Typography>
      <Button
        component="label"
        role="undefined"
        variant="outlined"
        tabIndex={-1}
        startIcon={<CloudUpload />}
        disabled={importing}
      >
        {t("importDialog.pickFile")}
        <VisuallyHiddenInput
          type="file"
          accept=".abp"
          onChange={e => setFile(e.target.files?.item(0) ?? undefined)}
        />
      </Button>
      <Button
        variant="contained"
        disabled={!file || !timezone}
        loading={importing}
        loadingPosition="start"
        onClick={doUpload}
      >
        {t(importing ? "common.loading" : "importDialog.startImport")}
      </Button>
    </Stack>
  );
};

const BackupUpload = ({ setCloseDisabled }: UploadProps) => {
  const { t } = useTranslation();

  const [file, setFile] = useState<File>();
  const [importing, setImporting] = useState(false);

  const [error, setErrorSync] = useState<
    RedactedError | AutosApiModel.BackupImportError
  >();
  const setError = useCallback(
    (e: RedactedError | AutosApiModel.BackupImportError) =>
      Effect.sync(() => setErrorSync(e)),
    [],
  );
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => setCloseDisabled(importing), [importing, setCloseDisabled]);

  const doUpload = useCallback(() => {
    if (file) {
      setImporting(true);

      pipe(
        acquireRelease(
          Effect.sync(() => setImporting(true)),
          () => Effect.sync(() => setImporting(false)),
        ),
        andThen(AutosClient.importGuzzlerBackup(file)),
        Effect.scoped,
        andThen(() => setSucceeded(true)),
        catchAll(setError),
        runP,
      );
    }
  }, [file, setError]);

  const onSuccessAcked = useCallback(() => routes.Vehicles().push(), []);

  return (
    <Stack direction="column" padding={2} spacing={2}>
      {error && (
        <BackupErrorDialog
          error={error}
          onClose={() => setErrorSync(undefined)}
        />
      )}
      <SuccessDialog open={succeeded} onClose={onSuccessAcked} />
      <Typography
        variant="caption"
        color={
          importing
            ? "textDisabled"
            : file
              ? file.name.endsWith(`.${backupExtension(t)}`)
                ? "success"
                : "warning"
              : "textPrimary"
        }
      >
        {file
          ? t("importDialog.selectedFile", { fileName: file.name })
          : t("importDialog.noSelectedFile")}
      </Typography>
      <Button
        component="label"
        role="undefined"
        variant="outlined"
        tabIndex={-1}
        startIcon={<CloudUpload />}
        disabled={importing}
      >
        {t("importDialog.pickFile")}
        <VisuallyHiddenInput
          type="file"
          accept={`.${backupExtension(t)}`}
          onChange={e => setFile(e.target.files?.item(0) ?? undefined)}
        />
      </Button>
      <Button
        variant="contained"
        disabled={!file}
        loading={importing}
        loadingPosition="start"
        onClick={doUpload}
      >
        {t(importing ? "common.loading" : "importDialog.startImport")}
      </Button>
    </Stack>
  );
};

const backupExtension = (t: TFunction) => `${t("appName").toLowerCase()}backup`;

type NameBackupDialogProps = Readonly<{
  onClose: (chosenName?: string) => void;
}>;
const NameBackupDialog = ({ onClose }: NameBackupDialogProps) => {
  const { t } = useTranslation();

  const [name, setName] = useState<string>(
    t("nameBackupDialog.defaultBackupName"),
  );

  const saveDisabled = !name.trim().length;

  const onSave = () => {
    if (!saveDisabled) onClose(name);
  };

  return (
    <Dialog open={true} onClose={() => onClose()} disableRestoreFocus>
      <DialogTitle>{t("importDialog.export")}</DialogTitle>
      <DialogContent>
        <Stack direction="column" spacing={2}>
          <DialogContentText>
            {t("nameBackupDialog.nameLabel")}
          </DialogContentText>
          <TextField
            fullWidth
            autoFocus
            size="small"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={e => e.target.select()}
            onKeyUp={onEnterKey(onSave)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose()}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disabled={saveDisabled} onClick={onSave}>
          {t("nameBackupDialog.export")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type Selection = "guzzler" | "aCar";

const ImportPage = () => {
  const { t } = useTranslation();

  const [selection, _setSelection] = useState<Selection>();
  const [closeDisabled, setCloseDisabled] = useState(false);
  const [nameBackupOpen, setNameBackupOpen] = useState(false);

  const toggleSelection = (selection: Selection) => () => {
    if (!closeDisabled)
      _setSelection(o => (o === selection ? undefined : selection));
  };

  const onExportClick = () => {
    if (!closeDisabled) setNameBackupOpen(true);
  };

  const onNameBackupClose = useCallback(
    (name?: string) => {
      setNameBackupOpen(false);
      if (name) {
        const link = document.createElement("a");
        link.download = `${name}.${backupExtension(t)}`;
        link.href = AutosApi.AutosApi.endpoints[
          AutosApiModel.ExportBackupCallId
        ].path.replace(":backupName", name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [t],
  );

  return (
    <StandardPageBox>
      <Divider>
        <Typography variant="body1" color="textSecondary">
          {t("importDialog.topText")}
        </Typography>
      </Divider>
      <Card
        elevation={selection ? 1 : 0}
        sx={{ backgroundColor: selection ? undefined : "unset" }}
      >
        <Stack direction="column" spacing={2} padding={1}>
          {(!selection || selection === "guzzler") && (
            <ImportSourceCardHeader
              title={t("appName")}
              selected={selection === "guzzler"}
              onClick={toggleSelection("guzzler")}
              sourceIconUrl="/vite.svg"
              closeDisabled={closeDisabled}
            />
          )}
          {(!selection || selection === "aCar") && (
            <ImportSourceCardHeader
              title={t("importDialog.aCar.name")}
              selected={selection === "aCar"}
              onClick={toggleSelection("aCar")}
              sourceIconUrl="/images/fuelly.png"
              closeDisabled={closeDisabled}
              actionButton={
                <IconButton
                  component="a"
                  href={t("importDialog.aCar.downloadUrl")}
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.open(t("importDialog.aCar.downloadUrl"), "_blank");
                  }}
                >
                  <SvgIcon component={GPlayLogo} />
                </IconButton>
              }
            />
          )}
        </Stack>
        {selection && (
          <CardContent>
            <Typography color={closeDisabled ? "textDisabled" : "textPrimary"}>
              {t("importDialog.resetWarning")}
            </Typography>
          </CardContent>
        )}
        {selection === "aCar" && (
          <ACarUpload setCloseDisabled={setCloseDisabled} />
        )}
        {selection === "guzzler" && (
          <BackupUpload setCloseDisabled={setCloseDisabled} />
        )}
      </Card>

      {!selection && (
        <>
          <Divider>
            <Typography variant="body1" color="textSecondary">
              {t("importDialog.or")}
            </Typography>
          </Divider>
          <Card elevation={0} sx={{ backgroundColor: "unset", p: 1 }}>
            <ImportSourceCardHeader
              title={t("importDialog.export")}
              selected={false}
              onClick={onExportClick}
              sourceIconUrl="/vite.svg"
              closeDisabled={closeDisabled}
            />
          </Card>
        </>
      )}

      {nameBackupOpen && <NameBackupDialog onClose={onNameBackupClose} />}
    </StandardPageBox>
  );
};

export default ImportPage;
