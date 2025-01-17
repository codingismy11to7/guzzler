import { HttpApiBuilder } from "@effect/platform";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentFullSession } from "@guzzler/domain/Authentication";
import { gen } from "effect/Effect";
import { ACarFullBackup } from "../../../importers/ACarFullBackup.js";

export const AutosApiLive = HttpApiBuilder.group(AppApi, "autos", handlers =>
  gen(function* () {
    const aCar = yield* ACarFullBackup;

    return handlers.handle("importACarBackup", ({ payload: { tz, abpFile } }) =>
      gen(function* () {
        const { user } = yield* CurrentFullSession;

        const [file] = abpFile;

        yield* aCar.import(user.username, tz, file.path);
      }),
    );
  }),
);
