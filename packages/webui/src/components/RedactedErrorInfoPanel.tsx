import { Errors } from "@guzzler/domain";
import { ContentCopy } from "@mui/icons-material";
import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useState } from "react";
import { useTranslation } from "../i18n.js";

export const RedactedErrorInfoPanel = ({ e }: { e: Errors.RedactedError }) => {
  const { t } = useTranslation();

  const [, copyToClipboard] = useCopyToClipboard();

  const [showCopied, setShowCopied] = useState(false);

  const doCopy = (id: string) => () =>
    void copyToClipboard(id)
      .then(() => setShowCopied(true))
      .catch(() => {
        /* whatever, ignore error */
      });

  return (
    <>
      <Snackbar
        open={showCopied}
        autoHideDuration={2000}
        onClose={() => setShowCopied(false)}
      >
        <Alert severity="success">Copied</Alert>
      </Snackbar>
      <Stack direction="column" spacing={1}>
        <Box>{t("redactedErrorPanel.message")}</Box>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          onClick={doCopy(e.id)}
        >
          <Typography variant="inherit" fontSize="smaller" color="textDisabled">
            {t("redactedErrorPanel.errorId", { id: e.id })}
          </Typography>
          <ContentCopy
            fontSize="inherit"
            sx={{ color: theme => theme.palette.text.disabled }}
          />
        </Stack>
      </Stack>
    </>
  );
};
