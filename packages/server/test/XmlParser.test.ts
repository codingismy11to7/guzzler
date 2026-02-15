import { it } from "@effect/vitest";
import { Effect } from "effect";
import { fn } from "effect/Effect";
import { describe, expect } from "vitest";
import { XmlParser } from "../src/internal/xml/XmlParser.js";

describe("XmlParser", () => {
  const parse = (xml: string) =>
    XmlParser.parse(xml).pipe(Effect.provide(XmlParser.Default));

  it.effect(
    "parses simple XML",
    fn(function* () {
      const result = yield* parse(
        "<root><name>hello</name><value>42</value></root>",
      );
      expect(result).toEqual({ root: { name: "hello", value: "42" } });
    }),
  );

  it.effect(
    "converts kebab-case tags to camelCase",
    fn(function* () {
      const result = yield* parse(
        "<my-root><my-field>test</my-field></my-root>",
      );
      expect(result).toEqual({ myRoot: { myField: "test" } });
    }),
  );

  it.effect(
    "preserves attributes without prefix",
    fn(function* () {
      const result = yield* parse(
        '<root><item id="1" type="a">text</item></root>',
      );
      expect(result).toEqual({
        root: { item: { id: "1", type: "a", _text: "text" } },
      });
    }),
  );

  it.effect(
    "converts kebab-case attributes to camelCase",
    fn(function* () {
      const result = yield* parse(
        '<root><item my-attr="val">text</item></root>',
      );
      expect(result).toEqual({
        root: { item: { myAttr: "val", _text: "text" } },
      });
    }),
  );

  it.effect(
    "forces arrays for configured tags even with single element",
    fn(function* () {
      const result = yield* parse(
        '<event-subtypes><event-subtype id="1"><name>Oil Change</name></event-subtype></event-subtypes>',
      );
      const root = result;
      const subtypes = root.eventSubtypes as Record<string, unknown>;
      expect(Array.isArray(subtypes.eventSubtype)).toBe(true);
      expect(subtypes.eventSubtype).toHaveLength(1);
    }),
  );

  it.effect(
    "handles multiple children as arrays",
    fn(function* () {
      const result = yield* parse(
        `<fuel-types>
           <fuel-type id="1"><name>Regular</name></fuel-type>
           <fuel-type id="2"><name>Premium</name></fuel-type>
         </fuel-types>`,
      );
      const root = result;
      const fuelTypes = root.fuelTypes as Record<string, unknown>;
      expect(Array.isArray(fuelTypes.fuelType)).toBe(true);
      expect(fuelTypes.fuelType).toHaveLength(2);
    }),
  );

  it.effect(
    "handles nested structures (vehicle with fillups)",
    fn(function* () {
      const result = yield* parse(
        `<vehicles>
          <vehicle id="v1">
            <name>My Car</name>
            <fillup-records>
              <fillup-record id="fr1">
                <date>01/15/2024 - 10:30</date>
                <volume>10.5</volume>
              </fillup-record>
            </fillup-records>
            <event-records/>
            <vehicle-parts/>
            <reminders/>
            <trip-records/>
          </vehicle>
        </vehicles>`,
      );
      const root = result;
      const vehiclesRoot = root.vehicles as Record<string, unknown>;
      const vehicles = vehiclesRoot.vehicle as Array<Record<string, unknown>>;
      expect(vehicles).toHaveLength(1);
      const vehicle = vehicles[0];
      expect(vehicle.name).toBe("My Car");
      expect(vehicle.id).toBe("v1");
      const fillupRecords = vehicle.fillupRecords as Record<string, unknown>;
      const fillups = fillupRecords.fillupRecord as Array<
        Record<string, unknown>
      >;
      expect(fillups).toHaveLength(1);
      expect(fillups[0].id).toBe("fr1");
      expect(fillups[0].volume).toBe("10.5");
    }),
  );

  it.effect(
    "handles multiple vehicles",
    fn(function* () {
      const result = yield* parse(
        `<vehicles>
          <vehicle id="v1"><name>Car 1</name></vehicle>
          <vehicle id="v2"><name>Car 2</name></vehicle>
        </vehicles>`,
      );
      const root = result;
      const vehiclesRoot = root.vehicles as Record<string, unknown>;
      const vehicles = vehiclesRoot.vehicle as Array<Record<string, unknown>>;
      expect(vehicles).toHaveLength(2);
      expect(vehicles[0].name).toBe("Car 1");
      expect(vehicles[1].name).toBe("Car 2");
    }),
  );
});
