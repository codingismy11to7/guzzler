import {
  encodeEventRecordSync,
  encodeFillupRecordSync,
  encodeVehicleSync,
  EventRecord,
  FillupRecord,
  UserTypes,
  UserVehicles,
  Vehicle,
  VehicleId,
} from "@guzzler/domain/Autos";
import { ContentType } from "@guzzler/domain/ContentType";
import { Username } from "@guzzler/domain/User";
import { GridFS } from "@guzzler/mongodb/GridFS";
import { MongoError, NotFound } from "@guzzler/mongodb/Model";
import {
  makeObjectIdFromHexString,
  randomObjectId,
} from "@guzzler/mongodb/Mongo";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import {
  Array,
  Effect,
  Exit,
  Option,
  pipe,
  Schema,
  Stream,
  Struct,
} from "effect";
import { andThen, catchTag, gen } from "effect/Effect";
import { isNullable } from "effect/Predicate";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class AutosStorage extends Effect.Service<AutosStorage>()(
  "AutosStorage",
  {
    accessors: true,
    effect: gen(function* () {
      const { userTypes, vehicles, fillupRecords, eventRecords } =
        yield* CollectionRegistry;
      const { inTransaction } = yield* MongoTransactions;
      const {
        openDownloadStream,
        openUploadSinkWithId,
        delete: deleteFile,
        find: findFile,
      } = yield* GridFS;

      const replaceAllUserTypes = (types: UserTypes) =>
        userTypes.upsert({ username: types.username }, types);

      const getAllUserTypes = (username: Username) =>
        userTypes.findOne({ username });

      const deleteUserVehiclePhoto = (vehicle: Vehicle) =>
        gen(function* () {
          const photoId = yield* getPhotoId(vehicle).pipe(Effect.option);

          if (Option.isNone(photoId))
            yield* Effect.logDebug(`no photo to delete for ${vehicle.id}`);
          else {
            const id = photoId.value;

            yield* Effect.logInfo(`deleting photo ${id} for ${vehicle.id}`);
            yield* deleteFile(id).pipe(
              Effect.catchAll(e =>
                Effect.logWarning(
                  `Error deleting photo ${id} for ${vehicle.id}`,
                  e,
                ),
              ),
            );
          }
        });

      const deleteAllUserData = (
        username: Username,
        { includeUserTypes = true }: { includeUserTypes?: boolean } = {},
      ) =>
        gen(function* () {
          const userVehicles = yield* getVehicles(username).pipe(
            catchTag("NotFound", () =>
              Effect.succeed(UserVehicles.make({ username, vehicles: {} })),
            ),
          );

          yield* Effect.logInfo("Deleting user data").pipe(
            Effect.annotateLogs({ username, includeUserTypes }),
          );

          yield* Effect.forEach(
            [
              vehicles,
              fillupRecords,
              eventRecords,
              ...(includeUserTypes ? [userTypes] : []),
            ],
            db => db.deleteMany({ username }),
            { discard: true, concurrency: "unbounded" },
          );

          yield* pipe(Struct.keys(userVehicles.vehicles), vIds =>
            !vIds.length
              ? Effect.logDebug("no vehicles to clean up")
              : Effect.logInfo(
                  `Going to clean up any photos for ${vIds.length} vehicles`,
                ),
          );

          yield* Effect.forEach(
            Object.values(userVehicles.vehicles),
            deleteUserVehiclePhoto,
            {
              concurrency: "unbounded",
              discard: true,
            },
          );
        });

      const insertUserVehicle = (username: Username, vehicle: Vehicle) =>
        vehicles.updateOne(
          { username },
          {
            $set: {
              username,
              [`vehicles.${vehicle.id}`]: encodeVehicleSync(vehicle),
            },
          },
          { upsert: true },
        );

      const getVehicles = (username: Username) =>
        vehicles.findOne({ username });

      const getSingleVehicle = (username: Username, vehicleId: VehicleId) =>
        gen(function* () {
          const { vehicles } = yield* getVehicles(username);
          const vehicle = vehicles[vehicleId];
          if (isNullable(vehicle))
            yield* new NotFound({ method: "getSingleVehicle" });
          return vehicle;
        });

      const getPhotoIdAsString = (photoId: Option.Option<string>) =>
        photoId.pipe(
          Effect.catchTag(
            "NoSuchElementException",
            () => new NotFound({ method: "getPhotoId" }),
          ),
        );

      const getPhotoId = ({ photoId }: Vehicle) =>
        getPhotoIdAsString(photoId).pipe(Effect.map(makeObjectIdFromHexString));

      const addPhotoToVehicle = <E>(
        username: Username,
        vehicleId: VehicleId,
        filename: string,
        mimeType: string,
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<void, E | MongoError | NotFound> =>
        Effect.acquireUseRelease(
          Effect.sync(() => {
            const newPhotoId = randomObjectId();
            const sink = openUploadSinkWithId(newPhotoId, filename, {
              metadata: { mimeType },
            });
            return { newPhotoId, sink };
          }),
          ({ newPhotoId, sink }) =>
            gen(function* () {
              yield* pipe(data, Stream.run(sink));
              yield* Effect.logInfo(`Added photo ${newPhotoId} to database`);

              const oldPhotoId = yield* inTransaction()(
                gen(function* () {
                  const vehicle = yield* getSingleVehicle(username, vehicleId);

                  const oldPhotoId = yield* getPhotoId(vehicle).pipe(
                    Effect.option,
                  );

                  yield* vehicles.updateOneRaw(
                    { username },
                    {
                      $set: {
                        [`vehicles.${vehicleId}.photoId`]:
                          newPhotoId.toHexString(),
                      },
                    },
                  );
                  yield* Effect.logInfo(
                    `Updated vehicle ${vehicleId} with new photo id`,
                  );

                  return oldPhotoId;
                }),
              );

              if (Option.isNone(oldPhotoId))
                yield* Effect.logDebug("no old photo to delete");
              else {
                const id = oldPhotoId.value;
                yield* Effect.logInfo(`going to delete old photo ${id}`);
                yield* deleteFile(id).pipe(
                  Effect.andThen(Effect.logInfo("deleted")),
                  Effect.catchAll(e =>
                    Effect.logWarning("Problem deleting photo", e),
                  ),
                );
              }
            }),
          ({ newPhotoId }, exit) =>
            gen(function* () {
              if (Exit.isFailure(exit)) {
                yield* deleteFile(newPhotoId).pipe(
                  Effect.catchAll(e =>
                    Effect.logWarning(
                      `Got an error trying to delete just-created file with id ${newPhotoId}`,
                      e,
                    ),
                  ),
                );
              }
            }),
        );

      const getPhotoForVehicle = (
        username: Username,
        vehicleId: VehicleId,
      ): Effect.Effect<
        Readonly<{
          stream: Stream.Stream<Uint8Array, MongoError>;
          mimeType: ContentType;
          fileName: string;
        }>,
        NotFound | MongoError
      > =>
        gen(function* () {
          const vehicle = yield* getSingleVehicle(username, vehicleId);

          const photoId = yield* getPhotoId(vehicle);
          const photoFileOpt = Array.head(yield* findFile({ _id: photoId }));

          if (Option.isNone(photoFileOpt))
            return yield* new NotFound({
              method: "getPhotoForVehicle",
              filter: { _id: photoId },
            });
          const photoFile = photoFileOpt.value;

          const stream = openDownloadStream(photoId);

          return {
            stream,
            mimeType:
              photoFile.metadata?.mimeType ?? "application/octet-stream",
            fileName: photoFile.filename,
          };
        });

      const getAllEventRecordsForUser = (username: Username) =>
        eventRecords.find({ username }).pipe(andThen(c => c.toArray));

      const insertEventRecords = (
        username: Username,
        vehicleId: VehicleId,
        events: readonly EventRecord[],
      ) =>
        eventRecords.updateOne(
          { username, vehicleId },
          {
            $set: {
              username,
              vehicleId,
              events: Object.fromEntries(
                events.map(e => [e.id, encodeEventRecordSync(e)]),
              ),
            },
          },
          { upsert: true },
        );

      const streamAllFillupRecordsForUser = (username: Username) =>
        fillupRecords.find({ username }).pipe(andThen(c => c.stream));

      const insertFillupRecords = (
        username: Username,
        vehicleId: VehicleId,
        fillups: readonly FillupRecord[],
      ) =>
        fillupRecords.updateOne(
          { username, vehicleId },
          {
            $set: {
              username,
              vehicleId,
              fillups: Object.fromEntries(
                fillups.map(r => [r.id, encodeFillupRecordSync(r)]),
              ),
            },
          },
          { upsert: true },
        );

      return {
        replaceAllUserTypes,
        getAllUserTypes,
        deleteAllUserData,
        insertUserVehicle,
        getVehicles,
        addPhotoToVehicle,
        getPhotoForVehicle,
        getAllEventRecordsForUser,
        insertEventRecords,
        streamAllFillupRecordsForUser,
        insertFillupRecords,
      };
    }).pipe(Effect.annotateLogs({ layer: "AutosStorage" })),
  },
) {}
