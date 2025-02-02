import { Schema as S } from "effect";
import { NumberFromSelfOrString } from "../MiscSchemas.js";

// was storing these as string before, so just let them load either string or
// number instead of doing migrations on already-stored data

export const Latitude = NumberFromSelfOrString.pipe(
  S.brand("latitude"),
  S.between(-90, 90),
);
export type Latitude = typeof Latitude.Type;
export const Longitude = NumberFromSelfOrString.pipe(
  S.brand("longitude"),
  S.between(-180, 180),
);
export type Longitude = typeof Longitude.Type;

export class Location extends S.Class<Location>("Location")({
  latitude: Latitude,
  longitude: Longitude,
}) {}
export const OptionalLocation = S.OptionFromUndefinedOr(Location);
export const encodeLocationOpt = S.encodeSync(OptionalLocation);
