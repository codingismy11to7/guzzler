import { tz } from "@date-fns/tz";
import { FileSystem, Path } from "@effect/platform";
import { PlatformError } from "@effect/platform/Error";
import { NodeFileSystem } from "@effect/platform-node";
import { AutosApiModel } from "@guzzlerapp/domain";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import {
  BooleanFromSelfOrString,
  IntFromSelfOrString,
  NumberFromSelfOrString,
  OptionalBigDecimal,
  OptionalString,
} from "@guzzlerapp/domain/MiscSchemas";
import {
  EventRecord,
  EventRecordId,
  EventSubtype,
  FillupRecord,
  FillupRecordId,
  FuelType,
  TripType,
  UserTypesWithId,
  Vehicle,
  VehicleId,
} from "@guzzlerapp/domain/models/Autos";
import {
  encodeLocationOpt,
  Latitude,
  Location,
  Longitude,
} from "@guzzlerapp/domain/models/Location";
import { Place } from "@guzzlerapp/domain/models/Place";
import { TimeZone } from "@guzzlerapp/domain/TimeZone";
import { Username } from "@guzzlerapp/domain/User";
import { DocumentNotFound, MongoError } from "@guzzlerapp/mongodb/Model";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import { parse as parseDate } from "date-fns";
import {
  BigDecimal,
  Data,
  Effect,
  Match,
  Option,
  pipe,
  Schema,
  Stream,
  Struct,
} from "effect";
import {
  catchTag,
  catchTags,
  fn,
  forEach,
  fromNullable,
  gen,
  logDebug,
  logError,
  logInfo,
  promise,
  scoped,
  tap,
  tapError,
} from "effect/Effect";
import { ParseError } from "effect/ParseResult";
import { isNull, isUndefined } from "effect/Predicate";
import { fileTypeFromBuffer } from "file-type";
import { AutosStorage } from "../AutosStorage.js";
import { MissingBackupFile } from "../internal/MissingBackupFile.js";
import { ZipFile } from "../internal/util/unzip.js";
import type { XmlParsingError } from "../internal/xml/XmlParser.js";
import { XmlParser } from "../internal/xml/XmlParser.js";
import { Zip } from "../Zip.js";

const String = Schema.Trimmed;

const ACarEventSubtype = Schema.Struct({
  id: String,
  type: String,
  name: String,
  notes: OptionalString,
  defaultTimeReminderInterval: IntFromSelfOrString.pipe(Schema.optional),
  defaultDistanceReminderInterval: IntFromSelfOrString.pipe(Schema.optional),
});
type ACarEventSubtype = typeof ACarEventSubtype.Type;

const ACarFuelType = Schema.Struct({
  id: String,
  category: String,
  name: String,
  notes: OptionalString,
  ratingType: Schema.OptionFromUndefinedOr(
    Schema.Literal("octane_ron", "octane_aki", "cetane"),
  ),
  rating: NumberFromSelfOrString.pipe(Schema.optional),
});
type ACarFuelType = typeof ACarFuelType.Type;

const ACarTripType = Schema.Struct({
  id: String,
  name: String,
  notes: OptionalString,
  defaultTaxDeductionRate: NumberFromSelfOrString.pipe(Schema.optional),
});
type ACarTripType = typeof ACarTripType.Type;

const placeFields = {
  placeName: OptionalString,
  placeFullAddress: OptionalString,
  placeStreet: OptionalString,
  placeCity: OptionalString,
  placeState: OptionalString,
  placeCountry: OptionalString,
  placePostalCode: OptionalString,
  placeGooglePlacesId: OptionalString,
  placeLatitude: Schema.OptionFromUndefinedOr(Latitude),
  placeLongitude: Schema.OptionFromUndefinedOr(Longitude),
  deviceLatitude: Schema.OptionFromUndefinedOr(Latitude),
  deviceLongitude: Schema.OptionFromUndefinedOr(Longitude),
} as const;

const placeFieldNames = Struct.keys(placeFields);

