import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { Schema } from "effect";
import { RequireFullSession } from "../Authentication.js";
import { PhotoId } from "../Autos.js";
import { RedactedError } from "../Errors.js";

export const GetImageById = "getImageById";

export class ImageApi extends HttpApiGroup.make("images")
  .add(
    HttpApiEndpoint.get(GetImageById, "/:imageId")
      .setPath(Schema.Struct({ imageId: PhotoId }))
      .addSuccess(
        Schema.String.pipe(
          HttpApiSchema.withEncoding({
            kind: "Text",
            contentType: "application/octet-stream",
          }),
          Schema.annotations({
            description:
              "The contentType may actually be the contentType of the image.",
          }),
        ),
      )
      .addError(NotFound)
      .addError(RedactedError),
  )
  .prefix("/images")
  .middleware(RequireFullSession)
  .prefix("/api/files") {}
