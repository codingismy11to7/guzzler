import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { green, orange } from "@mui/material/colors";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n.js";
import Loading from "./components/Loading.js";
import { RouteProvider } from "./router.js";

const App = lazy(() => import("./App.js"));

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: green[700] },
        secondary: { main: orange[700] },
      },
    },
    dark: {
      palette: {
        primary: { main: green[700] },
        secondary: { main: orange[700] },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Suspense fallback={<Loading />}>
          <RouteProvider>
            <App />
          </RouteProvider>
        </Suspense>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
);
