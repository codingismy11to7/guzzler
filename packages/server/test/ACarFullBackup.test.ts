import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { it } from "@effect/vitest";
import {
  EventRecord,
  FillupRecord,
  UserTypesWithId,
  Vehicle,
} from "@guzzlerapp/domain/models/Autos";
import { Username } from "@guzzlerapp/domain/User";
import { MongoTransactions } from "@guzzlerapp/mongodb/MongoTransactions";
import { RandomId } from "@guzzlerapp/utils/RandomId";
import archiver from "archiver";
import { Effect, Layer, Ref } from "effect";
import { fn, promise, provide } from "effect/Effect";
import * as fs from "fs";
import * as path from "path";
import { describe, expect } from "vitest";
import { AutosStorage } from "../src/AutosStorage.js";
import { ACarFullBackup } from "../src/importers/ACarFullBackup.js";
import { XmlParser } from "../src/internal/xml/XmlParser.js";
import { Zip } from "../src/Zip.js";

// -- test XML data --

const eventSubtypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<event-subtypes>
  <event-subtype id="es1" type="maintenance">
    <name>Oil Change</name>
    <notes>Regular maintenance</notes>
  </event-subtype>
  <event-subtype id="es2" type="repair">
    <name>Tire Rotation</name>
  </event-subtype>
</event-subtypes>`;

const fuelTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<fuel-types>
  <fuel-type id="ft1">
    <category>gasoline</category>
    <name>Regular 87</name>
    <rating-type>octane_aki</rating-type>
    <rating>87</rating>
  </fuel-type>
  <fuel-type id="ft2">
    <category>diesel</category>
    <name>Diesel</name>
  </fuel-type>
</fuel-types>`;

const tripTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<trip-types>
  <trip-type id="tt1">
    <name>Commute</name>
    <notes>Daily commute</notes>
  </trip-type>
</trip-types>`;

const vehiclesXml = `<?xml version="1.0" encoding="UTF-8"?>
<vehicles>
  <vehicle id="v1">
    <name>Test Car</name>
    <type>car</type>
    <year>2020</year>
    <make>Toyota</make>
    <model>Camry</model>
    <active>true</active>
    <distance-unit>mi</distance-unit>
    <volume-unit>gal</volume-unit>
    <vehicle-parts>
      <vehicle-part>Tires</vehicle-part>
    </vehicle-parts>
    <reminders>
      <reminder>Oil change at 5000mi</reminder>
    </reminders>
    <fillup-records>
      <fillup-record id="fr1">
        <date>01/15/2024 - 10:30</date>
        <fuel-type-id>ft1</fuel-type-id>
        <odometer-reading>50000</odometer-reading>
        <volume>12.5</volume>
        <total-cost>45.00</total-cost>
        <price-per-volume-unit>3.60</price-per-volume-unit>
        <partial>false</partial>
        <previous-missed-fillups>false</previous-missed-fillups>
        <has-fuel-additive>false</has-fuel-additive>
        <city-driving-percentage>50</city-driving-percentage>
        <highway-driving-percentage>50</highway-driving-percentage>
        <place-name>Shell Station</place-name>
        <place-latitude>37.7749</place-latitude>
        <place-longitude>-122.4194</place-longitude>
      </fillup-record>
    </fillup-records>
    <event-records>
      <event-record id="er1">
        <type>maintenance</type>
        <date>02/01/2024 - 09:00</date>
        <notes>Regular oil change</notes>
        <odometer-reading>51000</odometer-reading>
        <total-cost>75.00</total-cost>
        <subtypes/>
      </event-record>
    </event-records>
    <trip-records/>
  </vehicle>
