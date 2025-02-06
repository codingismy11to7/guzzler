import {
  encodeVehicleSync,
  EventRecord,
  FillupRecord,
  UserTypesWithId,
  UserVehicleId,
  UserVehicles,
  Vehicle,
  VehicleEventRecords,
  VehicleFillupRecords,
  VehicleId,
} from "@guzzlerapp/domain/Autos";
import { ContentType } from "@guzzlerapp/domain/ContentType";
import { Username } from "@guzzlerapp/domain/User";
import { GridFS } from "@guzzlerapp/mongodb/GridFS";
import { DocumentNotFound, MongoError } from "@guzzlerapp/mongodb/Model";
import {
  makeObjectIdFromHexString,
  randomObjectId,
} from "@guzzlerapp/mongodb/Mongo";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { ObjectId } from "bson";
import { Effect, Exit, Option, pipe, Stream, Struct } from "effect";
import { andThen, catchTag, catchTags, gen } from "effect/Effect";
import { isNullable } from "effect/Predicate";
import { FileFetcher } from "./FileFetcher.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";

export class AutosStorage extends Effect.Service<AutosStorage>()(
  "AutosStorage",
  {
    accessors: true,
    effect: gen(function* () {
      const { userTypes, vehicles, fillupRecords, eventRecords } =
        yield* CollectionRegistry;
      const { inTransaction, inTransactionRaw } = yield* MongoTransactions;
      const { openUploadSinkWithId, delete: deleteFile } = yield* GridFS;
      const { getFileById } = yield* FileFetcher;

      const replaceAllUserTypes = (
        types: UserTypesWithId,
      ): Effect.Effect<void> => userTypes.upsert({ _id: types._id }, types);

      const getAllUserTypes = (_id: Username) => userTypes.findOne({ _id });

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
      ): Effect.Effect<void> =>
        gen(function* () {
          const userVehicles = yield* getVehicles(username).pipe(
            catchTag("DocumentNotFound", () =>
              Effect.succeed(
                UserVehicles.make({ _id: username, vehicles: {} }),
              ),
            ),
          );

          yield* Effect.logInfo("Deleting user data").pipe(
            Effect.annotateLogs({ username, includeUserTypes }),
          );

          yield* Effect.forEach(
            [vehicles, ...(includeUserTypes ? [userTypes] : [])],
            db => db.deleteMany({ _id: username }),
            { discard: true, concurrency: "unbounded" },
          );

          yield* Effect.forEach(
            [fillupRecords, eventRecords],
            db => db.deleteMany({ "_id.username": username }),
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

      const deleteUserVehicle = (
        username: Username,
        vehicleId: VehicleId,
      ): Effect.Effect<void, MongoError> =>
        inTransactionRaw()(
          gen(function* () {
            yield* deleteVehiclePhoto(username, vehicleId).pipe(
              catchTags({ DocumentNotFound: () => Effect.void }),
            );

            yield* vehicles.updateOneRaw(
              { _id: username },
              { $unset: { [`vehicles.${vehicleId}`]: "" } },
            );
          }),
        );

      const insertUserVehicle = (username: Username, vehicle: Vehicle) =>
        vehicles.updateOne(
          { _id: username },
          {
            $set: {
              _id: username,
              [`vehicles.${vehicle.id}`]: encodeVehicleSync(vehicle),
            },
          },
          { upsert: true },
        );

      const replaceUserVehicles = (
        vehicleRec: UserVehicles,
      ): Effect.Effect<void> =>
        vehicles.upsert({ _id: vehicleRec._id }, vehicleRec);

      const getVehicles = (username: Username) =>
        vehicles.findOne({ _id: username });

      const getSingleVehicle = (username: Username, vehicleId: VehicleId) =>
        gen(function* () {
          const { vehicles: vsDict } = yield* vehicles.findOne(
            { _id: username },
            { projection: { [`vehicles.${vehicleId}`]: 1 } },
          );
          const vehicle = vsDict[vehicleId];
          if (isNullable(vehicle))
            yield* new DocumentNotFound({ method: "getSingleVehicle" });
          return vehicle;
        });

      const getPhotoIdAsString = (photoId: Option.Option<string>) =>
        photoId.pipe(
          Effect.catchTag(
            "NoSuchElementException",
            () => new DocumentNotFound({ method: "getPhotoId" }),
          ),
        );

      const getPhotoId = ({ photoId }: Vehicle) =>
        getPhotoIdAsString(photoId).pipe(Effect.map(makeObjectIdFromHexString));

      const _insertVehiclePhoto =
        <PostAddE>(postAddToDb: Effect.Effect<void, PostAddE>) =>
        <StreamE>(
          newPhotoId: ObjectId,
          filename: string,
          mimeType: string,
          data: Stream.Stream<Uint8Array, StreamE>,
        ): Effect.Effect<void, StreamE | PostAddE | MongoError> =>
          Effect.acquireUseRelease(
            Effect.sync(() => {
              const sink = openUploadSinkWithId(newPhotoId, filename, {
                metadata: { mimeType },
              });
              return { newPhotoId, sink };
            }),
            ({ newPhotoId, sink }) =>
              gen(function* () {
                yield* pipe(data, Stream.run(sink));
                yield* Effect.logInfo(`Added photo ${newPhotoId} to database`);

                yield* postAddToDb;
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

      const insertVehiclePhoto = _insertVehiclePhoto(Effect.void);

      const deleteVehiclePhoto = (
        username: Username,
        vehicleId: VehicleId,
      ): Effect.Effect<void, DocumentNotFound | MongoError> =>
        inTransactionRaw()(
          gen(function* () {
            const vehicle = yield* getSingleVehicle(username, vehicleId);

            yield* deleteUserVehiclePhoto(vehicle);

            yield* vehicles.updateOneRaw(
              { _id: username },
              { $unset: { [`vehicles.${vehicleId}.photoId`]: "" } },
            );
          }),
        );

      const addPhotoToVehicle = <E>(
        username: Username,
        vehicleId: VehicleId,
        filename: string,
        mimeType: string,
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<void, E | MongoError | DocumentNotFound> => {
        const newPhotoId = randomObjectId();

        const replacePhotoId = gen(function* () {
          yield* inTransaction()(
            gen(function* () {
              yield* deleteVehiclePhoto(username, vehicleId);

              yield* vehicles.updateOneRaw(
                { _id: username },
                {
                  $set: {
                    [`vehicles.${vehicleId}.photoId`]: newPhotoId.toHexString(),
                  },
                },
              );
              yield* Effect.logInfo(
                `Updated vehicle ${vehicleId} with new photo id`,
              );
            }),
          );
        });

        return _insertVehiclePhoto(replacePhotoId)(
          newPhotoId,
          filename,
          mimeType,
          data,
        );
      };

      const getPhotoForVehicle = (
        username: Username,
        vehicleId: VehicleId,
      ): Effect.Effect<
        Readonly<{
          stream: Stream.Stream<Uint8Array, MongoError>;
          contentType: ContentType;
          fileName: string;
        }>,
        DocumentNotFound | MongoError
      > =>
        gen(function* () {
          const vehicle = yield* getSingleVehicle(username, vehicleId);

          const photoId = yield* getPhotoId(vehicle);

          return yield* getFileById(photoId);
        });

      const getAllEventRecordsForUser = (username: Username) =>
        eventRecords.find({ username }).pipe(andThen(c => c.toArray));

      const bulkInsertVehicleEventRecords = (
        vers: readonly VehicleEventRecords[],
      ) =>
        eventRecords
          .insertMany(vers)
          .pipe(
            Effect.as(
              vers.reduce((acc, e) => acc + Object.keys(e.events).length, 0),
            ),
          );

      const replaceEventRecords = (
        _id: UserVehicleId,
        events: readonly EventRecord[],
      ) =>
        eventRecords.upsert(
          { _id },
          {
            _id,
            events: Object.fromEntries(events.map(e => [e.id, e])),
          },
        );

      const streamAllFillupRecordsForUser = (username: Username) =>
        fillupRecords.find({ username }).pipe(andThen(c => c.stream));

      const bulkInsertVehicleFillupRecords = (
        vfrs: readonly VehicleFillupRecords[],
      ) =>
        fillupRecords
          .insertMany(vfrs)
          .pipe(
            Effect.as(
              vfrs.reduce((acc, f) => acc + Object.keys(f.fillups).length, 0),
            ),
          );

      const replaceFillupRecords = (
        _id: UserVehicleId,
        fillups: readonly FillupRecord[],
      ) =>
        fillupRecords.upsert(
          { _id },
          {
            _id,
            fillups: Object.fromEntries(fillups.map(r => [r.id, r])),
          },
        );

      return {
        replaceAllUserTypes,
        getAllUserTypes,
        deleteAllUserData,
        deleteUserVehicle,
        insertUserVehicle,
        replaceUserVehicles,
        getVehicles,
        getSingleVehicle,
        insertVehiclePhoto,
        addPhotoToVehicle,
        getPhotoForVehicle,
        getAllEventRecordsForUser,
        replaceEventRecords,
        bulkInsertVehicleEventRecords,
        streamAllFillupRecordsForUser,
        replaceFillupRecords,
        bulkInsertVehicleFillupRecords,
      };
    }).pipe(Effect.annotateLogs({ layer: "AutosStorage" })),
  },
) {}
