import { HttpApiClient, Socket } from "@effect/platform";
import { AppApi, Autos, AutosModel } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { TimeZone } from "@guzzlerapp/domain/TimeZone";
import { Effect, Runtime } from "effect";
import { catchTags, gen } from "effect/Effect";
import * as internal from "../internal/apiclients/autosClient.js";
import { dieFromFatal } from "../internal/apiclients/utils.js";

export class AutosClient extends Effect.Service<AutosClient>()("AutosClient", {
  accessors: true,
  effect: gen(function* () {
    const client = yield* HttpApiClient.make(AppApi.AppApi);
    const ws = yield* Socket.WebSocketConstructor;

    const importACarBackup = (
      tz: TimeZone,
      file: File,
    ): Effect.Effect<
      void,
      | AutosModel.AbpFileCorruptedError
      | AutosModel.AbpWrongFormatError
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
      | AutosModel.BackupFileCorruptedError
      | AutosModel.BackupWrongFormatError
      | RedactedError
    > => {
      const payload = new FormData();
      payload.set("backupFile", file);

      return client.autos
        .importBackup({ payload })
        .pipe(catchTags(dieFromFatal));
    };

    const getUserTypes = client.autos.getUserTypes();
    const getVehicles = client.autos.getUserVehicles();
    const getFillups = client.autos.getUserFillups();
    const getEvents = client.autos.getUserEvents();

    const deleteUserVehicle = (vehicleId: Autos.VehicleId) =>
      client.autos.deleteUserVehicle({ path: { vehicleId } });

    // boy oh boy this is gross, but i fought with websockets enough
    // revisit later
    const makeImperativeSocketHandler = gen(function* () {
      const sock = yield* internal.makeRawChangesSocket.pipe(
        Effect.provideService(Socket.WebSocketConstructor, ws),
      );

      return internal.imperativelyHandleSocket(
        sock,
        Runtime.runSync(yield* Effect.runtime()),
      );
    });

    return {
      importACarBackup,
      importGuzzlerBackup,
      getUserTypes,
      getVehicles,
      getFillups,
      getEvents,
      deleteUserVehicle,
      makeImperativeSocketHandler,
    };
  }),
}) {}
