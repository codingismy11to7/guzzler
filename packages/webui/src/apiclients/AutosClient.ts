import { HttpApiClient } from "@effect/platform";
import { AppApi, AutosApi } from "@guzzler/domain";
import { RedactedError } from "@guzzler/domain/Errors";
import { TimeZone } from "@guzzler/domain/TimeZone";
import { Effect, pipe } from "effect";
import { catchTags } from "effect/Effect";
import { dieFromFatal } from "./utils.js";

export class AutosClient extends Effect.Service<AutosClient>()("AutosClient", {
  accessors: true,
  effect: pipe(
    HttpApiClient.make(AppApi.AppApi),
    Effect.andThen(client => {
      const importACarBackup = (
        tz: TimeZone,
        file: File,
      ): Effect.Effect<
        void,
        | AutosApi.AbpFileCorruptedError
        | AutosApi.AbpWrongFormatError
        | RedactedError
      > => {
        const payload = new FormData();
        payload.set("tz", tz);
        payload.set("abpFile", file);

        return client.autos
          .importACarBackup({ payload })
          .pipe(Effect.catchTags(dieFromFatal));
      };

      const importGuzzlerBackup = (
        file: File,
      ): Effect.Effect<
        void,
        | AutosApi.BackupFileCorruptedError
        | AutosApi.BackupWrongFormatError
        | RedactedError
      > => {
        const payload = new FormData();
        payload.set("backupFile", file);

        return client.autos
          .importBackup({ payload })
          .pipe(catchTags(dieFromFatal));
      };

      return { importACarBackup, importGuzzlerBackup };
    }),
  ),
}) {}
