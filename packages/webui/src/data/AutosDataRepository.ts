import { AutosModel } from "@guzzlerapp/domain";
import {
  Effect,
  Match,
  Stream,
  SubscriptionRef,
  SynchronizedRef,
} from "effect";
import { gen, logInfo } from "effect/Effect";
import { AutosClient } from "../apiclients/AutosClient.js";
import * as internal from "../internal/data/autosDataRepository.js";
import { AutosData } from "../models/AutosData.js";

export class AutosDataRepository extends Effect.Service<AutosDataRepository>()(
  "AutosDataRepository",
  {
    accessors: true,
    scoped: gen(function* () {
      yield* logInfo("AutosDataRepository starting up");

      const autos = yield* AutosClient;

      // lots of stuff in here that can surely be done better. at one point
      // i had a Effect caches in there and invalidated them when i got a push;
      // there's the Effect query and resolver stuff and not sure what all that
      // is? anyway, all this copypasta works for now

      const typesFetch = internal.fetchWithRetries(autos.getUserTypes);
      const vehiclesFetch = internal.fetchWithRetries(autos.getVehicles);
      const fillupsFetch = internal.fetchWithRetries(autos.getFillups);
      const eventsFetch = internal.fetchWithRetries(autos.getEvents);

      const fetchAutosData = gen(function* () {
        return AutosData.make({
          types: yield* typesFetch,
          vehicles: yield* vehiclesFetch,
          fillups: yield* fillupsFetch,
          events: yield* eventsFetch,
        });
      });

      const autosData = yield* SubscriptionRef.make(yield* fetchAutosData);
      const connected = yield* SubscriptionRef.make(false);

      const refetchTypes = SynchronizedRef.updateEffect(autosData, old =>
        gen(function* () {
          return { ...old, types: yield* typesFetch };
        }),
      );
      const refetchVehicles = SynchronizedRef.updateEffect(autosData, old =>
        gen(function* () {
          return { ...old, vehicles: yield* vehiclesFetch };
        }),
      );
      const refetchFillups = SynchronizedRef.updateEffect(autosData, old =>
        gen(function* () {
          return { ...old, fillups: yield* fillupsFetch };
        }),
      );
      const refetchEvents = SynchronizedRef.updateEffect(autosData, old =>
        gen(function* () {
          return { ...old, events: yield* eventsFetch };
        }),
      );

      const startListening = () =>
        internal.startListeningToWebsocketInBackground(
          autos,
          connected,
          Match.type<AutosModel.FrontendChangeEvent>().pipe(
            Match.discriminatorsExhaustive("type")({
              eventRecords: () => refetchEvents,
              fillupRecords: () => refetchFillups,
              userTypes: () => refetchTypes,
              vehicles: () => refetchVehicles,
            }),
          ),
        );

      yield* startListening();

      const currentAutosData: Effect.Effect<AutosData> = autosData.get;
      const autosDataStream: Stream.Stream<AutosData> = autosData.changes;

      const currentlyConnected: Effect.Effect<boolean> = connected.get;
      const connectedStream: Stream.Stream<boolean> = connected.changes;

      return {
        currentAutosData,
        autosDataStream,

        currentlyConnected,
        connectedStream,
      };
    }),
  },
) {}
