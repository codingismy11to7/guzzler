import { Schema, Struct } from "effect";
import { propertySignature } from "effect/Schema";
import {
  IntFromSelfOrString,
  NumberFromSelfOrString,
  ObjectIdStringSchema,
  OptionalBigDecimal,
  OptionalNumber,
  OptionalString,
  Timestamp,
} from "../MiscSchemas.js";
import { Username } from "../User.js";
import { Location } from "./Location.js";
import { Place } from "./Place.js";

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
  ratingType: Schema.OptionFromUndefinedOr(FuelRatingType),
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

/* fillup record */

export const FillupRecordId = Schema.Trimmed.pipe(
  Schema.brand("FillupRecordId"),
);
export type FillupRecordId = typeof FillupRecordId.Type;

export class FillupRecord extends Schema.Class<FillupRecord>("FillupRecord")({
  id: FillupRecordId,
  date: Timestamp,
  fuelEfficiency: Schema.OptionFromUndefinedOr(NumberFromSelfOrString),
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
  cityDrivingPercentage: NumberFromSelfOrString,
  highwayDrivingPercentage: NumberFromSelfOrString,
  averageSpeed: OptionalBigDecimal,
  deviceLocation: Schema.OptionFromUndefinedOr(Location),
  place: Schema.OptionFromUndefinedOr(Place),
}) {}

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

/* vehicle */

export const PhotoId = ObjectIdStringSchema.pipe(
  Schema.brand("PhotoId"),
  Schema.annotations({
    description: "a string suitable for bson.ObjectId.createFromHexString",
  }),
);
export type PhotoId = typeof PhotoId.Type;

export const VehicleId = Schema.Trimmed.pipe(
  Schema.brand("VehicleId"),
  Schema.annotations({ identifier: "VehicleId" }),
);
export type VehicleId = typeof VehicleId.Type;

export class Vehicle extends Schema.Class<Vehicle>("Vehicle")({
  id: VehicleId,
  name: Schema.Trim,
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
  photoId: Schema.OptionFromUndefinedOr(PhotoId),

  vehicleParts: Schema.Unknown,
  reminders: Schema.Unknown,
  tripRecords: Schema.Unknown,
}) {}

export const encodeVehicleSync = Schema.encodeSync(Vehicle);

export const UserTypes = Schema.Struct({
  eventSubtypes: propertySignature(
    Schema.Record({ key: EventSubtypeId, value: EventSubtype }),
  ).pipe(Schema.withConstructorDefault(() => ({}))),
  fuelTypes: propertySignature(
    Schema.Record({ key: FuelTypeId, value: FuelType }),
  ).pipe(Schema.withConstructorDefault(() => ({}))),
  tripTypes: propertySignature(
    Schema.Record({ key: TripTypeId, value: TripType }),
  ).pipe(Schema.withConstructorDefault(() => ({}))),
}).annotations({ identifier: "UserTypes", title: "UserTypes" });
export type UserTypes = typeof UserTypes.Type;

export const UserTypesWithId = Schema.Struct({
  _id: Username,
  ...UserTypes.fields,
});
export type UserTypesWithId = typeof UserTypesWithId.Type;

export const VehiclesDict = Schema.Record({ key: VehicleId, value: Vehicle });
export type VehiclesDict = typeof VehiclesDict.Type;

export const UserVehicles = Schema.Struct({
  _id: Username,
  vehicles: VehiclesDict,
});
export type UserVehicles = typeof UserVehicles.Type;

export const FillupsDict = Schema.Record({
  key: FillupRecordId,
  value: FillupRecord,
});
export type FillupsDict = typeof FillupsDict.Type;

export const UserVehicleId = Schema.Struct({
  username: Username,
  vehicleId: VehicleId,
});
export type UserVehicleId = typeof UserVehicleId.Type;

export const VehicleFillupRecords = Schema.Struct({
  _id: UserVehicleId,
  fillups: FillupsDict,
});
export type VehicleFillupRecords = typeof VehicleFillupRecords.Type;

export const FillupRecordsByVehicle = Schema.Record({
  key: VehicleId,
  value: FillupsDict,
});
export type FillupRecordsByVehicle = typeof FillupRecordsByVehicle.Type;

export const EventsDict = Schema.Record({
  key: EventRecordId,
  value: EventRecord,
});

export const VehicleEventRecords = Schema.Struct({
  ...Struct.omit(VehicleFillupRecords.fields, "fillups"),
  events: EventsDict,
});
export type VehicleEventRecords = typeof VehicleEventRecords.Type;

export const EventRecordsByVehicle = Schema.Record({
  key: VehicleId,
  value: EventsDict,
});
export type EventRecordsByVehicle = typeof EventRecordsByVehicle.Type;
