import {
  HttpApiBuilder,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { BadRequest, NotFound } from "@effect/platform/HttpApiError";
import { AppApi } from "@guzzlerapp/domain/AppApi";
import { currentSessionUsername } from "@guzzlerapp/domain/Authentication";
import { RedactedError, ServerError } from "@guzzlerapp/domain/Errors";
import { UserTypes, UserVehicles } from "@guzzlerapp/domain/models/Autos";
import {
  ExportBackupCallId,
  NoMapsApiKeySet,
  SubscribeToChanges,
} from "@guzzlerapp/domain/models/AutosApiModel";
import { MongoChangeStreams } from "@guzzlerapp/mongodb/MongoChangeStreams";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import { Chunk, Effect, Option, pipe, Redacted, Stream } from "effect";
import { catchTags, gen, logTrace, logWarning } from "effect/Effect";
import { AutosStorage } from "../AutosStorage.js";
import { BackupRestore } from "../BackupRestore.js";
import { GooglePlaces } from "../GooglePlaces.js";
import { ACarFullBackup } from "../importers/ACarFullBackup.js";
import * as internal from "../internal/apis/autosApiLive.js";
import * as preferencesApiLive from "../internal/apis/preferencesApiLive.js";
import { CollectionRegistry } from "../internal/database/CollectionRegistry.js";

const notFound = { DocumentNotFound: () => new NotFound() } as const;

export const AutosApiLive = HttpApiBuilder.group(AppApi, "autos", handlers =>
  gen(function* () {
    const aCar = yield* ACarFullBackup;
    const autos = yield* AutosStorage;
    const { getBackupStream, importFromGuzzlerBackup } = yield* BackupRestore;
    const colls = yield* CollectionRegistry;
    const gPlaces = yield* GooglePlaces;
    const { watchSharedStream } = yield* MongoChangeStreams;
    const random = yield* RandomId;

    return handlers
      .handleRaw(ExportBackupCallId, ({ path: { backupName } }) =>
        gen(function* () {
          return HttpServerResponse.stream(
            getBackupStream(yield* currentSessionUsername, backupName),
          );
        }),
      )
      .handle("importACarBackup", ({ payload: { tz, abpFile } }) =>
        gen(function* () {
          const [file] = abpFile;

          yield* aCar.import(yield* currentSessionUsername, tz, file.path);
        }),
      )
      .handle("importBackup", ({ payload: { backupFile } }) =>
        gen(function* () {
          const [file] = backupFile;

          yield* importFromGuzzlerBackup(
            yield* currentSessionUsername,
            file.path,
          );
        }),
      )
      .handle("getUserTypes", () =>
        gen(function* () {
          return yield* autos
            .getAllUserTypes(yield* currentSessionUsername)
            .pipe(
              catchTags({
                DocumentNotFound: () => Effect.sync(UserTypes.make),
              }),
            );
        }),
      )
      .handle("getUserVehicle", ({ path: { vehicleId } }) =>
        gen(function* () {
          return yield* autos
            .getSingleVehicle(yield* currentSessionUsername, vehicleId)
            .pipe(catchTags(notFound));
        }),
      )
      .handle("deleteUserVehicle", ({ path: { vehicleId } }) =>
        gen(function* () {
          return yield* autos.deleteUserVehicle(
            yield* currentSessionUsername,
            vehicleId,
          );
        }).pipe(catchTags({ MongoError: RedactedError.logged })),
      )
      .handle("getUserVehicles", () =>
        gen(function* () {
          return (yield* autos.getVehicles(yield* currentSessionUsername))
            .vehicles;
        }).pipe(catchTags({ DocumentNotFound: () => Effect.succeed({}) })),
      )
      .handle("getUserFillups", () =>
        gen(function* () {
          const stream = yield* autos.streamAllFillupRecordsForUser(
            yield* currentSessionUsername,
          );
          const items = yield* Stream.runCollect(stream);
          return Object.fromEntries(
            Chunk.map(items, i => [i._id.vehicleId, i.fillups]),
          );
        }),
      )
      .handle("getUserEvents", () =>
        gen(function* () {
          const items = yield* autos.getAllEventRecordsForUser(
            yield* currentSessionUsername,
          );
          return Object.fromEntries(
            items.map(i => [i._id.vehicleId, i.events]),
          );
        }),
      )
      .handle("getGasStations", ({ payload: { mode, ...location } }) =>
        gen(function* () {
          const username = yield* currentSessionUsername;

          return yield* internal.getGasStations(colls, gPlaces)(
            username,
            mode,
            location,
          );
        }),
      )
      .handleRaw(SubscribeToChanges, () =>
        gen(function* () {
          const username = yield* currentSessionUsername;

          yield* pipe(
            internal.createEventStream(username, watchSharedStream, random),
            Stream.pipeThroughChannel(HttpServerRequest.upgradeChannel()),
            Stream.decodeText(),
            Stream.runForEach(m =>
              // TODO actually keep track of receiving these and try to
              //  disconnect idle ones
              m === "pong"
                ? logTrace("got pong")
                : logWarning("unknown message from client", m),
            ),
          ).pipe(
            catchTags({
              RequestError: () => new BadRequest(),
              SocketError: e => new ServerError({ message: e.message }),
            }),
          );

          return HttpServerResponse.empty();
        }),
      );
  }),
);
