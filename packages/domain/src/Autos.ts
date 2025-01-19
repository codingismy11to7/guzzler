import { Schema, Struct } from "effect";
import {
  IntFromSelfOrString,
  ObjectIdStringSchema,
  OptionalBigDecimal,
  OptionalNumber,
  OptionalString,
  Timestamp,
} from "./MiscSchemas.js";
import { Username } from "./User.js";

/* event subtype */

export const EventSubtypeId = Schema.Trimmed.pipe(
  Schema.brand("EventSubtypeId"),
);
export type EventSubtypeId = typeof EventSubtypeId.Type;

export const EventType = Schema.Trimmed.pipe(Schema.brand("EventType"));
export type EventType = typeof EventType.Type;

export class EventSubtype extends Schema.Class<EventSubtype>("EventSubtype")({
  id: EventSubtypeId,
  type: EventType,
  name: Schema.Trimmed,
  notes: OptionalString,
  defaultTimeReminderInterval: IntFromSelfOrString.pipe(Schema.optional),
  defaultDistanceReminderInterval: IntFromSelfOrString.pipe(Schema.optional),
}) {}

/* fuel type */

export const FuelTypeId = Schema.Trimmed.pipe(Schema.brand("FuelTypeId"));
export type FuelTypeId = typeof FuelTypeId.Type;

export const FuelCategory = Schema.Trimmed.pipe(Schema.brand("FuelCategory"));
export type FuelCategory = typeof FuelCategory.Type;

export const FuelRatingType = Schema.Literal("AKI", "RON", "MON", "Cetane");
export type FuelRatingType = typeof FuelRatingType.Type;

export class FuelType extends Schema.Class<FuelType>("FuelType")({
  id: FuelTypeId,
  category: FuelCategory,
  name: Schema.Trimmed,
  notes: OptionalString,
  ratingType: FuelRatingType.pipe(Schema.optional),
  rating: OptionalNumber,
}) {}

/* trip type */

export const TripTypeId = Schema.Trimmed.pipe(Schema.brand("TripTypeId"));
export type TripTypeId = typeof TripTypeId.Type;

export class TripType extends Schema.Class<TripType>("TripType")({
  id: TripTypeId,
  name: Schema.Trimmed,
  notes: OptionalString,
  defaultTaxDeductionRate: OptionalNumber,
}) {}

/* place */

export const Latitude = Schema.BigDecimal.pipe(Schema.brand("latitude"));
export type Latitude = typeof Latitude.Type;
export const Longitude = Schema.BigDecimal.pipe(Schema.brand("longitude"));
export type Longitude = typeof Longitude.Type;

export class Location extends Schema.Class<Location>("Location")({
  latitude: Latitude,
  longitude: Longitude,
}) {}
const OptionalLocation = Schema.OptionFromUndefinedOr(Location);
export const encodeLocationOpt = Schema.encodeSync(OptionalLocation);

export class Place extends Schema.Class<Place>("Place")({
  name: OptionalString,
  fullAddress: OptionalString,
  street: OptionalString,
  city: OptionalString,
  state: OptionalString,
  country: OptionalString,
  postalCode: OptionalString,
  googlePlacesId: OptionalString,
  location: OptionalLocation,
}) {}

/* fillup record */

export const FillupRecordId = Schema.Trimmed.pipe(
  Schema.brand("FillupRecordId"),
);
export type FillupRecordId = typeof FillupRecordId.Type;

export class FillupRecord extends Schema.Class<FillupRecord>("FillupRecord")({
  id: FillupRecordId,
  date: Timestamp,
  fuelEfficiency: OptionalBigDecimal,
  fuelTypeId: FuelTypeId,
  notes: OptionalString,
  odometerReading: Schema.BigDecimal,
  paymentType: OptionalString,
  pricePerVolumeUnit: Schema.BigDecimal,
  tags: OptionalString,
  totalCost: Schema.BigDecimal,
  volume: Schema.BigDecimal,
  partial: Schema.Boolean,
  previousMissedFillups: Schema.Boolean,
  hasFuelAdditive: Schema.Boolean,
  fuelAdditiveName: OptionalString,
  drivingMode: OptionalString,
  cityDrivingPercentage: Schema.BigDecimal,
  highwayDrivingPercentage: Schema.BigDecimal,
  averageSpeed: OptionalBigDecimal,
  deviceLocation: Schema.OptionFromUndefinedOr(Location),
  place: Schema.OptionFromUndefinedOr(Place),
}) {}

