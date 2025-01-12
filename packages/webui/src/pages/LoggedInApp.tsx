import viteLogo from "/vite.svg";
import { FullSession } from "@guzzler/domain/apis/SessionApi";
import { Todo, TodoId } from "@guzzler/domain/apis/TodosApi";
import { Option } from "effect";
import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { AccountClient } from "../apiclients/AccountClient.js";
import { TodosClient } from "../apiclients/TodosClient.js";
import reactLogo from "../assets/react.svg";
import { runP } from "../bootstrap.js";
import { FullSessionContext, useCurrentFullSession } from "../GlobalContext.js";
import { useTranslation } from "../i18n.js";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Logout,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Settings,
} from "@mui/icons-material";
import { PopupMenuButton } from "../components/PopupMenuButton.js";
import { logout } from "../utils/logout.js";

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

const iOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

const BottomAppBar = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false);

  const { userInfo, user } = useCurrentFullSession();

  return (
    <>
      <Paper square sx={{ pb: "50px" }}>
        <Typography variant="h5" gutterBottom component="div" sx={{ p: 2, pb: 0 }}>
          Home
        </Typography>
        {children}
      </Paper>
      <AppBar
        position="fixed"
        color="primary"
        sx={{ top: "auto", bottom: 0, zIndex: theme => 1 + theme.zIndex.drawer }}
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
          <IconButton color="inherit" aria-label="open drawer" onClick={() => setOpen(o => !o)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="navigation drawer">
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
          sx={{ "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
          PaperProps={{ elevation: 1, sx: {} }}
        >
          <Card elevation={0}>
            <CardHeader
              avatar={<Avatar alt={userInfo.name} src={userInfo.picture} />}
              title={user.username}
              action={
                <PopupMenuButton
                  aria-label="user menu"
                  menuItems={[
                    <MenuItem key="settings">
                      <ListItemIcon>
                        <Settings fontSize="small" />
                      </ListItemIcon>
                      Settings
                    </MenuItem>,
                    <Divider key="div1" />,
                    <MenuItem key="logout" onClick={logout}>
                      <ListItemIcon>
                        <Logout fontSize="small" />
                      </ListItemIcon>
                      Logout
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
                  <ListItemIcon>{index % 2 === 0 ? <Logout /> : <Settings />}</ListItemIcon>
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

const LoggedInApp = (session: FullSession) => {
  const { t } = useTranslation();
  const [todos, setTodos] = useState<readonly Todo[]>([]);
  const [text, setText] = useState("");

  const fetchTodos = useCallback(() => runP(TodosClient.list).then(setTodos), []);

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    void fetchTodos();
    const handle = setInterval(fetchTodos, 20000);
    return () => clearInterval(handle);
  }, [fetchTodos]);

  const addTodo = useCallback(
    () =>
      runP(TodosClient.create(text))
        .then(fetchTodos)
        .then(() => setText("")),
    [fetchTodos, text],
  );

  const setDone = useCallback(
    (id: TodoId, done: boolean) => runP(TodosClient.edit(id, { done })).then(fetchTodos),
    [fetchTodos],
  );

  const doDelete = useCallback(
    (id: TodoId) => {
      if (window.confirm("Are you sure?")) {
        void runP(TodosClient.remove(id)).then(fetchTodos);
      }
    },
    [fetchTodos],
  );

  const view = useCallback(
    (id: TodoId) =>
      void runP(TodosClient.fetch(id)).then(
        Option.match({
          onNone: () => window.alert("it got deleted? refresh?"),
          // this isn't true, maybe we delete this lint? but this is junk code anyway

          onSome: todo => window.alert(`got todo ${JSON.stringify(todo)}`),
        }),
      ),

    [],
  );

  const onDeleteClick = () => {
    if (window.confirm("Are you sure?")) {
      void runP(AccountClient.deleteAccount());
    }
  };

  return (
    <FullSessionContext.Provider value={session}>
      <BottomAppBar>
        <p>{t("appName")}</p>
        <div>
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <div className="card">
          <button onClick={onDeleteClick}>Delete Account</button>
          <p>something something fill space</p>
        </div>
        {todos.map(todo => (
          <div key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={e => setDone(todo.id, e.target.checked)} />{" "}
            <span style={{ textDecoration: todo.done ? "line-through" : undefined }}>{todo.text}</span>{" "}
            <button onClick={() => doDelete(todo.id)}>🗑️</button>
            <button onClick={() => view(todo.id)}>🔎</button>
          </div>
        ))}
        <div>
          <input type="text" value={text} onChange={e => setText(e.target.value)} />
          <button onClick={addTodo}>Add</button>
        </div>
        <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
      </BottomAppBar>
    </FullSessionContext.Provider>
  );
};

export default LoggedInApp;
