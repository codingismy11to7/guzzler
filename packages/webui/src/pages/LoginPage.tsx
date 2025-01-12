import { AuthApi } from "@guzzler/domain";
import { Backdrop, Button } from "@mui/material";
import React from "react";
import { useTranslation } from "../i18n.js";
import { GoogleIcon } from "../images/icons/GoogleIcon.js";

const LoginButton = () => {
  const { t } = useTranslation();
  return (
    <Button
      size="large"
      variant="contained"
      color="primary"
      startIcon={<GoogleIcon />}
      component="a"
      href={AuthApi.AuthApi.endpoints[AuthApi.StartGoogleLogin].path}
    >
      {t("login.continue")}
    </Button>
  );
};

export const LoginPage = () => (
  <Backdrop open={true}>
    <LoginButton />
  </Backdrop>
);
