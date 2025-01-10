import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./i18n.js";
import Loading from "./Loading.js";
import { RouteProvider } from "./router.js";

const theme = createTheme({ colorSchemes: { dark: true } });

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
