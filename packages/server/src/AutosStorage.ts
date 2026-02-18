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
} from "@guzzlerapp/domain/models/Autos";
import { Username } from "@guzzlerapp/domain/User";
import { GridFS } from "@guzzlerapp/mongodb/GridFS";
import { DocumentNotFound, MongoError } from "@guzzlerapp/mongodb/Model";
import {
  makeObjectIdFromHexString,
  randomObjectId,
} from "@guzzlerapp/mongodb/Mongo";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { ObjectId } from "bson";
import {
  Effect,
  Exit,
  Option,
  pipe,
  Schema as S,
  Stream,
  Struct,
} from "effect";
import {
  acquireUseRelease,
  as,
  andThen,
  annotateLogs,
  catchAll,
  catchTag,
  catchTags,
  fn,
  forEach,
  gen,
  logDebug,
  logInfo,
  logWarning,
  succeed,
  sync,
} from "effect/Effect";
import { isNone } from "effect/Option";
import { isNullable } from "effect/Predicate";
import { unwrap } from "effect/Stream";
import { FileFetcher } from "./FileFetcher.js";
import { CollectionRegistry } from "./internal/database/CollectionRegistry.js";
import { StoredFile } from "./internal/storage/types.js";
import { calculateMpg } from "./internal/util/mpg.js";

export class AutosStorage extends Effect.Service<AutosStorage>()(
  "AutosStorage",
  {
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

      const deleteUserVehiclePhoto = fn("deleteUserVehiclePhoto ")(function* (
        vehicle: Vehicle,
      ) {
        const photoId = yield* getPhotoId(vehicle).pipe(Effect.option);

        if (isNone(photoId))
          yield* logDebug(`no photo to delete for ${vehicle.id}`);
        else {
          const id = photoId.value;

          yield* logInfo(`deleting photo ${id} for ${vehicle.id}`);
          yield* deleteFile(id).pipe(
            catchAll(e =>
              logWarning(`Error deleting photo ${id} for ${vehicle.id}`, e),
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
              succeed(UserVehicles.make({ _id: username, vehicles: {} })),
            ),
          );

          yield* logInfo("Deleting user data").pipe(
            annotateLogs({ username, includeUserTypes }),
          );

          yield* forEach(
            [vehicles, ...(includeUserTypes ? [userTypes] : [])],
            db => db.deleteMany({ _id: username }),
            { discard: true, concurrency: "unbounded" },
          );

          yield* forEach(
            [fillupRecords, eventRecords],
            db => db.deleteMany({ "_id.username": username }),
            { discard: true, concurrency: "unbounded" },
          );

          yield* pipe(Struct.keys(userVehicles.vehicles), vIds =>
            !vIds.length
              ? logDebug("no vehicles to clean up")
              : logInfo(
                  `Going to clean up any photos for ${vIds.length} vehicles`,
                ),
          );

          yield* forEach(
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

            yield* forEach(
              [fillupRecords, eventRecords],
              db =>
                db.deleteMany({
                  _id: { username, vehicleId },
                }),
              { discard: true, concurrency: "unbounded" },
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
          catchTag(
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
          acquireUseRelease(
            sync(() => {
              const sink = openUploadSinkWithId(newPhotoId, filename, {
                metadata: { mimeType },
              });
              return { newPhotoId, sink };
            }),
            ({ newPhotoId, sink }) =>
              gen(function* () {
                yield* pipe(data, Stream.run(sink));
                yield* logInfo(`Added photo ${newPhotoId} to database`);

                yield* postAddToDb;
              }),
            ({ newPhotoId }, exit) =>
              gen(function* () {
                if (Exit.isFailure(exit)) {
                  yield* deleteFile(newPhotoId).pipe(
                    catchAll(e =>
                      logWarning(
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
              yield* logInfo(`Updated vehicle ${vehicleId} with new photo id`);
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
      ): Effect.Effect<StoredFile, DocumentNotFound | MongoError> =>
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
            as(vers.reduce((acc, e) => acc + Object.keys(e.events).length, 0)),
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

      const allFillupRecordsForUser = (
        username: Username,
      ): Stream.Stream<VehicleFillupRecords> =>
        unwrap(fillupRecords.find({ username }).pipe(andThen(c => c.stream)));

      const bulkInsertVehicleFillupRecords = (
        vfrs: readonly VehicleFillupRecords[],
      ) =>
        fillupRecords
          .insertMany(vfrs)
          .pipe(
            as(vfrs.reduce((acc, f) => acc + Object.keys(f.fillups).length, 0)),
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

      const encodeFillupRecordSync = S.encodeSync(FillupRecord);

      const addFillupAndRecalculate = (
        username: Username,
        vehicleId: VehicleId,
        fillup: FillupRecord,
      ): Effect.Effect<void, MongoError> =>
        inTransactionRaw()(
          gen(function* () {
            const _id: UserVehicleId = { username, vehicleId };
            const encoded = encodeFillupRecordSync(fillup);

            yield* fillupRecords.updateOneRaw(
              { _id },
              { $set: { _id, [`fillups.${fillup.id}`]: encoded } },
              { upsert: true },
            );

            const doc = yield* fillupRecords
              .findOne({ _id })
              .pipe(
                catchTag("DocumentNotFound", () =>
                  Effect.die("fillup record not found after upsert"),
                ),
              );
            const recalculated = calculateMpg(Object.values(doc.fillups));

            yield* replaceFillupRecords(_id, recalculated);
          }),
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
        allFillupRecordsForUser,
        replaceFillupRecords,
        bulkInsertVehicleFillupRecords,
        addFillupAndRecalculate,
      };
    }).pipe(annotateLogs({ layer: "AutosStorage" })),
  },
) {}
