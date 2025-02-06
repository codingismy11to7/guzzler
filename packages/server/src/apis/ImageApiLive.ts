import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { NotFound } from "@effect/platform/HttpApiError";
import { ImageApi } from "@guzzlerapp/domain";
import { AppApi } from "@guzzlerapp/domain/AppApi";
import { RedactedError } from "@guzzlerapp/domain/Errors";
import { ObjectId } from "bson";
import { catchTags, gen } from "effect/Effect";
import { FileFetcher } from "../FileFetcher.js";

export const ImageApiLive = HttpApiBuilder.group(AppApi, "images", handlers =>
  gen(function* () {
    const { getFileById } = yield* FileFetcher;

    return handlers.handleRaw(ImageApi.GetImageById, ({ path: { imageId } }) =>
      gen(function* () {
        const { stream, contentType } = yield* getFileById(
          ObjectId.createFromHexString(imageId),
        );

        return HttpServerResponse.stream(stream, { contentType });
      }).pipe(
        catchTags({
          DocumentNotFound: () => new NotFound(),
          MongoError: RedactedError.logged,
        }),
      ),
    );
  }),
);
