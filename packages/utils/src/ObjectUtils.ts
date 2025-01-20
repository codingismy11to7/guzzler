import { Struct } from "effect";
import { dual, pipe } from "effect/Function";

export const addField: {
  <N extends string, A extends object, V>(
    name: Exclude<N, keyof A>,
    value: V,
  ): (self: A) => { [K in N | keyof A]: K extends keyof A ? A[K] : V };
  <N extends string, A extends object, V>(
    self: A,
    name: Exclude<N, keyof A>,
    value: V,
  ): { [K in N | keyof A]: K extends keyof A ? A[K] : V };
} = dual(3, (self, name, value) => ({ ...self, [name]: value }));

export const removeField = Struct.omit;

export const mapFields = <K extends string | number | symbol, V, B>(
  r: Record<K, V>,
  map: (v: V) => B,
): Record<K, B> =>
  Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, map(v as V)]),
  ) as Record<K, B>;

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

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
}
