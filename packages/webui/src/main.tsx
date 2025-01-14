import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { green, orange } from "@mui/material/colors";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n.js";
import Loading from "./Loading.js";
import { RouteProvider } from "./router.js";

// eslint-disable-next-line react-refresh/only-export-components
const App = lazy(() => import("./App.js"));

const theme = createTheme({
  colorSchemes: {
    light: { palette: { primary: { main: green[700] }, secondary: orange } },
    dark: { palette: { primary: { main: green[700] }, secondary: orange } },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={<Loading />}>
        <RouteProvider>
          <App />
        </RouteProvider>
      </Suspense>
    </ThemeProvider>
  </StrictMode>,
);
