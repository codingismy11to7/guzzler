import { FileSystem } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
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
import { Username } from "@guzzler/domain/User";
import { DocumentNotFound, MongoError } from "@guzzler/mongodb/Model";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { ObjectId } from "bson";
import { Data, Effect, Option, pipe, Schema, Stream, Struct } from "effect";
import {
  catchTag,
  forEach,
  gen,
  logDebug,
  logError,
  logInfo,
  withLogSpan,
} from "effect/Effect";
import { stringifyCircular } from "effect/Inspectable";
import { ParseError } from "effect/ParseResult";
import { Scope } from "effect/Scope";
import slash from "slash";
import { AutosStorage } from "../AutosStorage.js";
import { UnzipError, Zip, ZipError } from "../Zip.js";
import { MissingBackupFile } from "./MissingBackupFile.js";

export const getBackupStream =
  (autos: AutosStorage, { streamToZip }: Zip) =>
  (
    username: Username,
    backupName: string,
  ): Stream.Stream<Uint8Array, ZipError | DocumentNotFound | MongoError> =>
    Stream.unwrap(
      gen(function* () {
        const userTypes = yield* autos.getAllUserTypes(username);
        const vehicles = yield* autos.getVehicles(username);
        const eventRecords = yield* autos.getAllEventRecordsForUser(username);
        const fillupRecords =
          yield* autos.streamAllFillupRecordsForUser(username);
        const photos: Stream.Stream<
          {
            vId: VehicleId;
            pId: PhotoId;
            pInfo: {
              contentType: ContentType;
              fileName: string;
              stream: Stream.Stream<Uint8Array, MongoError>;
            };
          },
          MongoError | DocumentNotFound
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
                  Struct.omit("_id"),
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
                  stringifyCircular,
                  Stream.succeed,
                  Stream.encodeText,
                ),
              },
              {
                metadataPath: "fillupRecords.json",
                fileData: pipe(
                  Stream.succeed("["),
                  Stream.concat(
                    pipe(
                      fillupRecords,
                      Stream.map(Schema.encodeSync(VehicleFillupRecords)),
                      Stream.map(stringifyCircular),
                      Stream.intersperse(",\n"),
                    ),
                  ),
                  Stream.concat(Stream.succeed("]")),
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
                      {} as Record<PhotoId, BackupMetadata.PhotoMetadata>,
                      (acc, { pId, pInfo }) => ({
                        ...acc,
                        [pId]: {
                          contentType: pInfo.contentType,
                          fileName: pInfo.fileName,
                        },
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

class WrongVersionError extends Data.TaggedError("WrongVersionError")<{
  version: number;
  expectedDesc: string;
}> {
  get message() {
    return `Backup is version ${this.version} but we need ${this.expectedDesc}`;
  }
}

export const importFromGuzzlerBackup =
  (
    autos: AutosStorage,
    { inTransactionRaw }: MongoTransactions,
    zip: Zip,
    fs: FileSystem.FileSystem,
  ) =>
  (
    username: Username,
    zipPath: string,
  ): Effect.Effect<
    void,
    | MissingBackupFile
    | ParseError
    | UnzipError
    | SystemError
    | MongoError
    | WrongVersionError,
    Scope
  > =>
    gen(function* () {
      const parseMetadata = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<BackupMetadata.BackupMetadata, ParseError | E> =>
        gen(function* () {
          const json = yield* pipe(data, Stream.decodeText(), Stream.mkString);
          const obj = {
            username,
            ...(yield* Schema.decode(Schema.parseJson(Schema.Struct({})))(
              json,
            )),
          };
          const ret = yield* Schema.decodeUnknown(
            BackupMetadata.BackupMetadata,
          )(obj);

          yield* Effect.logInfo("Finished parsing BackupMetadata");

          return ret;
        }).pipe(withLogSpan("parseMetadata"));

      const parseUserTypes = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<UserTypes, ParseError | E> =>
        gen(function* () {
          const json = yield* pipe(data, Stream.decodeText(), Stream.mkString);
          const obj = {
            _id: username,
            ...(yield* Schema.decode(Schema.parseJson(Schema.Struct({})))(
              json,
            )),
          };
          const ret = yield* Schema.decodeUnknown(UserTypes)(obj);

          yield* Effect.logInfo("Finished parsing UserTypes");

          return ret;
        }).pipe(withLogSpan("parseUserTypes"));

      const parseUserVehicles = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<UserVehicles, ParseError | E> =>
        gen(function* () {
          const json = yield* pipe(data, Stream.decodeText(), Stream.mkString);
          const obj = {
            _id: username,
            vehicles: yield* Schema.decode(Schema.parseJson(Schema.Struct({})))(
              json,
            ),
          };
          const ret = yield* Schema.decodeUnknown(UserVehicles)(obj);

          yield* Effect.logInfo("Finished parsing UserVehicles");

          return ret;
        }).pipe(withLogSpan("parseUserVehicles"));

      const parseEventRecords = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<readonly VehicleEventRecords[], ParseError | E> =>
        gen(function* () {
          const json = yield* pipe(data, Stream.decodeText(), Stream.mkString);
          const jsonObj = yield* Schema.decode(Schema.parseJson())(json);

          const Recs = Schema.Array(VehicleEventRecords);

          const entriesWithOldUsername =
            yield* Schema.decodeUnknown(Recs)(jsonObj);

          const ret = Schema.decodeSync(Recs)(
            Schema.encodeSync(Recs)(entriesWithOldUsername).map(ver => ({
              ...ver,
              _id: { ...ver._id, username },
            })),
          );

          yield* Effect.logInfo("Finished parsing VehicleEventRecords");

          return ret;
        }).pipe(withLogSpan("parseEventRecords"));

      const parseFillupRecords = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<readonly VehicleFillupRecords[], ParseError | E> =>
        gen(function* () {
          const json = yield* pipe(data, Stream.decodeText(), Stream.mkString);
          const jsonObj = yield* Schema.decode(Schema.parseJson())(json);

          const Recs = Schema.Array(VehicleFillupRecords);

          const entriesWithOldUsername =
            yield* Schema.decodeUnknown(Recs)(jsonObj);

          const ret = Schema.decodeSync(Recs)(
            Schema.encodeSync(Recs)(entriesWithOldUsername).map(ver => ({
              ...ver,
              _id: { ...ver._id, username },
            })),
          );

          yield* Effect.logInfo("Finished parsing VehicleFillupRecords");

          return ret;
        }).pipe(withLogSpan("parseFillupRecords"));

      const insertAllPhotos = ({
        photoTypeMap,
      }: BackupMetadata.BackupMetadata): Effect.Effect<
        void,
        MissingBackupFile | SystemError | MongoError
      > =>
        gen(function* () {
          const processEntry = (
            id: PhotoId,
            md: BackupMetadata.PhotoMetadata,
          ): Effect.Effect<
            void,
            MissingBackupFile | SystemError | MongoError
          > =>
            gen(function* () {
              const data = openBackupFile(`photos/${id}`);
              const objId = ObjectId.createFromHexString(id);

              yield* autos.insertVehiclePhoto(
                objId,
                md.fileName,
                md.contentType,
                data,
              );

              yield* logDebug(`inserted ${md.fileName}`);
            }).pipe(withLogSpan("processEntry"));

          yield* forEach(
            Struct.keys(photoTypeMap),
            k => processEntry(k, photoTypeMap[k]),
            { discard: true },
          );

          yield* Effect.logInfo(
            `Finished inserting ${Object.keys(photoTypeMap).length} photos`,
          );
        }).pipe(withLogSpan("insertAllPhotos"));

      yield* Effect.logInfo("Beginning Guzzler Backup import");

      yield* Effect.logInfo(`Unzipping ${zipPath}`);

      const backupFiles = yield* zip.getZipContents(zipPath);

      yield* Effect.logInfo(`Unzipped ${backupFiles.length} files/directories`);

      const openBackupFile = (
        fileName: string,
      ): Stream.Stream<Uint8Array, MissingBackupFile | SystemError> =>
        Stream.unwrap(
          gen(function* () {
            const targetFile = yield* Effect.fromNullable(
              backupFiles
                .filter(e => !e.isDirectory)
                .find(e => slash(e.fileName).endsWith(fileName)),
            ).pipe(
              catchTag(
                "NoSuchElementException",
                () => new MissingBackupFile({ fileName }),
              ),
            );

            return fs
              .stream(targetFile.fileName)
              .pipe(Stream.catchTags({ BadArgument: Stream.die }));
          }),
        );

      const metadata = yield* parseMetadata(openBackupFile("metadata.json"));
      if (metadata.version !== 1) {
        yield* logError("Got bad version", metadata);
        return yield* new WrongVersionError({
          expectedDesc: "version 1",
          version: metadata.version,
        });
      } else yield* logInfo("Backup info:", metadata);

      const userTypes = yield* parseUserTypes(openBackupFile("userTypes.json"));

      const vehicles = yield* parseUserVehicles(
        openBackupFile("vehicles.json"),
      );
      const eventRecords = yield* parseEventRecords(
        openBackupFile("eventRecords.json"),
      );
      const fillupRecords = yield* parseFillupRecords(
        openBackupFile("fillupRecords.json"),
      );

      yield* logInfo(
        "Parsed all information, going to start writing to the database",
      );

      yield* inTransactionRaw()(
        gen(function* () {
          yield* autos.deleteAllUserData(username, { includeUserTypes: false });
          yield* Effect.logInfo("Replacing settings");
          yield* autos.replaceAllUserTypes(userTypes);

          yield* autos.replaceUserVehicles(vehicles);
          yield* Effect.logInfo(
            `Wrote ${Object.keys(vehicles.vehicles).length} vehicles`,
          );

          const numEvtRecs =
            yield* autos.bulkInsertVehicleEventRecords(eventRecords);
          yield* Effect.logInfo(`Wrote ${numEvtRecs} vehicle event records`);

          const numFills =
            yield* autos.bulkInsertVehicleFillupRecords(fillupRecords);
          yield* Effect.logInfo(`Wrote ${numFills} vehicle fillup records`);

          yield* insertAllPhotos(metadata);
          yield* Effect.logInfo(
            `Wrote ${Object.keys(metadata.photoTypeMap).length} vehicle photos`,
          );
        }),
      );
    });
