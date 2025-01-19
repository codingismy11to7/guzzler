import { FullSession } from "@guzzler/domain/apis/SessionApi";
import {
  Add as AddIcon,
  Logout,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Settings,
  SyncAlt,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Card,
  CardHeader,
  Divider,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  styled,
  SwipeableDrawer,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { Match } from "effect";
import { LazyArg } from "effect/Function";
import React, { lazy, PropsWithChildren, Suspense, useState } from "react";
import { PopupMenuButton } from "../components/PopupMenuButton.js";
import { FullSessionContext, useCurrentFullSession } from "../GlobalContext.js";
import { useTranslation } from "../i18n.js";
import Loading from "../Loading.js";
import { PagesRoute, routes } from "../router.js";
import { logout } from "../utils/logout.js";

const HomePage = lazy(() => import("./HomePage.js"));
const ImportPage = lazy(() => import("./ImportPage.js"));

const StyledFab = styled(Fab)({
  position: "absolute",
  zIndex: 1,
  top: -30,
  left: 0,
  right: 0,
  margin: "0 auto",
});

const drawerWidth = 270;
const drawerBleeding = 50;

const iOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

const BottomAppBar = ({
  route,
  children,
}: { route: PagesRoute } & PropsWithChildren) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [open, setOpen] = useState(false);

  const { userInfo, user } = useCurrentFullSession();

  const onImportClick = (closeMenu: LazyArg<void>) => () => {
    closeMenu();
    setOpen(false);
    setTimeout(
      () => routes.ImportExport().push(),
      theme.transitions.duration.standard,
    );
  };

  const title = Match.value(route).pipe(
    Match.discriminatorsExhaustive("name")({
      Home: () => "Home",
      ImportExport: () => t("importDialog.title"),
    }),
  );

  return (
    <>
      <Paper square elevation={10} sx={{ height: "100vh", pb: "50px" }}>
        <Paper square elevation={1} sx={{ pb: 1 }}>
          <Typography
            variant="h5"
            gutterBottom
            component="div"
            sx={{ p: 2, pb: 0 }}
          >
            {title}
          </Typography>
        </Paper>
        <Suspense fallback={<Loading />}>
          <Box padding={2}>{children}</Box>
        </Suspense>
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
          <StyledFab color="secondary" aria-label="add">
            <AddIcon />
          </StyledFab>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setOpen(o => !o)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation drawer"
      >
        <SwipeableDrawer
          disableDiscovery={iOS}
          ModalProps={{ keepMounted: true }}
          anchor="right"
          open={open}
          variant="temporary"
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          elevation={1}
          swipeAreaWidth={drawerBleeding}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          PaperProps={{ elevation: 1, sx: {} }}
        >
          <Card elevation={0}>
            <CardHeader
              avatar={<Avatar alt={userInfo.name} src={userInfo.picture} />}
              title={user.username}
              action={
                <PopupMenuButton
                  aria-label="user menu"
                  menuItems={closeMenu => [
                    <MenuItem key="settings">
                      <ListItemIcon>
                        <Settings fontSize="small" />
                      </ListItemIcon>
                      Settings
                    </MenuItem>,
                    <MenuItem key="import" onClick={onImportClick(closeMenu)}>
                      <ListItemIcon>
                        <SyncAlt fontSize="small" />
                      </ListItemIcon>
                      {t("importDialog.title")}
                    </MenuItem>,
                    <Divider key="div1" />,
                    <MenuItem key="logout" onClick={logout}>
                      <ListItemIcon>
                        <Logout fontSize="small" />
                      </ListItemIcon>
                      {t("userMenu.logout")}
                    </MenuItem>,
                  ]}
                />
              }
            />
          </Card>
          <List sx={{ overflow: "auto" }}>
            {["Nav 1", "Nav 2"].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    {index % 2 === 0 ? <Logout /> : <Settings />}
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {/* invisible toolbar to push up the bottom */}
          <Toolbar />
        </SwipeableDrawer>
      </Box>
    </>
  );
};

type Props = Readonly<{ route: PagesRoute; session: FullSession }>;

const LoggedInApp = ({ route, session }: Props) => (
  <FullSessionContext.Provider value={session}>
    <BottomAppBar route={route}>
      {Match.value(route).pipe(
        Match.discriminatorsExhaustive("name")({
          Home: () => <HomePage />,
          ImportExport: () => <ImportPage />,
        }),
      )}
    </BottomAppBar>
  </FullSessionContext.Provider>
);

export default LoggedInApp;
