import { Autos } from "@guzzlerapp/domain";
import { Schema } from "effect";

export const AutosData = Schema.Struct({
  types: Autos.UserTypes,
  vehicles: Autos.VehiclesDict,
  fillups: Autos.FillupRecordsByVehicle,
  events: Autos.EventRecordsByVehicle,
});
export type AutosData = typeof AutosData.Type;
