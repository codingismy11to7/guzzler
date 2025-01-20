import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  Multipart,
} from "@effect/platform";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";
import { RedactedError } from "../Errors.js";
import { TimeZone } from "../TimeZone.js";

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

export const ExportBackupCallId = "exportBackup";

export class AutosApi extends HttpApiGroup.make("autos")
  .add(
    HttpApiEndpoint.get(ExportBackupCallId, "/export/:backupName")
      .setPath(Schema.Struct({ backupName: Schema.Trim }))
      .addSuccess(
        Schema.String.pipe(
          HttpApiSchema.withEncoding({
            kind: "Text",
            contentType: "application/octet-stream",
          }),
          Schema.annotations({ description: "The backup file data" }),
        ),
      )
      .addError(ZipError)
      .addError(RedactedError),
  )
  .add(
    HttpApiEndpoint.post("importACarBackup", "/aCarBackup")
      .setPayload(
        HttpApiSchema.Multipart(
          Schema.Struct({
            tz: TimeZone.pipe(
              Schema.annotations({
                examples: ["America/New_York"],
                description: `The backup file has a variety of timestamps in it in a...less than
optimal format. Some of them appear to me to be in local time, but
some appear to be in UTC. Provide a time zone to be used while
importing the backup file. You can change records individually
later, or attempt another import using a different choice.`,
              }),
            ),

            // TODO trying to specify Multipart.FileSchema to signify that only
            //  one file should be uploaded ends up with an error. check back
            //  later.
            abpFile: Schema.Tuple(Multipart.FileSchema).pipe(
              Schema.annotations({
                description: `An aCar full backup file. It gives these files a '.abp' extension.
Trying to upload no or more than one file will be rejected.`,
              }),
            ),
          }),
        ),
      )
      .addSuccess(Schema.Void, { status: 204 })
      .addError(AbpWrongFormatError)
      .addError(AbpFileCorruptedError)
      .addError(RedactedError),
  )
  .add(
    HttpApiEndpoint.post("importBackup", "/backup")
      .setPayload(
        HttpApiSchema.Multipart(
          Schema.Struct({
            // TODO trying to specify Multipart.FileSchema to signify that only
            //  one file should be uploaded ends up with an error. check back
            //  later.
            backupFile: Schema.Tuple(Multipart.FileSchema).pipe(
              Schema.annotations({
                description:
                  "A backup file. Trying to upload no or more than one file will be rejected.",
              }),
            ),
          }),
        ),
      )
      .addSuccess(Schema.Void, { status: 204 })
      .addError(BackupWrongFormatError)
      .addError(BackupFileCorruptedError)
      .addError(RedactedError),
  )
  .prefix("/import")
  .middleware(RequireFullSession)
  .prefix("/autos") {}
