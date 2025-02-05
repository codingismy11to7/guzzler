import { VehicleId } from "@guzzler/domain/models/Autos";
import { BigDecimal, Chunk, Option, Order } from "effect";
import { sortWith, unsafeFromArray } from "effect/Chunk";
import { flatMap, fromNullable, getOrUndefined, map } from "effect/Option";
import { useMemo } from "react";
import { useAppState } from "../AppStore.js";

export const useUserData = () => useAppState(state => state.userData);

export const useFillupInformationForVehicle = (
  vehicleIdOpt: VehicleId | undefined,
) => {
  const userData = useUserData();

  return useMemo(() => {
    if (userData.loading) return userData;

    const fillupInfo = Option.gen(function* () {
      const vehicleId = yield* fromNullable(vehicleIdOpt);

      const forVehicle = yield* fromNullable(userData.fillups[vehicleId]);

      const allFillups = unsafeFromArray(Object.values(forVehicle));

      const fillupsByDate = sortWith(allFillups, f => f.date, Order.Date);
      const fillupsByOdometer = sortWith(
        allFillups,
        f => f.odometerReading,
        BigDecimal.Order,
      );

      const lastFillupRecord = fillupsByDate.pipe(Chunk.last);
      const odometerOnLastFillup = lastFillupRecord.pipe(
        map(f => f.odometerReading),
      );
      const highestOdometerRecord = fillupsByOdometer.pipe(Chunk.last);
      const highestOdometer = highestOdometerRecord.pipe(
        map(f => f.odometerReading),
      );

      return {
        fillupsByDate,
        fillupsByOdometer,
        lastFillupRecord,
        odometerOnLastFillup,
        highestOdometer,
        highestOdometerRecord,
      };
    });

    return {
      loading: false as const,
      value: fillupInfo,
      odometerOnLastFillup: fillupInfo.pipe(
        flatMap(i => i.odometerOnLastFillup),
        getOrUndefined,
      ),
      highestOdometer: fillupInfo.pipe(
        flatMap(i => i.highestOdometer),
        map(BigDecimal.scale(1)),
        map(BigDecimal.format),
        getOrUndefined,
      ),
    };
  }, [userData, vehicleIdOpt]);
};
