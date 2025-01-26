import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  Multipart,
  OpenApi,
} from "@effect/platform";
import { BadRequest, NotFound } from "@effect/platform/HttpApiError";
import { NoContent } from "@effect/platform/HttpApiSchema";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";
import {
  EventRecordsByVehicle,
  FillupRecordsByVehicle,
  UserTypes,
  Vehicle,
  VehicleId,
  VehiclesDict,
} from "../Autos.js";
import { RedactedError, ServerError } from "../Errors.js";
import {
  AbpFileCorruptedError,
  AbpWrongFormatError,
  BackupFileCorruptedError,
  BackupWrongFormatError,
  ExportBackupCallId,
  FrontendChangeEvent,
  SubscribeToChanges,
  ZipError,
} from "../models/AutosModel.js";
import { TimeZone } from "../TimeZone.js";

export class AutosApi extends HttpApiGroup.make("autos")
  .add(
    HttpApiEndpoint.get("getUserTypes", "/types")
      .addSuccess(UserTypes)
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.get("getUserVehicle", "/vehicle/:vehicleId")
      .setPath(Schema.Struct({ vehicleId: VehicleId }))
      .addSuccess(Vehicle)
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.del("deleteUserVehicle", "/vehicle/:vehicleId")
      .setPath(Schema.Struct({ vehicleId: VehicleId }))
      .addSuccess(NoContent)
      .addError(NotFound)
      .addError(RedactedError),
  )
  .add(
    HttpApiEndpoint.get("getUserVehicles", "/vehicles")
      .addSuccess(VehiclesDict)
      .addError(NotFound),
  )
  .add(
    HttpApiEndpoint.get("getUserFillups", "/fillups").addSuccess(
      FillupRecordsByVehicle,
    ),
  )
  .add(
    HttpApiEndpoint.get("getUserEvents", "/events").addSuccess(
      EventRecordsByVehicle,
    ),
  )
  .add(
    HttpApiEndpoint.get(SubscribeToChanges, "/changes")
      .addSuccess(
        Schema.Union(Schema.Literal("ping"), FrontendChangeEvent).pipe(
          // TODO this isn't picked up, probably because of the weird allOf
          //  this gets turned into for the openapi. ask about this some day
          Schema.annotations({ description: "Pushed messages" }),
        ),
      )
      .addError(BadRequest)
      .addError(RedactedError)
      .addError(ServerError)
      .annotate(OpenApi.Summary, "Change notifications")
      .annotate(
        OpenApi.Description,
        `
> This endpoint is actually a websocket pushing messages. Don't try to call it
as the \`GET\` it's advertised as - technically this documentation doesn't
belong here, but at least it's somewhere.
 
These messages are either a \`ping\` string, or an object with the type of data
that changed, and an optional ID for an individual piece of data.

The \`ping\` responses must be responded to with \`pong\`.
`,
      ),
  )
  .prefix("/userData")
  .add(
    HttpApiEndpoint.get(ExportBackupCallId, "/data/export/:backupName")
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
    HttpApiEndpoint.post("importACarBackup", "/data/import/aCarBackup")
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
    HttpApiEndpoint.post("importBackup", "/data/import/backup")
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
  .prefix("/api/autos")
  .middleware(RequireFullSession)
  .annotateContext(
    OpenApi.annotations({
      title: "Vehicles",
      description: "CRUD for vehicles and associated data",
    }),
  ) {}
