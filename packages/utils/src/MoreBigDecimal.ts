import { BigDecimal as BD } from "effect";
import { BigDecimal } from "effect/BigDecimal";
import { dual } from "effect/Function";

const oneHalf = BD.unsafeFromNumber(0.5);
const one = BD.unsafeFromNumber(1);

export const round: {
  (precision: number): (self: BigDecimal) => BigDecimal;
  (self: BigDecimal, precision: number): BigDecimal;
} = dual(2, (self: BigDecimal, precision: number): BigDecimal => {
  // don't judge me, my brain is barely working

  const factor = BD.unsafeFromNumber(Math.pow(10, precision));

  const multiplied = self.pipe(BD.multiply(factor));

  const wholePart = multiplied.pipe(BD.scale(0));
  const rem = multiplied.pipe(BD.subtract(wholePart));

  const added = BD.lessThan(rem, oneHalf)
    ? wholePart
    : wholePart.pipe(BD.sum(one));

  return BD.unsafeDivide(added, factor);
});