export const encodeFillupRecordSync = Schema.encodeSync(FillupRecord);

/* event record */

export const EventRecordId = Schema.Trimmed.pipe(Schema.brand("EventRecordId"));
export type EventRecordId = typeof EventRecordId.Type;

export class EventRecord extends Schema.Class<EventRecord>("EventRecord")({
  id: EventRecordId,
  type: EventType,
  date: Timestamp,
  notes: OptionalString,
  odometerReading: OptionalBigDecimal,
  paymentType: OptionalString,
  tags: OptionalString,
  totalCost: OptionalBigDecimal,
  deviceLocation: Schema.OptionFromUndefinedOr(Location),
  place: Schema.OptionFromUndefinedOr(Place),
  subtypes: Schema.Unknown,
}) {}

export const encodeEventRecordSync = Schema.encodeSync(EventRecord);

/* vehicle */

export const VehicleId = Schema.Trimmed.pipe(
  Schema.brand("VehicleId"),
  Schema.annotations({ identifier: "VehicleId" }),
);
export type VehicleId = typeof VehicleId.Type;

export class Vehicle extends Schema.Class<Vehicle>("Vehicle")({
  id: VehicleId,
  name: Schema.Trimmed,
  notes: OptionalString,
  type: OptionalString,
  year: Schema.Int.pipe(Schema.positive(), Schema.optional),
  makeId: OptionalString,
  make: OptionalString,
  modelId: OptionalString,
  model: OptionalString,
  vehicleId: OptionalString,
  subModel: OptionalString,
  engineId: OptionalString,
  engine: OptionalString,
  genericEngineBaseId: OptionalString,
  genericFuelTypeId: OptionalString,
  transmissionId: OptionalString,
  transmission: OptionalString,
  driveTypeId: OptionalString,
  driveType: OptionalString,
  bodyTypeId: OptionalString,
  bodyType: OptionalString,
  bedTypeId: OptionalString,
  bedType: OptionalString,
  licensePlate: OptionalString,
  vin: OptionalString,
  insurancePolicy: OptionalString,
  color: OptionalString,
  fuelTankCapacity: OptionalBigDecimal,
  active: Schema.Boolean,
  distanceUnit: OptionalString,
  volumeUnit: OptionalString,
  countryId: OptionalString,
  countryName: OptionalString,
  regionId: OptionalString,
  regionName: OptionalString,
  cityName: OptionalString,
  photoId: Schema.OptionFromUndefinedOr(ObjectIdStringSchema),

  vehicleParts: Schema.Unknown,
  reminders: Schema.Unknown,
  tripRecords: Schema.Unknown,
}) {}

export const encodeVehicleSync = Schema.encodeSync(Vehicle);

export const UserTypes = Schema.Struct({
  username: Username,
  eventSubtypes: Schema.Record({ key: EventSubtypeId, value: EventSubtype }),
  fuelTypes: Schema.Record({ key: FuelTypeId, value: FuelType }),
  tripTypes: Schema.Record({ key: TripTypeId, value: TripType }),
});
export type UserTypes = typeof UserTypes.Type;

export const UserVehicles = Schema.Struct({
  username: Username,
  vehicles: Schema.Record({ key: VehicleId, value: Vehicle }),
});
export type UserVehicles = typeof UserVehicles.Type;

export const VehicleFillupRecord = Schema.Struct({
  username: Username,
  vehicleId: VehicleId,
  fillups: Schema.Record({ key: FillupRecordId, value: FillupRecord }),
});
export type VehicleFillupRecord = typeof VehicleFillupRecord.Type;

export const VehicleEventRecord = Schema.Struct({
  ...Struct.omit(VehicleFillupRecord.fields, "fillups"),
  events: Schema.Record({ key: EventRecordId, value: EventRecord }),
});
export type VehicleEventRecord = typeof VehicleEventRecord.Type;
