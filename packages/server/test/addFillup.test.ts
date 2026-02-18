import { it } from "@effect/vitest";
import {
  FillupRecord,
  FillupRecordId,
  VehicleFillupRecords,
  VehicleId,
} from "@guzzlerapp/domain/models/Autos";
import { Username } from "@guzzlerapp/domain/User";
import { GridFS } from "@guzzlerapp/mongodb/GridFS";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { BigDecimal, Effect, Layer, Option, Ref, Schema as S } from "effect";
import { fn } from "effect/Effect";
import { isNone, isSome } from "effect/Option";
import { describe, expect } from "vitest";
import { AutosStorage } from "../src/AutosStorage.js";
import { FileFetcher } from "../src/FileFetcher.js";
import { CollectionRegistry } from "../src/internal/database/CollectionRegistry.js";

const testUser = Username.make("testuser");
const testVehicleId = VehicleId.make("vehicle-1");

const makeFillup = (
  overrides: Partial<{
    id: string;
    odometerReading: number;
    volume: number;
    totalCost: number;
    pricePerVolumeUnit: number;
    partial: boolean;
    previousMissedFillups: boolean;
  }> = {},
): FillupRecord =>
  new FillupRecord({
    id: FillupRecordId.make(overrides.id ?? "fillup-1"),
    date: new Date("2024-06-15T10:00:00Z"),
    fuelEfficiency: Option.none(),
    fuelTypeId: "ft1" as never,
    notes: undefined,
    odometerReading: BigDecimal.unsafeFromNumber(
      overrides.odometerReading ?? 50000,
    ),
    paymentType: undefined,
    pricePerVolumeUnit: BigDecimal.unsafeFromNumber(
      overrides.pricePerVolumeUnit ?? 3.5,
    ),
    tags: undefined,
    totalCost: BigDecimal.unsafeFromNumber(overrides.totalCost ?? 42),
    volume: BigDecimal.unsafeFromNumber(overrides.volume ?? 12),
    partial: overrides.partial ?? false,
    previousMissedFillups: overrides.previousMissedFillups ?? false,
    hasFuelAdditive: false,
    fuelAdditiveName: undefined,
    drivingMode: undefined,
    cityDrivingPercentage: 50,
    highwayDrivingPercentage: 50,
    averageSpeed: Option.none(),
    deviceLocation: Option.none(),
    place: Option.none(),
  });

type CapturedOp =
  | Readonly<{ type: "updateOneRaw"; filter: unknown; update: unknown }>
  | Readonly<{ type: "upsert"; filter: unknown; replacement: unknown }>;

const makeTestLayers = (existingFillups: Record<string, FillupRecord> = {}) => {
  const ops = Ref.unsafeMake<CapturedOp[]>([]);

  // The upsert inserts the fillup, then findOne returns it merged with existing
  const storedFillups = Ref.unsafeMake<Record<string, FillupRecord>>({
    ...existingFillups,
  });

  const mockFillupRecords = {
    updateOneRaw: (filter: unknown, update: unknown, _options?: unknown) =>
      Effect.gen(function* () {
        yield* Ref.update(ops, a => [
          ...a,
          { type: "updateOneRaw" as const, filter, update },
        ]);
        // Simulate the upsert by extracting the fillup from the $set
        const setObj = (update as { $set: Record<string, unknown> }).$set;
        for (const [key, value] of Object.entries(setObj)) {
          if (key.startsWith("fillups.")) {
            const decoded = S.decodeUnknownSync(FillupRecord)(value);
            yield* Ref.update(storedFillups, f => ({
              ...f,
              [decoded.id]: decoded,
            }));
          }
        }
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      }),
    findOne: (_filter?: unknown) =>
      Effect.gen(function* () {
        const fillups = yield* Ref.get(storedFillups);
        return {
          _id: { username: testUser, vehicleId: testVehicleId },
          fillups,
        } as unknown as VehicleFillupRecords;
      }),
    upsert: (filter: unknown, replacement: unknown) =>
      Effect.gen(function* () {
        yield* Ref.update(ops, a => [
          ...a,
          { type: "upsert" as const, filter, replacement },
        ]);
        // Update stored fillups from the replacement
        const rep = replacement as VehicleFillupRecords;
        yield* Ref.set(storedFillups, { ...rep.fillups });
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      }),
  };

  const CollectionRegistryMock = Layer.succeed(CollectionRegistry, {
    fillupRecords: mockFillupRecords,
    // Other collections not needed for addFillupAndRecalculate
    userTypes: {},
    vehicles: {},
    eventRecords: {},
  } as unknown as CollectionRegistry["Type"]);

  const MongoTransactionsMock = Layer.succeed(MongoTransactions, {
    inTransactionRaw: () => (e: Effect.Effect<unknown>) => e,
    inTransaction: () => (e: Effect.Effect<unknown>) => e,
  } as unknown as MongoTransactions);

  const GridFSMock = Layer.succeed(GridFS, {} as unknown as GridFS);
  const FileFetcherMock = Layer.succeed(
    FileFetcher,
    {} as unknown as FileFetcher,
  );

  const testLayer = AutosStorage.Default.pipe(
    Layer.provide(CollectionRegistryMock),
    Layer.provide(MongoTransactionsMock),
    Layer.provide(GridFSMock),
    Layer.provide(FileFetcherMock),
  );

  return { ops, storedFillups, testLayer };
};

