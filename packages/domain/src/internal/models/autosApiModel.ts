import { Chunk, Match, Option, pipe } from "effect";
import { VehicleId } from "../../models/Autos.js";
import {
  ChangeEvent,
  FrontendChangeEvent,
  FrontendUserChange,
  FrontendUserVehicleChange,
  isUserChange,
  UserVehicleChange,
} from "../../models/AutosApiModel.js";

export const changeEventsToFrontend = (
  ce: Chunk.Chunk<ChangeEvent>,
): readonly FrontendChangeEvent[] => {
  const appendVehicleId = (
    fuvcOpt: Option.Option<FrontendUserVehicleChange>,
    from: UserVehicleChange,
  ) =>
    pipe(
      fuvcOpt,
      Option.map(c => c.vehicleIds),
      Option.getOrElse(() => [] as readonly VehicleId[]),
      vehicles =>
        FrontendUserVehicleChange.make({
          type: from.collectionName,
          vehicleIds: [...vehicles, from._id.vehicleId],
        }),
      Option.some,
    );

  const { eventRecords, fillupRecords, userChanges } = Chunk.reduce(
    ce,
    {
      eventRecords: Option.none<FrontendUserVehicleChange>(),
      fillupRecords: Option.none<FrontendUserVehicleChange>(),
      userChanges: Chunk.empty<FrontendUserChange>(),
    },
    (acc, evt) =>
      isUserChange(evt)
        ? {
            ...acc,
            userChanges: Chunk.append(
              acc.userChanges,
              FrontendUserChange.make({ type: evt.collectionName }),
            ),
          }
        : Match.value(evt).pipe(
            Match.discriminatorsExhaustive("collectionName")({
              eventRecords: e => ({
                ...acc,
                eventRecords: appendVehicleId(acc.eventRecords, e),
              }),
              fillupRecords: e => ({
                ...acc,
                fillupRecords: appendVehicleId(acc.fillupRecords, e),
              }),
            }),
          ),
  );

  return Chunk.toReadonlyArray<Chunk.Chunk<FrontendChangeEvent>>(userChanges)
    .concat(Option.toArray(eventRecords))
    .concat(Option.toArray(fillupRecords));
};
