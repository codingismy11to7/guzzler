import { FileSystem } from "@effect/platform";
import { AutosModel } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { Username } from "@guzzlerapp/domain/User";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import { Effect, flow } from "effect";
import { andThen, gen, logError, scoped, tapError } from "effect/Effect";
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
            logError("Error creating backup from archiver", e.cause).pipe(
              andThen(new AutosModel.ZipError()),
            ),
        }),
      );

      const importFromGuzzlerBackup: (
        username: Username,
        filePath: string,
      ) => Effect.Effect<
        void,
        | AutosModel.BackupWrongFormatError
        | AutosModel.BackupFileCorruptedError
        | RedactedError,
        RandomId
      > = flow(
        internal.importFromGuzzlerBackup(autos, txns, zip, fs),
        scoped,
        tapError(e => logError(e.message)),
        Effect.catchTags({
          MissingBackupFile: () =>
            new AutosModel.BackupWrongFormatError({
              type: "MissingBackupFile",
            }),
          ParseError: () =>
            new AutosModel.BackupWrongFormatError({ type: "ParseError" }),
          WrongVersionError: () =>
            new AutosModel.BackupWrongFormatError({
              type: "UnknownBackupVersion",
            }),
          UnzipError: () =>
            new AutosModel.BackupFileCorruptedError({ type: "UnzipError" }),
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
