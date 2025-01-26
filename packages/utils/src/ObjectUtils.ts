import { Struct } from "effect";
import { dual } from "effect/Function";

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
