import { Effect, pipe } from "effect";
import { ProdMode, ServerInfo } from "../../AppConfig.js";

export const logServiceStarting = pipe(
  ProdMode.isProdMode,
  Effect.andThen(prodMode =>
    pipe(
      Effect.logInfo(
        `Service starting in ${prodMode ? "production" : "development"} mode`,
      ),
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
  ServerInfo.version,
  Effect.andThen(version => Effect.logInfo(`Version ${version}`)),
);
