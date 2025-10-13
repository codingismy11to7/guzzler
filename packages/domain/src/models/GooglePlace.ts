import { Schema as S } from "effect";
import { OptionalNumber, OptionalString } from "../MiscSchemas.js";
import { Location } from "./Location.js";

const AdditionalPlaceType = S.Literal(
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "administrative_area_level_4",
  "administrative_area_level_5",
  "administrative_area_level_6",
  "administrative_area_level_7",
  "archipelago",
  "colloquial_area",
  "continent",
  "country",
  "establishment",
  "finance",
  "floor",
  "food",
  "general_contractor",
  "geocode",
  "health",
  "intersection",
  "landmark",
  "locality",
  "natural_feature",
  "neighborhood",
  "place_of_worship",
  "plus_code",
  "point_of_interest",
  "political",
  "post_box",
  "postal_code",
  "postal_code_prefix",
  "postal_code_suffix",
  "postal_town",
  "premise",
  "room",
  "route",
  "street_address",
  "street_number",
  "sublocality",
  "sublocality_level_1",
  "sublocality_level_2",
  "sublocality_level_3",
  "sublocality_level_4",
  "sublocality_level_5",
  "subpremise",
  "town_square",
);

export const FilterablePlaceType = S.Literal(
  "accounting",
  "airport",
  "amusement_park",
  "aquarium",
  "art_gallery",
  "atm",
  "bakery",
  "bank",
  "bar",
  "beauty_salon",
  "bicycle_store",
  "book_store",
  "bowling_alley",
  "bus_station",
  "cafe",
  "campground",
  "car_dealer",
  "car_rental",
  "car_repair",
  "car_wash",
  "casino",
  "cemetery",
  "church",
  "city_hall",
  "clothing_store",
  "convenience_store",
  "courthouse",
  "dentist",
  "department_store",
  "doctor",
  "drugstore",
  "electric_vehicle_charging_station",
  "electrician",
  "electronics_store",
  "embassy",
  "fire_station",
  "florist",
  "funeral_home",
  "furniture_store",
  "gas_station",
  "gym",
  "hair_care",
  "hardware_store",
  "hindu_temple",
  "home_goods_store",
  "hospital",
  "insurance_agency",
  "jewelry_store",
  "laundry",
  "lawyer",
  "library",
  "light_rail_station",
  "liquor_store",
  "local_government_office",
  "locksmith",
  "lodging",
  "meal_delivery",
  "meal_takeaway",
  "mosque",
  "movie_rental",
  "movie_theater",
  "moving_company",
  "museum",
  "night_club",
  "painter",
  "park",
  "parking",
  "pet_store",
  "pharmacy",
  "physiotherapist",
  "plumber",
  "police",
  "post_office",
  "primary_school",
  "real_estate_agency",
  "restaurant",
  "roofing_contractor",
  "rv_park",
  "school",
  "secondary_school",
  "shoe_store",
  "shopping_mall",
  "spa",
  "stadium",
  "storage",
  "store",
  "subway_station",
  "supermarket",
  "synagogue",
  "taxi_stand",
  "tourist_attraction",
  "train_station",
  "transit_station",
  "travel_agency",
  "university",
  "veterinary_care",
  "zoo",
);
export type FilterablePlaceType = typeof FilterablePlaceType.Type;

export const PlaceType = S.Union(FilterablePlaceType, AdditionalPlaceType);

export type PlaceType = typeof PlaceType.Type;

export const AddressComponent = S.Struct({
  longText: S.String,
  shortText: S.String,
  types: S.Array(PlaceType),
  languageCode: S.String,
}).annotations({
  title: "AddressComponent",
});
export type AddressComponent = typeof AddressComponent.Type;

const PlusCode = S.Struct({
  globalCode: S.String,
  compoundCode: S.String,
});

const Viewport = S.Struct({ low: Location, high: Location });

const OpeningHours = S.Struct({
  openNow: S.Boolean,
  periods: S.Array(
    S.Struct({
      open: S.Struct({ day: S.Number, hour: S.Number, minute: S.Number }),
    }),
  ),
  weekdayDescriptions: S.Array(S.String),
});

export const GooglePlace = S.Struct({
  /* required because that's what i want */
  name: S.String,
  id: S.String,
  displayName: S.Struct({ text: S.String, languageCode: S.String }),
  formattedAddress: S.String,
  addressComponents: S.Array(AddressComponent),
  location: Location,
  googleMapsUri: S.URL,

  /* the rest; TODO look into Schema.partial with Schema.extend */
  shortFormattedAddress: OptionalString,
  nationalPhoneNumber: OptionalString,
  internationalPhoneNumber: OptionalString,
  plusCode: PlusCode.pipe(S.optional),
  viewport: Viewport.pipe(S.optional),
  rating: OptionalNumber,
  websiteUri: S.URL.pipe(S.optional),
  regularOpeningHours: OpeningHours.pipe(S.optional),
  utcOffsetMinutes: OptionalNumber,
  adrFormatAddress: OptionalString,
  businessStatus: S.Literal(
    "BUSINESS_STATUS_UNSPECIFIED",
    "OPERATIONAL",
    "CLOSED_TEMPORARILY",
    "CLOSED_PERMANENTLY",
  ).pipe(S.optional),
  // why am i doing this? there's more. stopping now
}).annotations({
  title: "GooglePlace",
  description: `#### A 'Place' returned from GMaps API.

This is an opinionated model - since the returned model only has the fields
that were chosen during the query, all fields are optional. For this model
to be accurate, these must be the chosen fields:

- places.addressComponents
- places.displayName
- places.formattedAddress
- places.googleMapsUri
- places.id
- places.location
- places.name
`,
});

export type GooglePlace = typeof GooglePlace.Type;
