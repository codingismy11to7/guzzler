import { Schema as S } from "effect";
import { OptionalString } from "../MiscSchemas.js";
import { OptionalLocation } from "./Location.js";

export class Place extends S.Class<Place>("Place")({
  name: OptionalString,
  fullAddress: OptionalString,
  street: OptionalString,
  city: OptionalString,
  state: OptionalString,
  country: OptionalString,
  postalCode: OptionalString,
  googlePlacesId: OptionalString,
  googleMapsUri: S.OptionFromUndefinedOr(S.URL),
  location: OptionalLocation,
}) {}
