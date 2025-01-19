import { tz } from "@date-fns/tz";
import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { AutosApi } from "@guzzler/domain";
import {
  encodeLocationOpt,
  EventRecord,
  EventRecordId,
  EventSubtype,
  FillupRecord,
  FillupRecordId,
  FuelType,
  Latitude,
  Location,
  Longitude,
  Place,
  TripType,
  UserTypes,
  Vehicle,
  VehicleId,
} from "@guzzler/domain/Autos";
import { RedactedError } from "@guzzler/domain/Errors";
import {
  BooleanFromSelfOrString,
  IntFromSelfOrString,
  NumberFromSelfOrString,
  OptionalBigDecimal,
  OptionalString,
} from "@guzzler/domain/MiscSchemas";
import { TimeZone } from "@guzzler/domain/TimeZone";
import { Username } from "@guzzler/domain/User";
import { MongoError, NotFound } from "@guzzler/mongodb/Model";
import { MongoTransactions } from "@guzzler/mongodb/MongoTransactions";
import { RandomId } from "@guzzler/utils/RandomId";
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
import { catchTag, catchTags, gen } from "effect/Effect";
import { ParseError } from "effect/ParseResult";
import { isNotUndefined, isUndefined } from "effect/Predicate";
import { fileTypeFromBuffer } from "file-type";
import { AutosStorage } from "../AutosStorage.js";
import { singleStreamPuller } from "../internal/util/singleStreamPuller.js";
import { Zip } from "../internal/util/zip.js";
import { Xml2JsNode } from "../internal/xml/Xml2JsNode.js";
import type { XmlParsingError } from "../internal/xml/XmlParser.js";
import { ParseEvent, XmlParser } from "../internal/xml/XmlParser.js";

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
            ...Object.fromEntries(
              Object.entries(placeFields).map(([k, v]) => [removePlace(k), v]),
            ),
          });

    return { place, deviceLocation };
  });

const child = (n: Xml2JsNode, name: string) =>
  n.children.find(n => n.name === name);
const childObjects = (n: Xml2JsNode, ...names: string[]) =>
  names.reduce(
    (acc, name) => ({
      ...acc,
      [name]: (child(n, name)?.children ?? []).map(childrenAsObj),
    }),
    {},
  );
const childrenAsObj = (n: Xml2JsNode): Record<string, unknown> =>
  Object.fromEntries(
    n.children.map(child => [
      child.name,
      child.children.length ? childrenAsObj(child) : child.text,
    ]),
  );

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

class MissingBackupFile extends Data.TaggedError("MissingBackupFile")<{
  fileName: string;
}> {
  get message() {
    return `Missing expected backup file '${this.fileName}'`;
  }
}

