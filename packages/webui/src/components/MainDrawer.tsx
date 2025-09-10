import {
  Construction,
  DirectionsCarTwoTone,
  Logout,
  Settings,
  SyncAlt,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Card,
  CardHeader,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Toolbar,
} from "@mui/material";
import { usePrevious } from "@uidotdev/usehooks";
import { LazyArg } from "effect/Function";
import { isNotNull } from "effect/Predicate";
import React, { MouseEvent, useCallback, useEffect } from "react";
import { useCurrentFullSession } from "../contexts/GlobalContext.js";
import { useMainDrawer } from "../hooks/useMainDrawer.js";
import { SwipeCallback, useOnSwipe } from "../hooks/useOnSwipe.js";
import { useTranslation } from "../i18n.js";
import { AppRoute, routes, useRoute } from "../router.js";
import { logout } from "../utils/logout.js";
import { AppLink } from "./AppLink.js";
import { PopupMenuButton } from "./PopupMenuButton.js";

const drawerWidth = 270;

export const MainDrawer = () => {
  const { t } = useTranslation();

  const [open, setOpen] = useMainDrawer();

  const { userInfo, user } = useCurrentFullSession();

  const route = useRoute();
  const prevRoute: AppRoute | null = usePrevious(route);

  useEffect(() => {
    if (isNotNull(prevRoute) && prevRoute.name !== route.name) setOpen(false);
  }, [prevRoute, route.name, setOpen]);

  const onSettingsClick = (closeMenu: LazyArg<void>) => (e: MouseEvent) => {
    e.preventDefault();
    closeMenu();
    routes.Settings().push();
  };
  const onImportClick = (closeMenu: LazyArg<void>) => (e: MouseEvent) => {
    e.preventDefault();
    closeMenu();
    routes.ImportExport().push();
  };

  const onDrawerSwipe: SwipeCallback = useCallback(
    d => {
      if (d === "right") setOpen(false);
    },
    [setOpen],
  );

  const drawerRef = useOnSwipe(onDrawerSwipe);

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="navigation drawer"
    >
      <Drawer
        ModalProps={{ keepMounted: true }}
        anchor="right"
        open={open}
        variant="temporary"
        onClose={() => setOpen(false)}
        elevation={1}
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
        ref={drawerRef}
        slotProps={{
          paper: { elevation: 1, sx: {} },
        }}
      >
        <Card elevation={0}>
          <CardHeader
            avatar={<Avatar alt={userInfo.name} src={userInfo.picture} />}
            title={user.username}
            action={
              <PopupMenuButton
                aria-label="user menu"
                menuItems={closeMenu => [
                  <MenuItem
                    key="settings"
                    onClick={onSettingsClick(closeMenu)}
                    component="a"
                    href={routes.Settings().href}
                  >
                    <ListItemIcon>
                      <Settings fontSize="small" color="primary" />
                    </ListItemIcon>
                    {t("settings.title")}
                  </MenuItem>,
                  <MenuItem
                    key="import"
                    component="a"
                    href={routes.ImportExport().href}
                    onClick={onImportClick(closeMenu)}
                  >
                    <ListItemIcon>
                      <SyncAlt fontSize="small" color="primary" />
                    </ListItemIcon>
                    {t("importDialog.title")}
                  </MenuItem>,
                  <Divider key="div1" />,
                  <MenuItem key="logout" onClick={logout}>
                    <ListItemIcon>
                      <Logout fontSize="small" color="primary" />
                    </ListItemIcon>
                    {t("userMenu.logout")}
                  </MenuItem>,
                ]}
              />
            }
          />
        </Card>
        <List sx={{ overflow: "auto" }}>
          <ListItem disablePadding>
            <ListItemButton
              component={AppLink}
              route={routes.Vehicles()}
              selected={route.name === routes.Vehicles().name}
            >
              <ListItemIcon>
                <DirectionsCarTwoTone color="primary" />
              </ListItemIcon>
              <ListItemText primary={t("vehicles.title")} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={AppLink}
              route={routes.CategoryManagement()}
              selected={route.name === routes.CategoryManagement().name}
            >
              <ListItemIcon>
                <Construction color="primary" />
              </ListItemIcon>
              <ListItemText primary={t("categoryManagement.title")} />
            </ListItemButton>
          </ListItem>
        </List>

        {/* invisible toolbar to push up the bottom */}
        <Toolbar />
      </Drawer>
    </Box>
  );
};
