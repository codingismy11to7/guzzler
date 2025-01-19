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

export const WrongFormatErrorType = Schema.Literal(
  "UnexpectedOpeningTag",
  "ParseError",
  "MissingBackupFile",
);
export class WrongFormatError extends Schema.TaggedError<WrongFormatError>(
  "WrongFormatError",
)(
  "WrongFormatError",
  {
    type: WrongFormatErrorType,
  },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file wasn't in the format the server expects",
  }),
) {}

export const FileCorruptedErrorType = Schema.Literal(
  "ZipError",
  "XmlParsingError",
);
export class FileCorruptedError extends Schema.TaggedError<FileCorruptedError>(
  "FileCorruptedError",
)(
  "FileCorruptedError",
  { type: FileCorruptedErrorType },
  HttpApiSchema.annotations({
    status: 400,
    description: "The file was corrupted or not a .abp file.",
  }),
) {}

export type ImportError = WrongFormatError | FileCorruptedError;

export class AutosApi extends HttpApiGroup.make("autos")
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
      .addError(WrongFormatError)
      .addError(FileCorruptedError)
      .addError(RedactedError),
  )
  .prefix("/import")
  .middleware(RequireFullSession)
  .prefix("/autos") {}
