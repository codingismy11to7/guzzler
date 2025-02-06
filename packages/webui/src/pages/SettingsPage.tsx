import { SecureUserPreferences } from "@guzzlerapp/domain";
import { Lock, LockOpen, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { flow, Option, pipe, Redacted, Schema } from "effect";
import { andThen, catchTags, logWarning } from "effect/Effect";
import { LazyArg } from "effect/Function";
import { isNotUndefined, isUndefined } from "effect/Predicate";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { PreferencesClient } from "../apiclients/PreferencesClient.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { useTranslation } from "../i18n.js";
import { runP } from "../internal/bootstrap.js";
import SecureUserPreferencesFields = SecureUserPreferences.SecureUserPreferencesFields;
import SecureUserPreferencesPatch = SecureUserPreferences.SecureUserPreferencesPatch;

type GMapsDialogProps = Readonly<{
  open: boolean;
  onClose: LazyArg<void>;
  prefs: SecureUserPreferencesFields;
}>;
const GMapsDialog = ({ open, onClose, prefs }: GMapsDialogProps) => {
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);
  const [key, setKey] = useState<string>();

  const doClose = () => {
    setShowPassword(false);
    setKey(undefined);
    onClose();
  };

  const onKeyChange = (value: string) =>
    setKey(
      !value.trim()
        ? Option.isSome(prefs.googleMapsApiKey)
          ? ""
          : undefined
        : Option.contains(
              prefs.googleMapsApiKey.pipe(Option.map(Redacted.value)),
              value.trim(),
            )
          ? undefined
          : value.trim(),
    );

  const doSave = () => {
    if (isNotUndefined(key)) {
      pipe(
        PreferencesClient.updateSecurePreferences(
          SecureUserPreferencesPatch.make({
            googleMapsApiKey: !key
              ? { remove: true }
              : Option.some(Redacted.make(key)),
          }),
        ),
        andThen(doClose),
        catchTags({
          RedactedError: e =>
            logWarning("Not sure what I want to do with this error", e),
        }),
        runP,
      );
    }
  };

  return (
    <Dialog open={open} onClose={doClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("settings.gmapsApiKey")}</DialogTitle>
      <DialogContent>
        <TextField
          onChange={e => onKeyChange(e.target.value)}
          value={
            key ??
            prefs.googleMapsApiKey.pipe(
              Option.map(Redacted.value),
              Option.getOrElse(() => ""),
            )
          }
          fullWidth
          size="small"
          type={showPassword ? "text" : "password"}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showPassword
                        ? "hide the password"
                        : "display the password"
                    }
                    onClick={() => setShowPassword(o => !o)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Stack direction="row" sx={{ width: 1 }} justifyContent="space-between">
          <Button
            variant="outlined"
            component="a"
            target="_blank"
            href="https://developers.google.com/maps/documentation/javascript/get-api-key"
          >
            API Key?
          </Button>
          <Button
            variant="contained"
            disabled={isUndefined(key)}
            onClick={doSave}
          >
            {t("common.save")}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

const SettingsPage = () => {
  const { t } = useTranslation();

  const [mapsKeyOpen, setMapsKeyOpenState] = useState(false);
  const [prefs, setPrefs] = useState(
    Schema.decodeUnknownSync(SecureUserPreferencesFields)({}),
  );

  const fetchPrefs = useCallback(
    (): void =>
      void pipe(
        PreferencesClient.fetchSecurePreferences,
        andThen(p => setPrefs(p)),
        runP,
      ),
    [],
  );

  const setMapsKeyOpen: Dispatch<SetStateAction<boolean>> = flow(
    setMapsKeyOpenState,
    fetchPrefs,
  );

  useEffect(() => fetchPrefs(), [fetchPrefs]);

  return (
    <StandardPageBox component={List}>
      <Paper>
        <ListItemButton onClick={() => setMapsKeyOpen(true)}>
          <ListItemIcon>
            {Option.isSome(prefs.googleMapsApiKey) ? (
              <Lock color="success" />
            ) : (
              <LockOpen />
            )}
          </ListItemIcon>
          <ListItemText
            primary={t("settings.gmapsApiKey")}
            secondary={t("settings.gmapsApiKeyDescription")}
          />
        </ListItemButton>
      </Paper>

      <GMapsDialog
        onClose={() => setMapsKeyOpen(false)}
        open={mapsKeyOpen}
        prefs={prefs}
      />
    </StandardPageBox>
  );
};

export default SettingsPage;
