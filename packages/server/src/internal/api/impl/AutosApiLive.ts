import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { ExportBackupCallId } from "@guzzler/domain/apis/AutosApi";
import { AppApi } from "@guzzler/domain/AppApi";
import { CurrentFullSession } from "@guzzler/domain/Authentication";
import { gen } from "effect/Effect";
import { BackupRestore } from "../../../BackupRestore.js";
import { ACarFullBackup } from "../../../importers/ACarFullBackup.js";

export const AutosApiLive = HttpApiBuilder.group(AppApi, "autos", handlers =>
  gen(function* () {
    const aCar = yield* ACarFullBackup;
    const { getBackupStream, importFromGuzzlerBackup } = yield* BackupRestore;

    return handlers
      .handleRaw(ExportBackupCallId, ({ path: { backupName } }) =>
        gen(function* () {
          const { user } = yield* CurrentFullSession;

          return HttpServerResponse.stream(
            getBackupStream(user.username, backupName),
          );
        }),
      )
      .handle("importACarBackup", ({ payload: { tz, abpFile } }) =>
        gen(function* () {
          const { user } = yield* CurrentFullSession;

          const [file] = abpFile;

          yield* aCar.import(user.username, tz, file.path);
        }),
      )
      .handle("importBackup", ({ payload: { backupFile } }) =>
        gen(function* () {
          const { user } = yield* CurrentFullSession;

          const [file] = backupFile;

          yield* importFromGuzzlerBackup(user.username, file.path);
        }),
      );
  }),
);
