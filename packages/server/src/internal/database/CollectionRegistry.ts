import {
  UserTypesWithId,
  UserVehicles,
  VehicleEventRecords,
  VehicleFillupRecords,
} from "@guzzler/domain/Autos";
import { SecureUserPreferences } from "@guzzler/domain/SecureUserPreferences";
import { Session } from "@guzzler/domain/Session";
import { User } from "@guzzler/domain/User";
import { MongoCollectionLayer } from "@guzzler/mongodb/MongoCollection";
import { Context, Effect, Layer, pipe } from "effect";

const collections = pipe(
  MongoCollectionLayer,
  Effect.andThen(mcl =>
    mcl.createCollectionRegistry(c => ({
      sessions: c.collection("sessions", Session, {
        encrypted: { plainTextFields: ["_id"] },
      }),
      users: c.collection("users", User),
      userTypes: c.collection("userTypes", UserTypesWithId),
      vehicles: c.collection("vehicles", UserVehicles),
      fillupRecords: c.collection("fillupRecords", VehicleFillupRecords),
      eventRecords: c.collection("eventRecords", VehicleEventRecords),
      secureUserPrefs: c.collection("secureUserPrefs", SecureUserPreferences, {
        encrypted: { plainTextFields: ["_id"] },
      }),
    })),
  ),
);

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  Effect.Effect.Success<typeof collections>
>() {}

export const CollectionRegistryLive = Layer.effect(
  CollectionRegistry,
  collections,
);
