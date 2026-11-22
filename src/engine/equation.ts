import { showNumber } from "./fractions";
export type Op = "+" | "-" | "×" | "÷";

export type Step = { op: Op; value: number };

const APPLY: Record<Op, (total: number, value: number) => number> = {
  "+": (total, value) => total + value,
  "-": (total, value) => total - value,
  "×": (total, value) => total * value,
  "÷": (total, value) => (value === 0 ? Number.NaN : total / value),
};

/** Kids see a running total, so every intermediate must be a whole number that is not negative. */
const isFriendly = (n: number, grain: number) => Number.isInteger(n / grain) && n >= 0;

/**
 * `grain` is the smallest step a running total may land on: 1 for whole numbers, 0.5 or 0.25
 * where the tiles are halves or quarters (both exact in floating point).
 */
export const applyStep = (total: number, step: Step, grain = 1): number | null => {
  const next = APPLY[step.op](total, step.value);
  return isFriendly(next, grain) ? next : null;
};

const isLoose = (op: Op) => op === "+" || op === "-";

/**
 * Where brackets close when the equation is written down, as positions in the list of numbers.
 * The total builds up one step at a time, so times or divide after a plus or minus applies to
 * everything so far. Written without brackets that would break the order of operations, so the
 * part so far is wrapped: `1 + 1` then `× 2` reads `(1 + 1) × 2`. Each close has an opening
 * bracket at the very start.
 */
export const bracketEnds = (ops: readonly Op[]): number[] =>
  ops.flatMap((op, index) => {
    const before = ops[index - 1];
    return before !== undefined && isLoose(before) && !isLoose(op) ? [index] : [];
  });

/** One step at a time on the total so far, which `bracketEnds` makes true on screen. */
export const evaluate = (first: number, steps: readonly Step[], grain = 1): number | null =>
  steps.reduce<number | null>((total, step) => (total === null ? null : applyStep(total, step, grain)), first);

/** A finished sum written out as text, with the brackets it needs: `(2+3)×4`. */
export const writeSum = (values: readonly number[], ops: readonly Op[]): string => {
  const closes = bracketEnds(ops);
  const terms = values.map((value, index) => {
    const sign = index === 0 ? "" : (ops[index - 1] ?? "");
    return `${sign}${showNumber(value)}${closes.includes(index) ? ")" : ""}`;
  });
  return `${"(".repeat(closes.length)}${terms.join("")}`;
};
