import { HttpApiClient } from "@effect/platform";
import { AppApi, AutosApi } from "@guzzler/domain";
import { RedactedError } from "@guzzler/domain/Errors";
import { TimeZone } from "@guzzler/domain/TimeZone";
import { Effect, pipe } from "effect";
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
        AutosApi.FileCorruptedError | AutosApi.WrongFormatError | RedactedError
      > => {
        const payload = new FormData();
        payload.set("tz", tz);
        payload.set("abpFile", file);

        return client.autos
          .importACarBackup({ payload })
          .pipe(Effect.catchTags(dieFromFatal));
      };

      return { importACarBackup };
    }),
  ),
}) {}
