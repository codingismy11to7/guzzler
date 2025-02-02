import {
  UserTypesWithId,
  UserVehicles,
  VehicleEventRecords,
  VehicleFillupRecords,
} from "@guzzlerapp/domain/models/Autos";
import { SecureUserPreferences } from "@guzzlerapp/domain/SecureUserPreferences";
import { Session } from "@guzzlerapp/domain/Session";
import { User } from "@guzzlerapp/domain/User";
import { MongoCollectionLayer } from "@guzzlerapp/mongodb/MongoCollection";
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

export type AppCollections = Effect.Effect.Success<typeof collections>;

export class CollectionRegistry extends Context.Tag("CollectionRegistry")<
  CollectionRegistry,
  AppCollections
>() {}

export const CollectionRegistryLive = Layer.effect(
  CollectionRegistry,
  collections,
);
