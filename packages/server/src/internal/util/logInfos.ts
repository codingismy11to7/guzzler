import PkgJson from "@npmcli/package-json";
import { Effect, pipe } from "effect";
import { AppConfig } from "../../AppConfig.js";

export const logServiceStarting = pipe(
  AppConfig.prodMode,
  Effect.andThen(prodMode =>
    pipe(
      Effect.logInfo(`Service starting in ${prodMode ? "production" : "development"} mode`),
      Effect.andThen(
        pipe(
          Effect.logWarning("You must be running webui > dev to get a UI"),
          Effect.unless(() => prodMode),
        ),
      ),
    ),
  ),
);

export const logVersion = pipe(
  Effect.promise(() => PkgJson.load(".", { create: false })),
  Effect.andThen(pkgJson => Effect.logInfo(`Version ${pkgJson.content.version}`)),
);
