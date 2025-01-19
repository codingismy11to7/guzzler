import { AutosApi } from "@guzzler/domain";
import { BackupMetadata } from "@guzzler/domain";
import {
  PhotoId,
  UserTypes,
  UserVehicles,
  VehicleEventRecords,
  VehicleFillupRecords,
  VehicleId,
} from "@guzzler/domain/Autos";
import { ContentType } from "@guzzler/domain/ContentType";
import { RedactedError } from "@guzzler/domain/Errors";
import { Username } from "@guzzler/domain/User";
import { MongoError, NotFound } from "@guzzler/mongodb/Model";
import { Effect, flow, Option, pipe, Schema, Stream, Struct } from "effect";
import { andThen, gen } from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";
import { catchTags } from "effect/Stream";
import { AutosStorage } from "./AutosStorage.js";
import { Zip, ZipError } from "./Zip.js";

export class BackupRestore extends Effect.Service<BackupRestore>()(
  "BackupRestore",
  {
    accessors: true,
    effect: gen(function* () {
      const autos = yield* AutosStorage;
      const { streamToZip } = yield* Zip;

      const _getBackupStream = (
        username: Username,
        backupName: string,
      ): Stream.Stream<Uint8Array, ZipError | NotFound | MongoError> =>
        Stream.unwrap(
          gen(function* () {
            const userTypes = yield* autos.getAllUserTypes(username);
            const vehicles = yield* autos.getVehicles(username);
            const eventRecords =
              yield* autos.getAllEventRecordsForUser(username);
            const fillupRecords =
              yield* autos.streamAllFillupRecordsForUser(username);
            const photos: Stream.Stream<
              {
                vId: VehicleId;
                pId: PhotoId;
                pInfo: {
                  mimeType: ContentType;
                  stream: Stream.Stream<Uint8Array, MongoError>;
                };
              },
              MongoError | NotFound
            > = pipe(
              Stream.fromIterable(Object.values(vehicles.vehicles)),
              Stream.filterMap(v =>
                pipe(
                  v.photoId,
                  Option.map(p => ({ vId: v.id, pId: p })),
                ),
              ),
              Stream.mapEffect(({ vId, pId }) =>
                gen(function* () {
                  const pInfo = yield* autos.getPhotoForVehicle(username, vId);
                  return { vId, pId, pInfo };
                }),
              ),
            );

            return streamToZip(
              pipe(
                Stream.make(
                  {
                    metadataPath: "userTypes.json",
                    fileData: pipe(
                      userTypes,
                      Schema.encodeSync(UserTypes),
                      Struct.omit("username"),
                      stringifyCircular,
                      Stream.succeed,
                      Stream.encodeText,
                    ),
                  },
                  {
                    metadataPath: "vehicles.json",
                    fileData: pipe(
                      vehicles,
                      Schema.encodeSync(UserVehicles),
                      uv => uv.vehicles,
                      stringifyCircular,
                      Stream.succeed,
                      Stream.encodeText,
                    ),
                  },
                  {
                    metadataPath: "eventRecords.json",
                    fileData: pipe(
                      eventRecords,
                      Schema.encodeSync(Schema.Array(VehicleEventRecords)),
                      vers => vers.map(Struct.omit("username")),
                      stringifyCircular,
                      Stream.succeed,
                      Stream.encodeText,
                    ),
                  },
                  {
                    metadataPath: "fillupRecords.json",
                    fileData: pipe(
                      fillupRecords,
                      Stream.map(Schema.encodeSync(VehicleFillupRecords)),
                      Stream.map(Struct.omit("username")),
                      Stream.map(stringifyCircular),
                      Stream.encodeText,
                    ),
                  },
                ),
                Stream.concat(
                  Stream.fromEffect(
                    gen(function* () {
                      const photoTypeMap = yield* pipe(
                        photos,
                        Stream.runFold(
                          {} as Record<PhotoId, ContentType>,
                          (acc, { pId, pInfo }) => ({
                            ...acc,
                            [pId]: pInfo.mimeType,
                          }),
                        ),
                      );

                      return {
                        metadataPath: "metadata.json",
                        fileData: pipe(
                          BackupMetadata.make({
                            version: 1,
                            photoTypeMap,
                            name: backupName,
                          }),
                          BackupMetadata.encode,
                          stringifyCircular,
                          Stream.succeed,
                          Stream.encodeText,
                        ),
                      };
                    }),
                  ),
                ),
                Stream.concat(
                  photos.pipe(
                    Stream.map(({ pId, pInfo: { stream } }) => ({
                      metadataPath: `photos/${pId}`,
                      fileData: stream,
                    })),
                  ),
                ),
              ),
            );
          }),
        );

      const getBackupStream = flow(
        _getBackupStream,
        catchTags({
          NotFound: e => RedactedError.logged(e.message),
          MongoError: e => RedactedError.logged(e.underlying),
          ZipError: e =>
            Effect.logError(
              "Error creating backup from archiver",
              e.cause,
            ).pipe(andThen(new AutosApi.ZipError())),
        }),
      );

      return { getBackupStream };
    }),
  },
) {}
