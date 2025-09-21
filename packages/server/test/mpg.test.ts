import { it } from "@effect/vitest";
import { FillupRecord } from "@guzzlerapp/domain/src/models/Autos.js";
import { Arbitrary, FastCheck, Schema as S } from "effect";
import { getOrThrow, isNone } from "effect/Option";
import { pick } from "effect/Struct";
import * as fs from "fs";
import * as path from "path";
import { describe, expect } from "vitest";
import { calculateMpg } from "../src/internal/util/mpg.js";

const fillupsDir = path.resolve(
  import.meta.dirname,
  "resources",
  "mpg",
  "fillups",
);

const testDataFields = S.Struct(
  pick(
    FillupRecord.fields,
    "odometerReading",
    "volume",
    "previousMissedFillups",
    "partial",
    "fuelEfficiency",
  ),
);

describe("mpg", () => {
  const parseFile = (name: string) =>
    S.decodeUnknownSync(S.Array(testDataFields))(
      JSON.parse(fs.readFileSync(path.join(fillupsDir, name), "utf-8")),
    );

  const strip = (o: FillupRecord): FillupRecord =>
    S.decodeSync(FillupRecord)({
      ...S.encodeSync(FillupRecord)(o),
      fuelEfficiency: undefined,
    });

  const inputs = () => fs.readdirSync(fillupsDir);

  it.each(inputs())("should correctly calculate mpg (%s)", file => {
    const mpgItems = parseFile(file);

    const arb = Arbitrary.make(FillupRecord);
    const sampleRec = FastCheck.sample(arb, 1)[0];

    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    const expecteds = mpgItems.map(item => ({ ...sampleRec, ...item }));

    const stripped = expecteds.map(strip);

    calculateMpg(stripped).forEach((rec, i) => {
      const expected = expecteds[i];

      if (isNone(rec.fuelEfficiency) || isNone(expected.fuelEfficiency)) {
        expect(isNone(rec.fuelEfficiency)).toBe(true);
        expect(isNone(expected.fuelEfficiency)).toBe(true);
      } else {
        const value = getOrThrow(rec.fuelEfficiency);

        expect(value).toBeCloseTo(getOrThrow(expected.fuelEfficiency));
      }
    });
  });
});
