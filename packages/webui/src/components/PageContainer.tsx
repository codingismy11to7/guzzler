import {
  CheckCircle,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { Match } from "effect";
import React, { PropsWithChildren, Suspense } from "react";
import { useSucceededGlobalContext_Unsafe } from "../contexts/GlobalContext.js";
import { useMainDrawer } from "../hooks/useMainDrawer.js";
import { useTranslation } from "../i18n.js";
import { PagesRoute, routes } from "../router.js";
import { AppLink } from "./AppLink.js";
import { AppSpeedDial } from "./AppSpeedDial.js";
import Loading from "./Loading.js";
import { MainDrawer } from "./MainDrawer.js";

export const PageContainer = ({
  route,
  children,
}: { route: PagesRoute } & PropsWithChildren) => {
  const { t } = useTranslation();
  const { connected } = useSucceededGlobalContext_Unsafe();

  const [, setDrawerOpen] = useMainDrawer();

  const title = Match.value(route).pipe(
    Match.discriminatorsExhaustive("name")({
      AddFillup: () => "Add Fillup",
      CategoryManagement: () => t("categoryManagement.title"),
      Home: () => "Home",
      ImportExport: () => t("importDialog.title"),
      Settings: () => t("settings.title"),
      Vehicle: () => t("vehicle.title"),
      Vehicles: () => t("vehicles.title"),
    }),
  );

  return (
    <>
      <Paper square elevation={10} sx={{ height: "100vh", pb: "50px" }}>
        <Stack direction="column" height="100%">
          <Paper square elevation={1}>
            <Typography
              variant="h5"
              gutterBottom
              component="div"
              sx={{ p: 1, pb: 0 }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <AppLink route={routes.Home()}>
                  <img src="/vite.svg" alt={`${t("appName")} logo`} />
                </AppLink>
                <span>{title}</span>
                <Box sx={{ flexGrow: 1 }} />
                <Stack sx={{ pr: 1 }}>
                  {connected ? (
                    <Tooltip title="Connected to Server">
                      <CheckCircle color="success" />
                    </Tooltip>
                  ) : (
                    <CircularProgress color="warning" size={24} />
                  )}
                </Stack>
              </Stack>
            </Typography>
          </Paper>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </Stack>
      </Paper>
      <AppBar
        position="fixed"
        color="primary"
        sx={{
          top: "auto",
          bottom: 0,
          zIndex: theme => 1 + theme.zIndex.drawer,
        }}
      >
        <Toolbar>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
          <IconButton color="inherit" aria-label="search">
            <SearchIcon />
          </IconButton>

          <AppSpeedDial />

          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(o => !o)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <MainDrawer />
    </>
  );
};