const importFromACarFullBackup =
  (
    autos: AutosStorage,
    { inTransactionRaw }: MongoTransactions,
    zip: Zip,
    fs: FileSystem.FileSystem,
    path: Path.Path,
    { parseEntireXml, xmlStream, transformToJson }: XmlParser,
  ) =>
  (
    username: Username,
    userTimeZone: TimeZone,
    zipPath: string,
  ): Effect.Effect<
    void,
    AutosApi.FileCorruptedError | AutosApi.WrongFormatError | RedactedError,
    RandomId
  > =>
    gen(function* () {
      const parseEventSubtypes = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<
        readonly EventSubtype[],
        ParseError | XmlParsingError | UnexpectedOpeningTag | E
      > =>
        Effect.gen(function* () {
          const doc = yield* parseEntireXml(data);

          if (doc.name !== "eventSubtypes")
            yield* unexpectedOpeningTag("eventSubtypes", doc.name);

          const convert = (
            n: Xml2JsNode,
          ): Effect.Effect<
            ACarEventSubtype,
            UnexpectedOpeningTag | ParseError
          > =>
            n.name !== "eventSubtype"
              ? unexpectedOpeningTag("eventSubtype", n.name)
              : Schema.decodeUnknown(ACarEventSubtype)({
                  id: n.attrs.id,
                  type: n.attrs.type,
                  ...childrenAsObj(n),
                });

          // make sure they match our schema
          const parsed = yield* Effect.forEach(doc.children, convert, {
            concurrency: "unbounded",
          });

          // and now that we know what's in the parsed docs, we can convert to the data model

          const convertToDataModel = (es: ACarEventSubtype) =>
            Schema.decode(EventSubtype, { onExcessProperty: "error" })(es);

          return yield* Effect.forEach(parsed, convertToDataModel, {
            concurrency: "unbounded",
          }).pipe(
            Effect.tap(Effect.logInfo(`parsed ${parsed.length} EventSubtypes`)),
          );
        }).pipe(Effect.withLogSpan("parseEventSubtypes"));

      const parseFuelTypes = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<
        readonly FuelType[],
        ParseError | XmlParsingError | UnexpectedOpeningTag | E
      > =>
        Effect.gen(function* () {
          const doc = yield* parseEntireXml(data);

          if (doc.name !== "fuelTypes")
            yield* unexpectedOpeningTag("fuelTypes", doc.name);

          const convert = (
            n: Xml2JsNode,
          ): Effect.Effect<ACarFuelType, UnexpectedOpeningTag | ParseError> =>
            n.name !== "fuelType"
              ? unexpectedOpeningTag("fuelType", n.name)
              : pipe(
                  { id: n.attrs.id, ...childrenAsObj(n) } as Record<
                    string,
                    unknown
                  >,
                  // add a default name if it's missing
                  f => ({ ...f, name: f.name || `${f.category} [${f.id}]` }),
                  Schema.decodeUnknown(ACarFuelType),
                );

          const parsed = yield* Effect.forEach(doc.children, convert, {
            concurrency: "unbounded",
          });

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

          return yield* Effect.forEach(parsed, convertToDataModel, {
            concurrency: "unbounded",
          }).pipe(
            Effect.tap(Effect.logInfo(`parsed ${parsed.length} FuelTypes`)),
          );
        }).pipe(Effect.withLogSpan("parseFuelTypes"));

      const parseTripTypes = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<
        readonly TripType[],
        ParseError | XmlParsingError | UnexpectedOpeningTag | E
      > =>
        Effect.gen(function* () {
          const doc = yield* parseEntireXml(data);

          if (doc.name !== "tripTypes")
            yield* unexpectedOpeningTag("tripTypes", doc.name);

          const convert = (
            n: Xml2JsNode,
          ): Effect.Effect<ACarTripType, UnexpectedOpeningTag | ParseError> =>
            n.name !== "tripType"
              ? unexpectedOpeningTag("tripType", n.name)
              : pipe(
                  { id: n.attrs.id, ...childrenAsObj(n) },
                  Schema.decodeUnknown(ACarTripType),
                );

          const parsed = yield* Effect.forEach(doc.children, convert);

          const convertToDataModel = (tt: ACarTripType) =>
            Schema.decode(TripType, { onExcessProperty: "error" })(tt);

          return yield* Effect.forEach(parsed, convertToDataModel, {
            concurrency: "unbounded",
          }).pipe(
            Effect.tap(Effect.logInfo(`parsed ${parsed.length} TripTypes`)),
          );
        }).pipe(Effect.withLogSpan("parseTripTypes"));

      const parseVehicles = <E>(
        data: Stream.Stream<Uint8Array, E>,
      ): Effect.Effect<
        void,
        | XmlParsingError
        | ParseError
        | MongoError
        | NotFound
        | UnexpectedOpeningTag
        | E
      > =>
        Effect.gen(function* () {
          const [controller, evtStream] = yield* xmlStream(data);

          const { pullNext, peekNext } = yield* singleStreamPuller(evtStream);

          const currEvt = yield* pullNext;
          if (currEvt._tag !== "StartElement" || currEvt.name !== "vehicles")
            yield* unexpectedOpeningTag(
              "vehicles",
              // eslint-disable-next-line @typescript-eslint/no-base-to-string
              currEvt._tag === "StartElement" ? currEvt.name : `${currEvt}`,
            );

          const parseAndHandleNextVehicle: Effect.Effect<
            void,
            Option.Option<
              XmlParsingError | ParseError | MongoError | NotFound | E
            >
          > = gen(function* () {
            const nextIsVehicleStart = pipe(
              peekNext,
              Effect.andThen(
                e => e._tag === "StartElement" && e.name === "vehicle",
              ),
            );

            while (!(yield* nextIsVehicleStart)) yield* pullNext;

            const vehicleStream = Stream.unfoldEffect(false, seenEnd =>
              seenEnd
                ? Effect.succeedNone
                : pipe(
                    pullNext,
                    Effect.andThen(evt =>
                      Effect.succeed<
                        Option.Option<readonly [ParseEvent, boolean]>
                      >(
                        Option.some([
                          evt,
                          evt._tag === "EndElement" && evt.name === "vehicle",
                        ]),
                      ),
                    ),
                  ),
            );

            const node = yield* transformToJson(vehicleStream).pipe(
              Effect.catchTag("XmlParsingError", e =>
                Effect.fail(Option.some(e)),
              ),
            );

            // ok it read a potentially large subdocument, pause the stream while we handle
            // said potentially-large subdocument.

            yield* controller.withPausedStream(
              gen(function* () {
                const aCarVehicle = yield* Schema.decodeUnknown(ACarVehicle)({
                  id: node.attrs.id,
                  ...childrenAsObj(node),
                  ...childObjects(
                    node,
                    "vehicleParts",
                    "reminders",
                    "tripRecords",
                  ),
                  fillupRecords: (
                    child(node, "fillupRecords")?.children ?? []
                  ).map(n => ({
                    id: n.attrs.id,
                    ...childrenAsObj(n),
                  })),
                  eventRecords: (
                    child(node, "eventRecords")?.children ?? []
                  ).map(n => ({
                    id: n.attrs.id,
                    ...childrenAsObj(n),
                  })),
                }).pipe(Effect.asSomeError);

                yield* Effect.logDebug(`processing vehicle ${aCarVehicle.id}`);

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
                }).pipe(Effect.asSomeError);

                yield* autos.insertUserVehicle(username, vehicle);

                yield* Effect.logInfo(`Inserted vehicle ${aCarVehicle.id}`);

                if (Option.isSome(photo)) {
                  const fType = yield* Effect.promise(() =>
                    fileTypeFromBuffer(photo.value),
                  );

                  yield* autos
                    .addPhotoToVehicle(
                      username,
                      vehicle.id,
                      `unknown${fType?.ext ? `.${fType.ext}` : ""}`,
                      fType?.mime ?? "application/octet-stream",
                      Stream.succeed(photo.value),
                    )
                    .pipe(Effect.asSomeError);
                }

                const convertFillup = (fr: ACarFillupRecord) =>
                  gen(function* () {
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
                  }).pipe(Effect.asSomeError);

                const fillups = yield* Effect.forEach(
                  fillupRecords,
                  convertFillup,
                  {
                    concurrency: "unbounded",
                  },
                );
                yield* autos.insertFillupRecords(username, vehicle.id, fillups);
                yield* Effect.logInfo(`Added ${fillups.length} fillup records`);

                const convertEvent = (er: ACarEventRecord) =>
                  gen(function* () {
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
                  }).pipe(Effect.asSomeError);

                const events = yield* Effect.forEach(
                  eventRecords,
                  convertEvent,
                  { concurrency: "unbounded" },
                );
                yield* autos.insertEventRecords(username, vehicle.id, events);
                yield* Effect.logInfo(
                  `Added ${eventRecords.length} event records`,
                );
              }),
            );
          });

          while (isNotUndefined(yield* peekNext))
            yield* parseAndHandleNextVehicle;
        }).pipe(
          Effect.catchTags({
            None: () => Effect.void,
            Some: e => Effect.fail(e.value),
          }),
          Effect.andThen(Effect.logInfo("Finished parsing vehicles")),
          Effect.withLogSpan("parseVehicles"),
          Effect.scoped,
        );

      yield* Effect.logInfo("Beginning aCar Full Backup import");

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
                .find(e => path.basename(e.fileName) === fileName),
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

      const eventSubtypes = yield* parseEventSubtypes(
        openBackupFile("event-subtypes.xml"),
      );
      const fuelTypes = yield* parseFuelTypes(openBackupFile("fuel-types.xml"));
      const tripTypes = yield* parseTripTypes(openBackupFile("trip-types.xml"));
      yield* Effect.logInfo(
        "Parsed settings, going to start writing to the database",
      );

      yield* inTransactionRaw()(
        gen(function* () {
          yield* autos.deleteAllUserData(username, { includeUserTypes: false });
          yield* Effect.logInfo("Replacing settings");
          yield* autos.replaceAllUserTypes(
            UserTypes.make({
              username,
              eventSubtypes: Object.fromEntries(
                eventSubtypes.map(e => [e.id, e]),
              ),
              fuelTypes: Object.fromEntries(fuelTypes.map(f => [f.id, f])),
              tripTypes: Object.fromEntries(tripTypes.map(t => [t.id, t])),
            }),
          );

          yield* Effect.logInfo("Parsing vehicles");
          yield* parseVehicles(openBackupFile("vehicles.xml"));
        }),
      );
    }).pipe(
      Effect.scoped,
      Effect.tapError(e => Effect.logError(e.message)),
      catchTags({
        UnexpectedOpeningTag: () =>
          new AutosApi.WrongFormatError({ type: "UnexpectedOpeningTag" }),
        MissingBackupFile: () =>
          new AutosApi.WrongFormatError({ type: "MissingBackupFile" }),
        ParseError: () => new AutosApi.WrongFormatError({ type: "ParseError" }),
        ZipError: () => new AutosApi.FileCorruptedError({ type: "ZipError" }),
        XmlParsingError: () =>
          new AutosApi.FileCorruptedError({ type: "XmlParsingError" }),
        SystemError: RedactedError.logged,
        MongoError: RedactedError.logged,
        // wow, if we couldn't find a document we literally just inserted...
        NotFound: RedactedError.logged,
      }),
    );

export class ACarFullBackup extends Effect.Service<ACarFullBackup>()(
  "ACarFullBackup",
  {
    accessors: true,
    effect: gen(function* () {
      const autos = yield* AutosStorage;
      const txns = yield* MongoTransactions;
      const zip = yield* Zip;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const xml = yield* XmlParser;

      const _import = importFromACarFullBackup(autos, txns, zip, fs, path, xml);

      return { import: _import };
    }),
  },
) {}
