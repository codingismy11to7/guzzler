import { ImageApi } from "@guzzler/domain";
import { PhotoId } from "@guzzler/domain/Autos";
import { Option } from "effect";

export const imageUrl = (imageId: Option.Some<PhotoId>) =>
  ImageApi.ImageApi.endpoints[ImageApi.GetImageById].path.replace(
    ":imageId",
    imageId.value,
  );
