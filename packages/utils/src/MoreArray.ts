// ripped this from effect since i need a lazy version

import {
  fromIterable,
  headNonEmpty,
  isNonEmptyReadonlyArray,
  NonEmptyArray,
  NonEmptyReadonlyArray,
  ReadonlyArray,
  tailNonEmpty,
} from "effect/Array";
import { dual } from "effect/Function";

// hrm, i don't see any way to do this in effect?? only mutable arrays?
export const empty = <A>(): readonly A[] => [];

export const intersperse: {
  <B>(
    middle: (i: number) => B,
  ): <S extends Iterable<any>>(
    self: S,
  ) => ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>;
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    middle: (i: number) => B,
  ): NonEmptyArray<A | B>;
  <A, B>(self: Iterable<A>, middle: (i: number) => B): Array<A | B>;
} = dual(
  2,
  <A, B>(self: Iterable<A>, middle: (i: number) => B): Array<A | B> => {
    const input = fromIterable(self);
    if (isNonEmptyReadonlyArray(input)) {
      const out: NonEmptyArray<A | B> = [headNonEmpty(input)];
      const tail = tailNonEmpty(input);
      for (let i = 0; i < tail.length; i++) {
        if (i < tail.length) {
          out.push(middle(i));
        }
        out.push(tail[i]);
      }
      return out;
    }
    return [];
  },
);