</vehicles>`;

// -- helpers --

const createAbpFile = (
  zipPath: string,
  files: Record<string, string>,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const [name, content] of Object.entries(files)) {
      archive.append(content, { name });
    }
    void archive.finalize();
  });

// -- mock layers --

type Captured = Readonly<{
  userTypes: UserTypesWithId | undefined;
  vehicles: readonly Vehicle[];
  fillups: ReadonlyArray<
    Readonly<{
      vehicleId: string;
      records: readonly FillupRecord[];
    }>
  >;
  events: ReadonlyArray<
    Readonly<{ vehicleId: string; records: readonly EventRecord[] }>
  >;
  deletedAllData: boolean;
}>;

const makeTestLayers = () => {
  const captured = Ref.unsafeMake<Captured>({
    userTypes: undefined,
    vehicles: [],
    fillups: [],
    events: [],
    deletedAllData: false,
  });

  const update = <A>(f: (c: Captured) => Captured) =>
    Ref.update(captured, f) as Effect.Effect<void, A>;

  const AutosStorageMock = Layer.succeed(AutosStorage, {
    replaceAllUserTypes: (types: UserTypesWithId) =>
      update<never>(c => ({ ...c, userTypes: types })),
    deleteAllUserData: () =>
      update<never>(c => ({ ...c, deletedAllData: true })),
    insertUserVehicle: (_username: unknown, vehicle: Vehicle) =>
      update<never>(c => ({ ...c, vehicles: [...c.vehicles, vehicle] })),
    addPhotoToVehicle: () => Effect.void,
    replaceFillupRecords: (
      { vehicleId }: { vehicleId: string },
      records: readonly FillupRecord[],
    ) =>
      update<never>(c => ({
        ...c,
        fillups: [...c.fillups, { vehicleId, records }],
      })),
    replaceEventRecords: (
      { vehicleId }: { vehicleId: string },
      records: readonly EventRecord[],
    ) =>
      update<never>(c => ({
        ...c,
        events: [...c.events, { vehicleId, records }],
      })),
  } as unknown as AutosStorage);

  const MongoTransactionsMock = Layer.succeed(MongoTransactions, {
    inTransactionRaw: () => (e: Effect.Effect<unknown>) => e,
    inTransaction: () => (e: Effect.Effect<unknown>) => e,
  } as unknown as MongoTransactions);

  const testLayer = ACarFullBackup.DefaultWithoutDependencies.pipe(
    Layer.provide(AutosStorageMock),
    Layer.provide(MongoTransactionsMock),
    Layer.provide(XmlParser.Default),
    Layer.provide(RandomId.Default),
    Layer.provide(Zip.Default),
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  );

  return { captured, testLayer };
};

// -- tests --

const testUser = Username.make("testuser");
const testTz = "America/New_York" as const;

const defaultXmlFiles = {
  "event-subtypes.xml": eventSubtypesXml,
  "fuel-types.xml": fuelTypesXml,
  "trip-types.xml": tripTypesXml,
  "vehicles.xml": vehiclesXml,
};

const runImport = (
  xmlFiles: Record<string, string>,
  testLayer: Layer.Layer<ACarFullBackup>,
) =>
  fn(function* () {
    const tmpDir = yield* promise(() =>
      fs.promises.mkdtemp(path.join("/tmp", "abp-test-")),
    );
    const zipPath = path.join(tmpDir, "test.abp");
    yield* promise(() => createAbpFile(zipPath, xmlFiles));

    return yield* ACarFullBackup.import(testUser, testTz, zipPath).pipe(
      provide(testLayer),
    );
  })();

describe("ACarFullBackup", () => {
  it.effect(
    "imports a valid .abp file",
    fn(function* () {
      const { testLayer, captured } = makeTestLayers();

      const importResult = yield* runImport(defaultXmlFiles, testLayer);

      const result = yield* Ref.get(captured);

      // settings
      expect(result.deletedAllData).toBe(true);
      expect(result.userTypes).toBeDefined();
      const types = result.userTypes!;
      const es = types.eventSubtypes as Record<string, { name: string }>;
      expect(Object.keys(es)).toHaveLength(2);
      expect(es.es1.name).toBe("Oil Change");
      expect(es.es2.name).toBe("Tire Rotation");
      const ft = types.fuelTypes as Record<string, { name: string }>;
      expect(Object.keys(ft)).toHaveLength(2);
      expect(ft.ft1.name).toBe("Regular 87");
      const tt = types.tripTypes as Record<string, { name: string }>;
      expect(Object.keys(tt)).toHaveLength(1);
      expect(tt.tt1.name).toBe("Commute");

      // vehicle
      expect(result.vehicles).toHaveLength(1);
      expect(result.vehicles[0].name).toBe("Test Car");

      // fillups
      expect(result.fillups).toHaveLength(1);
      expect(result.fillups[0].records).toHaveLength(1);
      const fillup = result.fillups[0].records[0];
      expect(fillup.fuelTypeId).toBe("ft1");

      // events
      expect(result.events).toHaveLength(1);
      expect(result.events[0].records).toHaveLength(1);
      const event = result.events[0].records[0];
      expect(event.type).toBe("maintenance");

      // import result counts
      expect(importResult).toEqual({
        vehicles: 1,
        fillups: 1,
        events: 1,
      });
    }),
  );

  it.effect(
    "returns correct counts with multiple vehicles",
    fn(function* () {
      const { testLayer } = makeTestLayers();

      const multiVehiclesXml = `<?xml version="1.0" encoding="UTF-8"?>
