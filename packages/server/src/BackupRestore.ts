import { FileSystem } from "@effect/platform";
import { AutosApiModel } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import { Effect, flow } from "effect";
import { andThen, gen } from "effect/Effect";
import { catchTags } from "effect/Stream";
import { AutosStorage } from "./AutosStorage.js";
import * as internal from "./internal/backupRestore.js";
import { Zip } from "./Zip.js";

export class BackupRestore extends Effect.Service<BackupRestore>()(
  "BackupRestore",
  {
    accessors: true,
    effect: gen(function* () {
      const autos = yield* AutosStorage;
      const txns = yield* MongoTransactions;
      const zip = yield* Zip;
      const fs = yield* FileSystem.FileSystem;
      const rand = yield* RandomId;

      const getBackupStream = flow(
        internal.getBackupStream(autos, zip),
        catchTags({
          DocumentNotFound: e => RedactedError.provideLogged(rand)(e.message),
          MongoError: e => RedactedError.provideLogged(rand)(e.cause),
          ZipError: e =>
            Effect.logError(
              "Error creating backup from archiver",
              e.cause,
            ).pipe(andThen(new AutosApiModel.ZipError())),
        }),
      );

      const importFromGuzzlerBackup = flow(
        internal.importFromGuzzlerBackup(autos, txns, zip, fs),
        Effect.scoped,
        Effect.tapError(e => Effect.logError(e.message)),
        Effect.catchTags({
          MissingBackupFile: () =>
            new AutosApiModel.BackupWrongFormatError({
              type: "MissingBackupFile",
            }),
          ParseError: () =>
            new AutosApiModel.BackupWrongFormatError({ type: "ParseError" }),
          WrongVersionError: () =>
            new AutosApiModel.BackupWrongFormatError({
              type: "UnknownBackupVersion",
            }),
          UnzipError: () =>
            new AutosApiModel.BackupFileCorruptedError({ type: "UnzipError" }),
          SystemError: RedactedError.logged,
          MongoError: RedactedError.logged,
        }),
      );

      return {
        getBackupStream,
        importFromGuzzlerBackup,
      };
    }),
  },
) {}
