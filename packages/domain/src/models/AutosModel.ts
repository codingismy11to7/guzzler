import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { DurationInput } from "effect/Duration";
import { UserVehicleId, VehicleId } from "../Autos.js";
import * as internal from "../internal/models/autosModel.js";
import { Username } from "../User.js";

/* aCar backups */

export const AbpWrongFormatErrorType = Schema.Literal(
  "UnexpectedOpeningTag",
  "ParseError",
  "MissingBackupFile",
);
export class AbpWrongFormatError extends Schema.TaggedError<AbpWrongFormatError>(
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

export const AbpFileCorruptedErrorType = Schema.Literal(
  "UnzipError",
  "XmlParsingError",
);
export class AbpFileCorruptedError extends Schema.TaggedError<AbpFileCorruptedError>(
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

export const BackupWrongFormatErrorType = Schema.Literal(
  "ParseError",
  "MissingBackupFile",
  "UnknownBackupVersion",
);
export class BackupWrongFormatError extends Schema.TaggedError<BackupWrongFormatError>(
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

export const BackupFileCorruptedErrorType = Schema.Literal("UnzipError");
export class BackupFileCorruptedError extends Schema.TaggedError<BackupFileCorruptedError>(
  "BackupFileCorruptedError",
)(
  "BackupFileCorruptedError",
  { type: BackupFileCorruptedErrorType },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file was corrupted or not a .abp file.",
  }),
) {}

export class ZipError extends Schema.TaggedError<ZipError>("AutosApiZipError")(
  "AutosApiZipError",
  {},
  HttpApiSchema.annotations({
    status: 500,
    description: "There was some issue compressing the backup.",
  }),
) {}

export type AbpImportError = AbpWrongFormatError | AbpFileCorruptedError;
export type BackupImportError =
  | BackupWrongFormatError
  | BackupFileCorruptedError;

/* Change Subscription Pushes */

export const UserVehicleChange = Schema.Struct({
  collectionName: Schema.Literal("eventRecords", "fillupRecords"),
  _id: UserVehicleId,
});
export type UserVehicleChange = typeof UserVehicleChange.Type;
export const UserChange = Schema.Struct({
  collectionName: Schema.Literal("userTypes", "vehicles"),
  _id: Username,
});
export const isUserChange = Schema.is(UserChange);
export const ChangeEvent = Schema.Union(
  UserVehicleChange,
  UserChange,
).annotations({ identifier: "AutosModel/ChangeEvent" });
export type ChangeEvent = typeof ChangeEvent.Type;

export const changeEventsToFrontend = internal.changeEventsToFrontend;

export class FrontendUserVehicleChange extends Schema.Class<FrontendUserVehicleChange>(
  "FrontendUserVehicleChange",
)({
  type: UserVehicleChange.fields.collectionName,
  vehicleIds: Schema.Array(VehicleId).pipe(
    Schema.optionalWith({ default: () => [] }),
  ),
}) {}
export class FrontendUserChange extends Schema.Class<FrontendUserChange>(
  "FrontendUserChange",
)({
  type: UserChange.fields.collectionName,
}) {}
export const FrontendChangeEvent = Schema.Union(
  FrontendUserVehicleChange,
  FrontendUserChange,
).annotations({ identifier: "AutosModel/FrontendChangeEvent" });
export type FrontendChangeEvent = typeof FrontendChangeEvent.Type;

/* Endpoint IDs needed from frontend */

export const ExportBackupCallId = "exportBackup";
export const SubscribeToChanges = "subscribeToChanges";

/* consts */

export const HeartbeatInterval = "5 seconds" satisfies DurationInput;
