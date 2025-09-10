import { Chunk, Match, Option, pipe } from "effect";
import {
  ChangeEvent,
  FrontendChangeEvent,
  FrontendUserChange,
  FrontendUserVehicleChange,
  isUserChange,
  UserVehicleChange,
} from "../../models/AutosModel.js";

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
      Option.getOrElse(() => []),
      vehicles =>
        FrontendUserVehicleChange.make({
          type: from.collectionName,
          vehicleIds: [...vehicles, from._id.vehicleId],
        }),
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
