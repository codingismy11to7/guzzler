import { HttpApiSchema } from "@effect/platform";
import { Schema as S, Struct } from "effect";
import { DurationInput } from "effect/Duration";
import * as internal from "../internal/models/autosApiModel.js";
import { Username } from "../User.js";
import { UserVehicleId, VehicleId } from "./Autos.js";
import { Latitude, Location, Longitude } from "./Location.js";
import { Place } from "./Place.js";

/* gas station query */

export class NoMapsApiKeySet extends S.TaggedError<NoMapsApiKeySet>(
  "NoMapsApiKeySet",
)(
  "NoMapsApiKeySet",
  {},
  HttpApiSchema.annotations({
    status: 400,
    description:
      "User doesn't have a GMaps API key set and cannot query for fueling stations",
  }),
) {}

export const GasStationQueryMode = S.Literal(
  "GasStations",
  "EVChargingStations",
);
export type GasStationQueryMode = typeof GasStationQueryMode.Type;

export const GasStationQuery = S.Struct({
  ...Location.fields,
  mode: GasStationQueryMode,
}).annotations({
  title: "GasStationQuery",
  examples: [
    {
      latitude: S.decodeSync(Latitude)("33.7739776"),
      longitude: S.decodeSync(Longitude)("-84.3481088"),
      mode: "GasStations",
    },
    {
      latitude: S.decodeSync(Latitude)("34.1536658"),
      longitude: S.decodeSync(Longitude)("-84.2372296"),
      mode: "GasStations",
    },
  ],
});

export const GasStationResponsePlace = S.Struct({
  distanceFromSearchLocation: S.String,
  name: S.String,
  fullAddress: S.String,
  shortAddress: S.String,
  googlePlacesId: S.String,
  googleMapsUri: S.URL,
  location: Location,
  ...Struct.pick(
    Place.fields,
    "street",
    "city",
    "state",
    "country",
    "postalCode",
  ),
});
export type GasStationResponsePlace = typeof GasStationResponsePlace.Type;

/* aCar backups */

export const AbpWrongFormatErrorType = S.Literal(
  "UnexpectedOpeningTag",
  "ParseError",
  "MissingBackupFile",
);
export class AbpWrongFormatError extends S.TaggedError<AbpWrongFormatError>(
  "AbpWrongFormatError",
)(
  "AbpWrongFormatError",
  {
    type: AbpWrongFormatErrorType,
  },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file wasn't in the format the server expects",
  }),
) {}

export const AbpFileCorruptedErrorType = S.Literal(
  "UnzipError",
  "XmlParsingError",
);
export class AbpFileCorruptedError extends S.TaggedError<AbpFileCorruptedError>(
  "AbpFileCorruptedError",
)(
  "AbpFileCorruptedError",
  { type: AbpFileCorruptedErrorType },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file was corrupted or not a .abp file.",
  }),
) {}

/* guzzler backups */

export const BackupWrongFormatErrorType = S.Literal(
  "ParseError",
  "MissingBackupFile",
  "UnknownBackupVersion",
);
export class BackupWrongFormatError extends S.TaggedError<BackupWrongFormatError>(
  "BackupWrongFormatError",
)(
  "BackupWrongFormatError",
  {
    type: BackupWrongFormatErrorType,
  },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file wasn't in the format the server expects",
  }),
) {}

export const BackupFileCorruptedErrorType = S.Literal("UnzipError");
export class BackupFileCorruptedError extends S.TaggedError<BackupFileCorruptedError>(
  "BackupFileCorruptedError",
)(
  "BackupFileCorruptedError",
  { type: BackupFileCorruptedErrorType },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file was corrupted or not a .abp file.",
  }),
) {}

export class ZipError extends S.TaggedError<ZipError>("AutosApiZipError")(
  "AutosApiZipError",
  {},
  HttpApiSchema.annotations({
    status: 500,
    description: "There was some issue compressing the backup.",
  }),
) {}

export const ImportResult = S.Struct({
  vehicles: S.Int,
  fillups: S.Int,
  events: S.Int,
});
export type ImportResult = typeof ImportResult.Type;

export type AbpImportError = AbpWrongFormatError | AbpFileCorruptedError;
export type BackupImportError =
  | BackupWrongFormatError
  | BackupFileCorruptedError;

/* Change Subscription Pushes */

export const UserVehicleChange = S.Struct({
  collectionName: S.Literal("eventRecords", "fillupRecords"),
  _id: UserVehicleId,
});
export type UserVehicleChange = typeof UserVehicleChange.Type;
export const UserChange = S.Struct({
  collectionName: S.Literal("userTypes", "vehicles"),
  _id: Username,
});
export const isUserChange = S.is(UserChange);
export const ChangeEvent = S.Union(UserVehicleChange, UserChange).annotations({
  identifier: "AutosModel/ChangeEvent",
});
export type ChangeEvent = typeof ChangeEvent.Type;

export const changeEventsToFrontend = internal.changeEventsToFrontend;

export class FrontendUserVehicleChange extends S.Class<FrontendUserVehicleChange>(
  "FrontendUserVehicleChange",
)({
  type: UserVehicleChange.fields.collectionName,
  vehicleIds: S.Array(VehicleId).pipe(S.optionalWith({ default: () => [] })),
}) {}
export class FrontendUserChange extends S.Class<FrontendUserChange>(
  "FrontendUserChange",
)({
  type: UserChange.fields.collectionName,
}) {}
export const FrontendChangeEvent = S.Union(
  FrontendUserVehicleChange,
  FrontendUserChange,
).annotations({ identifier: "AutosModel/FrontendChangeEvent" });
export type FrontendChangeEvent = typeof FrontendChangeEvent.Type;

/* Endpoint IDs needed from frontend */

export const ExportBackupCallId = "exportBackup";
export const SubscribeToChanges = "subscribeToChanges";

/* consts */

export const HeartbeatInterval = "5 seconds" satisfies DurationInput;
