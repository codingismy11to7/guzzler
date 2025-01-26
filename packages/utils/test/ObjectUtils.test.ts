import { describe, expect, it } from "@effect/vitest";
import { pipe } from "effect/Function";
import { addField, removeField } from "../src/ObjectUtils.js";

describe("ObjectUtils", () => {
  it("should work in data-first mode", () => {
    const a = addField({}, "hello", 42);
    const b = addField(a, "ded", true);
    const c = removeField(b, "hello");
    const d = addField(c, "hello", 41);

    // just testing that the calls to these 2 functions compile
    const y = (_n: number) => {
      expect(true).toBe(true);
    };
    const z = (_r: { ded: boolean }) => {
      expect(true).toBe(true);
    };
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    y(c.hello);
    expect([d.ded, d.hello]).toBeDefined();
    z(c);
    y(b.hello);
  });

  it("should work in data-last mode", () => {
    const a = pipe({}, addField("hello", 42));
    const b = pipe(a, addField("ded", true));
    const c = pipe(b, removeField("hello"));
    const d = pipe(c, addField("hello", 41));

    // just testing that the calls to these 2 functions compile
    const y = (_n: number) => {
      expect(true).toBe(true);
    };
    const z = (_r: { ded: boolean }) => {
      expect(true).toBe(true);
    };
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    y(c.hello);
    expect([d.ded, d.hello]).toBeDefined();
    z(c);
    y(b.hello);
  });
});
