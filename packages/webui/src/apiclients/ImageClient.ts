import { ImageApi } from "@guzzlerapp/domain";
import { PhotoId } from "@guzzlerapp/domain/models/Autos";
import { Option } from "effect";

export const imageUrl = (imageId: Option.Some<PhotoId>) =>
  ImageApi.ImageApi.endpoints[ImageApi.GetImageById].path.replace(
    ":imageId",
    imageId.value,
  );