const addFillup = (
  username: Username,
  vehicleId: VehicleId,
  fillup: FillupRecord,
) =>
  Effect.gen(function* () {
    const autos = yield* AutosStorage;
    yield* autos.addFillupAndRecalculate(username, vehicleId, fillup);
  });

describe("addFillupAndRecalculate", () => {
  it.effect(
    "inserts a fillup with correct dot-notation key",
    fn(function* () {
      const fillup = makeFillup();
      const { ops, testLayer } = makeTestLayers();

      yield* addFillup(testUser, testVehicleId, fillup).pipe(
        Effect.provide(testLayer),
      );

      const captured = yield* Ref.get(ops);
      const updateOp = captured.find(o => o.type === "updateOneRaw");
      expect(updateOp).toBeDefined();

      const update = updateOp!.update as { $set: Record<string, unknown> };
      expect(update.$set).toHaveProperty(`fillups.${fillup.id}`);
    }),
  );

  it.effect(
    "calls replaceFillupRecords after recalculation (upsert op)",
    fn(function* () {
      const fillup = makeFillup();
      const { ops, testLayer } = makeTestLayers();

      yield* addFillup(testUser, testVehicleId, fillup).pipe(
        Effect.provide(testLayer),
      );

      const captured = yield* Ref.get(ops);
      const upsertOp = captured.find(o => o.type === "upsert");
      expect(upsertOp).toBeDefined();
    }),
  );

  it.effect(
    "first fillup has no fuel efficiency",
    fn(function* () {
      const fillup = makeFillup();
      const { storedFillups, testLayer } = makeTestLayers();

      yield* addFillup(testUser, testVehicleId, fillup).pipe(
        Effect.provide(testLayer),
      );

      const stored = yield* Ref.get(storedFillups);
      const savedFillup = stored[fillup.id];
      expect(savedFillup).toBeDefined();
      expect(isNone(savedFillup.fuelEfficiency)).toBe(true);
    }),
  );

  it.effect(
    "recalculates efficiency when adding to existing fillups",
    fn(function* () {
      const existing = makeFillup({
        id: "fillup-0",
        odometerReading: 49700,
        volume: 10,
      });

      const newFillup = makeFillup({
        id: "fillup-1",
        odometerReading: 50000,
        volume: 12,
      });

      const { storedFillups, testLayer } = makeTestLayers({
        [existing.id]: existing,
      });

      yield* addFillup(testUser, testVehicleId, newFillup).pipe(
        Effect.provide(testLayer),
      );

      const stored = yield* Ref.get(storedFillups);

      // First fillup should still have no efficiency
      expect(isNone(stored[existing.id].fuelEfficiency)).toBe(true);

      // Second fillup should have efficiency = 300 / 12 = 25
      const eff = stored[newFillup.id].fuelEfficiency;
      expect(isSome(eff)).toBe(true);
      if (isSome(eff)) {
        expect(eff.value).toBeCloseTo(25);
      }
    }),
  );

  it.effect(
    "partial fillup gets no efficiency",
    fn(function* () {
      const existing = makeFillup({
        id: "fillup-0",
        odometerReading: 49700,
        volume: 10,
      });

      const partialFillup = makeFillup({
        id: "fillup-1",
        odometerReading: 50000,
        volume: 12,
        partial: true,
      });

      const { storedFillups, testLayer } = makeTestLayers({
        [existing.id]: existing,
      });

      yield* addFillup(testUser, testVehicleId, partialFillup).pipe(
        Effect.provide(testLayer),
      );

      const stored = yield* Ref.get(storedFillups);
      expect(isNone(stored[partialFillup.id].fuelEfficiency)).toBe(true);
    }),
  );
});
