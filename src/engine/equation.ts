export type Op = "+" | "-" | "×" | "÷";

export type Step = { op: Op; value: number };

const APPLY: Record<Op, (total: number, value: number) => number> = {
  "+": (total, value) => total + value,
  "-": (total, value) => total - value,
  "×": (total, value) => total * value,
  "÷": (total, value) => (value === 0 ? Number.NaN : total / value),
};

/** Kids see a running total, so every intermediate must be a whole number that is not negative. */
const isFriendly = (n: number) => Number.isInteger(n) && n >= 0;

export const applyStep = (total: number, step: Step): number | null => {
  const next = APPLY[step.op](total, step.value);
  return isFriendly(next) ? next : null;
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
export const evaluate = (first: number, steps: readonly Step[]): number | null =>
  steps.reduce<number | null>((total, step) => (total === null ? null : applyStep(total, step)), first);