<vehicles>
  <vehicle id="v1">
    <name>Car 1</name>
    <active>true</active>
    <vehicle-parts/>
    <reminders/>
    <fillup-records>
      <fillup-record id="fr1">
        <date>01/15/2024 - 10:30</date>
        <fuel-type-id>ft1</fuel-type-id>
        <odometer-reading>50000</odometer-reading>
        <volume>12.5</volume>
        <total-cost>45.00</total-cost>
        <price-per-volume-unit>3.60</price-per-volume-unit>
        <partial>false</partial>
        <previous-missed-fillups>false</previous-missed-fillups>
        <has-fuel-additive>false</has-fuel-additive>
        <city-driving-percentage>50</city-driving-percentage>
        <highway-driving-percentage>50</highway-driving-percentage>
      </fillup-record>
      <fillup-record id="fr2">
        <date>02/15/2024 - 10:30</date>
        <fuel-type-id>ft1</fuel-type-id>
        <odometer-reading>50300</odometer-reading>
        <volume>11.0</volume>
        <total-cost>40.00</total-cost>
        <price-per-volume-unit>3.64</price-per-volume-unit>
        <partial>false</partial>
        <previous-missed-fillups>false</previous-missed-fillups>
        <has-fuel-additive>false</has-fuel-additive>
        <city-driving-percentage>60</city-driving-percentage>
        <highway-driving-percentage>40</highway-driving-percentage>
      </fillup-record>
    </fillup-records>
    <event-records>
      <event-record id="er1">
        <type>maintenance</type>
        <date>02/01/2024 - 09:00</date>
        <subtypes/>
      </event-record>
    </event-records>
    <trip-records/>
  </vehicle>
  <vehicle id="v2">
    <name>Car 2</name>
    <active>true</active>
    <vehicle-parts/>
    <reminders/>
    <fillup-records>
      <fillup-record id="fr3">
        <date>03/15/2024 - 10:30</date>
        <fuel-type-id>ft2</fuel-type-id>
        <odometer-reading>20000</odometer-reading>
        <volume>15.0</volume>
        <total-cost>60.00</total-cost>
        <price-per-volume-unit>4.00</price-per-volume-unit>
        <partial>false</partial>
        <previous-missed-fillups>false</previous-missed-fillups>
        <has-fuel-additive>false</has-fuel-additive>
        <city-driving-percentage>40</city-driving-percentage>
        <highway-driving-percentage>60</highway-driving-percentage>
      </fillup-record>
    </fillup-records>
    <event-records>
      <event-record id="er2">
        <type>repair</type>
        <date>03/01/2024 - 14:00</date>
        <subtypes/>
      </event-record>
      <event-record id="er3">
        <type>maintenance</type>
        <date>04/01/2024 - 09:00</date>
        <subtypes/>
      </event-record>
    </event-records>
    <trip-records/>
  </vehicle>
</vehicles>`;

      const importResult = yield* runImport(
        { ...defaultXmlFiles, "vehicles.xml": multiVehiclesXml },
        testLayer,
      );

      expect(importResult).toEqual({
        vehicles: 2,
        fillups: 3,
        events: 3,
      });
    }),
  );

  it.effect(
    "fails with AbpWrongFormatError on wrong root tag",
    fn(function* () {
      const { testLayer } = makeTestLayers();

      const result = yield* runImport(
        { ...defaultXmlFiles, "event-subtypes.xml": "<wrong-root/>" },
        testLayer,
      ).pipe(Effect.flip);

      expect(result._tag).toBe("AbpWrongFormatError");
    }),
  );

  it.effect(
    "fails with AbpWrongFormatError on missing backup file",
    fn(function* () {
      const { testLayer } = makeTestLayers();

      const { "vehicles.xml": _, ...missingVehicles } = defaultXmlFiles;

      const result = yield* runImport(missingVehicles, testLayer).pipe(
        Effect.flip,
      );

      expect(result._tag).toBe("AbpWrongFormatError");
    }),
  );
});
