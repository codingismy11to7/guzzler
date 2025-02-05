import { it, describe, expect } from "@effect/vitest";
import { BigDecimal as BD } from "effect";
import { BigDecimal } from "effect/BigDecimal";
import { MoreBigDecimal } from "../src/index.js";

describe("MoreBigDecimal", () => {
  describe("round", () => {
    it("should round down properly", () => {
      const bd = BD.unsafeFromString("1.234");

      const rounded: BigDecimal = MoreBigDecimal.round(bd, 2);

      expect(BD.equals(rounded, BD.unsafeFromString("1.23"))).toBe(true);
    });

    it("should round up properly", () => {
      const bd = BD.unsafeFromString("1.235");

      const rounded: BigDecimal = MoreBigDecimal.round(bd, 2);

      expect(BD.equals(rounded, BD.unsafeFromString("1.24"))).toBe(true);
    });
  });
});
