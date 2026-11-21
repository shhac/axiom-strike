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

/** Left to right, no precedence: the total on screen is always "what you have so far". */
export const evaluate = (first: number, steps: readonly Step[]): number | null =>
  steps.reduce<number | null>((total, step) => (total === null ? null : applyStep(total, step)), first);
