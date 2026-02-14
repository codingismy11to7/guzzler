import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { fn } from "effect/Effect";
import { Timestamp } from "../src/MiscSchemas.js";

describe("MiscSchemas", () => {
  describe("Timestamp", () => {
    it.effect(
      "should be a string when encoded",
      fn(function* () {
        const ts1 = yield* Schema.decode(Timestamp)(1738479722987);
        const ts2 = yield* Schema.decode(Timestamp)("2025-02-02T07:02:02.987Z");

        expect(ts1).toEqual(ts2);

        const r1 = yield* Schema.encode(Timestamp)(ts1);
        expect(r1).toBe("2025-02-02T07:02:02.987Z");

        const r2 = yield* Schema.encode(Timestamp)(ts2);
        expect(r2).toBe("2025-02-02T07:02:02.987Z");
      }),
    );
  });
});
