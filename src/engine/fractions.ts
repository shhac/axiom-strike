const PARTS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** How a number is written for a child: `2.5` is `2½`. Anything that is not a quarter stays as it is. */
export const showNumber = (value: number): string => {
  const whole = Math.floor(value);
  const part = PARTS[value - whole];
  if (part === undefined) return String(value);
  return whole === 0 ? part : `${whole}${part}`;
};

/** The digits above and below the bar of a fraction sign, for drawing it from the digit glyphs. */
export const FRACTION_DIGITS: Record<string, readonly [string, string]> = {
  "¼": ["1", "4"],
  "½": ["1", "2"],
  "¾": ["3", "4"],
};