const VehiclePart = String;
const Reminder = String;
const ACarFillupRecord = Schema.Struct({
  id: String,
  date: String,
  fuelEfficiency: OptionalBigDecimal,
  fuelTypeId: String,
  notes: OptionalString,
  odometerReading: Schema.BigDecimal,
  paymentType: OptionalString,
  pricePerVolumeUnit: String,
  tags: OptionalString,
  totalCost: Schema.BigDecimal,
  volume: Schema.BigDecimal,
  partial: BooleanFromSelfOrString,
  previousMissedFillups: BooleanFromSelfOrString,
  hasFuelAdditive: BooleanFromSelfOrString,
  fuelAdditiveName: OptionalString,
  drivingMode: OptionalString,
  cityDrivingPercentage: Schema.BigDecimal,
  highwayDrivingPercentage: Schema.BigDecimal,
  averageSpeed: OptionalBigDecimal,
  ...placeFields,
});
type ACarFillupRecord = typeof ACarFillupRecord.Type;
const ACarEventRecord = Schema.Struct({
  id: String,
  type: String,
  date: String,
  notes: OptionalString,
  odometerReading: OptionalBigDecimal,
  paymentType: OptionalString,
  tags: OptionalString,
  totalCost: OptionalBigDecimal,
  ...placeFields,
  subtypes: Schema.Unknown,
});
type ACarEventRecord = typeof ACarEventRecord.Type;
const ACarVehicle = Schema.Struct({
  id: String,
  name: String,
  notes: OptionalString,
  type: OptionalString,
  year: IntFromSelfOrString.pipe(Schema.optional),
  makeId: OptionalString,
  make: OptionalString,
  modelId: OptionalString,
  model: OptionalString,
  vehicleId: OptionalString,
  subModel: OptionalString,
  engineId: OptionalString,
  engine: OptionalString,
  genericEngineBaseId: OptionalString,
  genericFuelTypeId: OptionalString,
  transmissionId: OptionalString,
  transmission: OptionalString,
  driveTypeId: OptionalString,
  driveType: OptionalString,
  bodyTypeId: OptionalString,
  bodyType: OptionalString,
  bedTypeId: OptionalString,
  bedType: OptionalString,
  licensePlate: OptionalString,
  vin: OptionalString,
  insurancePolicy: OptionalString,
  color: OptionalString,
  fuelTankCapacity: OptionalBigDecimal,
  active: BooleanFromSelfOrString,
  distanceUnit: OptionalString,
  volumeUnit: OptionalString,
  countryId: OptionalString,
  countryName: OptionalString,
  regionId: OptionalString,
  regionName: OptionalString,
  cityName: OptionalString,
  photo: Schema.OptionFromUndefinedOr(Schema.Uint8ArrayFromBase64),

  vehicleParts: Schema.Array(VehiclePart),
  reminders: Schema.Array(Reminder),
  fillupRecords: Schema.Array(ACarFillupRecord),
  eventRecords: Schema.Array(ACarEventRecord),
  tripRecords: Schema.Array(String),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlaceFieldsSchema = Schema.Struct(placeFields);
const parsePlaceFields = (fields: typeof PlaceFieldsSchema.Type) =>
  gen(function* () {
    const {
      deviceLatitude,
      deviceLongitude,
      placeLatitude,
      placeLongitude,
      ...placeFields
    } = fields;

    const makeLocation = (
      lat: Option.Option<Latitude>,
      long: Option.Option<Longitude>,
    ) =>
      Option.gen(function* () {
        const latitude = yield* lat;
        const longitude = yield* long;
        return Location.make({ latitude, longitude });
      });

    const deviceLocation = encodeLocationOpt(
      makeLocation(deviceLatitude, deviceLongitude),
    );
    const placeLocation = makeLocation(placeLatitude, placeLongitude);

    const removePlace = (s: string) =>
      s.replace(/place[A-Z]/, a => a.slice(-1).toLowerCase());

    const place =
      Option.isNone(placeLocation) &&
      Object.values(placeFields).every(isUndefined)
        ? undefined
        : yield* Schema.encode(Place, { onExcessProperty: "error" })({
            location: placeLocation,
            googleMapsUri: Option.none(),
            ...Object.fromEntries(
              Object.entries(placeFields).map(([k, v]) => [removePlace(k), v]),
            ),
          });

    return { place, deviceLocation };
  });

class UnexpectedOpeningTag extends Data.TaggedError("UnexpectedOpeningTag")<{
  expected: string;
  received: string;
}> {
  get message() {
    return `Expected an opening XML tag of '${this.expected}', but received '${this.received}'`;
  }
}
const unexpectedOpeningTag = (expected: string, received: string) =>
  new UnexpectedOpeningTag({ expected, received });

const asArray = (v: unknown): ReadonlyArray<Record<string, unknown>> =>
  isUndefined(v)
    ? []
    : Array.isArray(v)
      ? (v as Array<Record<string, unknown>>)
      : [v as Record<string, unknown>];

const childArray = (parent: unknown, childKey: string): readonly unknown[] => {
  if (isUndefined(parent) || parent === "" || isNull(parent)) return [];
  if (typeof parent !== "object") return [];
  const children = (parent as Record<string, unknown>)[childKey];
  if (isUndefined(children)) return [];
  return Array.isArray(children) ? children : [children];
};

const unwrapVehicle = (
  raw: Record<string, unknown>,
): Record<string, unknown> => ({
  ...raw,
  vehicleParts: childArray(raw.vehicleParts, "vehiclePart"),
  reminders: childArray(raw.reminders, "reminder"),
  fillupRecords: childArray(raw.fillupRecords, "fillupRecord"),
  eventRecords: childArray(raw.eventRecords, "eventRecord"),
  tripRecords: childArray(raw.tripRecords, "tripRecord"),
});

const parseSettingsFile = <S extends Schema.Schema.AnyNoContext>(
  parseXml: XmlParser["parse"],
  data: string,
  rootTag: string,
  childTag: string,
  schema: S,
): Effect.Effect<
  ReadonlyArray<Schema.Schema.Type<S>>,
  XmlParsingError | ParseError | UnexpectedOpeningTag
> =>
  gen(function* () {
    const doc = yield* parseXml(data);
    const root = doc[rootTag];

    if (isUndefined(root))
      return yield* unexpectedOpeningTag(
        rootTag,
        Object.keys(doc)[0] ?? "<empty>",
      );

    const items = asArray((root as Record<string, unknown>)[childTag]);

    const parsed = yield* forEach(
      items,
      item => Schema.decodeUnknown(schema)(item),
      { concurrency: "unbounded" },
    );

    return parsed;
  });

export class ACarFullBackup extends Effect.Service<ACarFullBackup>()(
  "ACarFullBackup",
  {
    accessors: true,
    dependencies: [
      AutosStorage.Default,
      NodeFileSystem.layer,
      MongoTransactions.Default,
      RandomId.Default,
      XmlParser.Default,
      Zip.Default,
    ],
    effect: gen(function* () {
      const autos = yield* AutosStorage;
      const { inTransactionRaw } = yield* MongoTransactions;
      const zip = yield* Zip;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { parse: parseXml } = yield* XmlParser;
      const randomId = yield* RandomId;

      const readBackupFile: (
        backupFiles: readonly ZipFile[],
        fileName: string,
      ) => Effect.Effect<string, MissingBackupFile | PlatformError> = fn(
        "readBackupFile",
      )(function* (backupFiles, fileName) {
        const targetFile = yield* fromNullable(
          backupFiles
            .filter(e => !e.isDirectory)
            .find(e => path.basename(e.fileName) === fileName),
        ).pipe(
          catchTag(
            "NoSuchElementException",
            () => new MissingBackupFile({ fileName }),
          ),
        );

        return yield* fs.readFileString(targetFile.fileName);
      });

      const parseEventSubtypes: (
        data: string,
      ) => Effect.Effect<
        readonly EventSubtype[],
        ParseError | XmlParsingError | UnexpectedOpeningTag
      > = fn("parseEventSubtypes")(function* (data) {
        const parsed = yield* parseSettingsFile(
          parseXml,
          data,
          "eventSubtypes",
          "eventSubtype",
          ACarEventSubtype,
        );

        const convertToDataModel = (es: ACarEventSubtype) =>
          Schema.decode(EventSubtype, { onExcessProperty: "error" })(es);

        return yield* forEach(parsed, convertToDataModel, {
          concurrency: "unbounded",
        }).pipe(tap(logInfo(`parsed ${parsed.length} EventSubtypes`)));
      });

      const parseFuelTypes: (
        data: string,
      ) => Effect.Effect<
        readonly FuelType[],
        ParseError | XmlParsingError | UnexpectedOpeningTag
      > = fn("parseFuelTypes")(function* (data) {
        const parsed = yield* parseSettingsFile(
          parseXml,
          data,
          "fuelTypes",
          "fuelType",
          ACarFuelType,
        );

        // add a default name if it's missing
        const withDefaults = parsed.map(ft => ({
          ...ft,

          name: ft.name || `${ft.category} [${ft.id}]`,
        }));

        const convertToDataModel = (ft: ACarFuelType) =>
          Schema.decode(FuelType, { onExcessProperty: "error" })({
            ...ft,
            ratingType: pipe(
              Option.map(ft.ratingType, rt =>
                Match.value(rt).pipe(
                  Match.when("octane_ron", () => "RON" as const),
                  Match.when("octane_aki", () => "AKI" as const),
                  Match.when("cetane", () => "Cetane" as const),
                  Match.exhaustive,
                ),
              ),
              Option.getOrUndefined,
            ),
          });

        return yield* forEach(withDefaults, convertToDataModel, {
          concurrency: "unbounded",
        }).pipe(tap(logInfo(`parsed ${parsed.length} FuelTypes`)));
      });

      const parseTripTypes: (
        data: string,
      ) => Effect.Effect<
        readonly TripType[],
        ParseError | XmlParsingError | UnexpectedOpeningTag
      > = fn("parseTripTypes")(function* (data) {
        const parsed = yield* parseSettingsFile(
          parseXml,
          data,
          "tripTypes",
          "tripType",
          ACarTripType,
        );

        const convertToDataModel = (tt: ACarTripType) =>
          Schema.decode(TripType, { onExcessProperty: "error" })(tt);

        return yield* forEach(parsed, convertToDataModel, {
          concurrency: "unbounded",
        }).pipe(tap(logInfo(`parsed ${parsed.length} TripTypes`)));
      });

      const parseVehicles: (
        username: Username,
        userTimeZone: TimeZone,
        data: string,
      ) => Effect.Effect<
        void,
        | XmlParsingError
        | ParseError
        | MongoError
        | DocumentNotFound
        | UnexpectedOpeningTag
      > = fn("parseVehicles")(function* (username, userTimeZone, data) {
        const doc = yield* parseXml(data);

        if (isUndefined(doc.vehicles))
          return yield* unexpectedOpeningTag(
            "vehicles",
            Object.keys(doc)[0] ?? "<empty>",
          );

        const vehiclesRoot = doc.vehicles as Record<string, unknown>;
        const vehicles = asArray(vehiclesRoot.vehicle);

        const processVehicle = fn(function* (raw: Record<string, unknown>) {
          const aCarVehicle = yield* Schema.decodeUnknown(ACarVehicle)(
            unwrapVehicle(raw),
          );

          yield* logDebug(`processing vehicle ${aCarVehicle.id}`);

          const {
            id,
            photo,
            fuelTankCapacity,
            fillupRecords,
            eventRecords,
            ...rest
          } = aCarVehicle;

          const vehicle = yield* Schema.decode(Vehicle, {
            onExcessProperty: "error",
          })({
            id: VehicleId.make(id),
            ...rest,
            photoId: undefined,
            fuelTankCapacity: fuelTankCapacity.pipe(
              Option.map(BigDecimal.format),
              Option.getOrUndefined,
            ),
          });

          yield* autos.insertUserVehicle(username, vehicle);

          yield* logInfo(`Inserted vehicle ${aCarVehicle.id}`);

          if (Option.isSome(photo)) {
            const fType = yield* promise(() => fileTypeFromBuffer(photo.value));

            yield* autos.addPhotoToVehicle(
              username,
              vehicle.id,
              `unknown${fType?.ext ? `.${fType.ext}` : ""}`,
              fType?.mime ?? "application/octet-stream",
              Stream.succeed(photo.value),
            );
          }

          const convertFillup = fn(function* (fr: ACarFillupRecord) {
            const addlFields = [
              "partial",
              "previousMissedFillups",
              "hasFuelAdditive",
            ] as const;

            const { id, date, ...rest } = Struct.omit(
              Schema.encodeSync(ACarFillupRecord)(fr),
              ...placeFieldNames,
              ...addlFields,
            );

            const timestamp = parseDate(
              date,
              "MM/dd/yyyy - HH:mm",
              new Date(),
              {
                in: tz(userTimeZone),
              },
            ).getTime();

            // wrote the parse place fields code to want the decoded version
            const placeFields = Struct.pick(fr, ...placeFieldNames);
            const { place, deviceLocation } =
              yield* parsePlaceFields(placeFields);

            const addl = Struct.pick(fr, ...addlFields);

            return yield* Schema.decode(FillupRecord, {
              onExcessProperty: "error",
            })({
              id: FillupRecordId.make(id),
              date: timestamp,
              ...addl,
              ...rest,
              deviceLocation,
              place,
            });
          });

          const fillups = yield* forEach(fillupRecords, convertFillup, {
            concurrency: "unbounded",
          });
          yield* autos.replaceFillupRecords(
            { username, vehicleId: vehicle.id },
            fillups,
          );
          yield* logInfo(`Added ${fillups.length} fillup records`);

          const convertEvent = fn(function* (er: ACarEventRecord) {
            const { id, date, ...rest } = Struct.omit(
              Schema.encodeSync(ACarEventRecord)(er),
              ...placeFieldNames,
            );

            const timestamp = parseDate(
              date,
              "MM/dd/yyyy - HH:mm",
              new Date(),
              {
                in: tz(userTimeZone),
              },
            ).getTime();

            // wrote the parse place fields code to want the decoded version
            const placeFields = Struct.pick(er, ...placeFieldNames);
            const { place, deviceLocation } =
              yield* parsePlaceFields(placeFields);

            return yield* Schema.decode(EventRecord, {
              onExcessProperty: "error",
            })({
              id: EventRecordId.make(id),
              date: timestamp,
              ...rest,
              deviceLocation,
              place,
            });
          });

          const events = yield* forEach(eventRecords, convertEvent, {
            concurrency: "unbounded",
          });
          yield* autos.replaceEventRecords(
            { username, vehicleId: vehicle.id },
            events,
          );
          yield* logInfo(`Added ${eventRecords.length} event records`);
        });

        yield* forEach(vehicles, processVehicle);

        yield* logInfo("Finished parsing vehicles");
      });

      const importFromACarFullBackup: (
        username: Username,
        userTimeZone: TimeZone,
        zipPath: string,
      ) => Effect.Effect<
        void,
        | AutosApiModel.AbpFileCorruptedError
        | AutosApiModel.AbpWrongFormatError
        | RedactedError
      > = fn(
        function* (username, userTimeZone, zipPath) {
          yield* logInfo("Beginning aCar Full Backup import");

          yield* logInfo(`Unzipping ${zipPath}`);

          const backupFiles = yield* zip.getZipContents(zipPath);

          yield* logInfo(`Unzipped ${backupFiles.length} files/directories`);

          const eventSubtypesData = yield* readBackupFile(
            backupFiles,
            "event-subtypes.xml",
          );
          const fuelTypesData = yield* readBackupFile(
            backupFiles,
            "fuel-types.xml",
          );
          const tripTypesData = yield* readBackupFile(
            backupFiles,
            "trip-types.xml",
          );

          const eventSubtypes = yield* parseEventSubtypes(eventSubtypesData);
          const fuelTypes = yield* parseFuelTypes(fuelTypesData);
          const tripTypes = yield* parseTripTypes(tripTypesData);
          yield* logInfo(
            "Parsed settings, going to start writing to the database",
          );

          yield* inTransactionRaw()(
            gen(function* () {
              yield* autos.deleteAllUserData(username, {
                includeUserTypes: false,
              });
              yield* logInfo("Replacing settings");
              yield* autos.replaceAllUserTypes(
                UserTypesWithId.make({
                  _id: username,
                  eventSubtypes: Object.fromEntries(
                    eventSubtypes.map(e => [e.id, e]),
                  ),
                  fuelTypes: Object.fromEntries(fuelTypes.map(f => [f.id, f])),
                  tripTypes: Object.fromEntries(tripTypes.map(t => [t.id, t])),
                }),
              );

              yield* logInfo("Parsing vehicles");
              const vehiclesData = yield* readBackupFile(
                backupFiles,
                "vehicles.xml",
              );
              yield* parseVehicles(username, userTimeZone, vehiclesData);
            }),
          );
        },
        scoped,
        tapError(e => logError(e.message)),
        catchTags({
          UnexpectedOpeningTag: () =>
            new AutosApiModel.AbpWrongFormatError({
              type: "UnexpectedOpeningTag",
            }),
          MissingBackupFile: () =>
            new AutosApiModel.AbpWrongFormatError({
              type: "MissingBackupFile",
            }),
          ParseError: () =>
            new AutosApiModel.AbpWrongFormatError({ type: "ParseError" }),
          UnzipError: () =>
            new AutosApiModel.AbpFileCorruptedError({ type: "UnzipError" }),
          XmlParsingError: () =>
            new AutosApiModel.AbpFileCorruptedError({
              type: "XmlParsingError",
            }),
          SystemError: RedactedError.provideLogged(randomId),
          BadArgument: RedactedError.provideLogged(randomId),
          MongoError: RedactedError.provideLogged(randomId),
          // wow, if we couldn't find a document we literally just inserted...
          DocumentNotFound: RedactedError.provideLogged(randomId),
        }),
      );

      return { import: importFromACarFullBackup };
    }),
  },
) {}
