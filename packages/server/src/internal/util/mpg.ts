import { FillupRecord } from "@guzzlerapp/domain/src/models/Autos.js";
import { Array, BigDecimal, Chunk, Option, Order } from "effect";
import { divide, subtract, sum, unsafeToNumber } from "effect/BigDecimal";
import {
  append,
  appendAll,
  empty,
  headNonEmpty,
  isNonEmpty,
  tailNonEmpty,
} from "effect/Chunk";
import { isNone, none, some } from "effect/Option";

export type CalcOutput = Readonly<{
  fuelEfficiency: number;
  odometerReading: number;
  partial: boolean;
  previousMissedFillups: boolean;
  volume: number;
}>;

export type CalcInput = Omit<CalcOutput, "fuelEfficiency">;

const zero = BigDecimal.unsafeFromNumber(0);

export const calculateMpg = (
  unsortedRecords: readonly FillupRecord[],
): readonly FillupRecord[] => {
  const recurse = (
    remaining: Chunk.Chunk<FillupRecord>,
    lastFullOdometer = none<BigDecimal.BigDecimal>(),
    currentPartials = empty<FillupRecord>(),
    acc = empty<FillupRecord>(),
  ): Chunk.Chunk<FillupRecord> => {
    if (!isNonEmpty(remaining)) return appendAll(acc, currentPartials);

    const curr = headNonEmpty(remaining);
    const rest = tailNonEmpty(remaining);

    if (curr.previousMissedFillups) {
      return recurse(
        rest,
        curr.partial ? none() : some(curr.odometerReading),
        empty(),
        acc.pipe(
          appendAll(currentPartials),
          append(curr.withEfficiency(none())),
        ),
      );
    } else if (curr.partial) {
      return recurse(
        rest,
        lastFullOdometer,
        append(currentPartials, curr.withEfficiency(none())),
        acc,
      );
    } else {
      const nextLastFullOdometer = some(curr.odometerReading);

      if (isNone(lastFullOdometer))
        return recurse(
          rest,
          nextLastFullOdometer,
          empty(),
          acc.pipe(
            appendAll(currentPartials),
            append(curr.withEfficiency(none())),
          ),
        );

      const distance = curr.odometerReading.pipe(
        subtract(lastFullOdometer.value),
      );
      const totalVolume = currentPartials.pipe(
        Chunk.map(fr => fr.volume),
        Chunk.reduce(zero, sum),
        sum(curr.volume),
      );

      const fuelEfficiency = distance.pipe(
        divide(totalVolume),
        Option.map(unsafeToNumber),
      );

      return recurse(
        rest,
        nextLastFullOdometer,
        empty(),
        acc.pipe(
          appendAll(
            currentPartials.pipe(
              Chunk.map(fr => fr.withEfficiency(fuelEfficiency)),
            ),
          ),
          append(curr.withEfficiency(fuelEfficiency)),
        ),
      );
    }
  };

  const records = Array.sort(
    unsortedRecords,
    Order.mapInput(BigDecimal.Order, (fr: FillupRecord) => fr.odometerReading),
  );

  return recurse(Chunk.fromIterable(records)).pipe(Chunk.toReadonlyArray);
};
