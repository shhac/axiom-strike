import { applyStep, type Op } from "./equation";

export type Tile = {
  id: number;
  value: number;
  used: boolean;
  /** Thrown away on an answer that was not exact. It still counts against an "Impossible!" call. */
  wasted?: boolean;
};

export type Equation = { tiles: number[]; ops: Op[]; pendingOp: Op | null };

/** A hand of number tiles and the sum being built from it: the part every sum game shares. */
export type Board = { hand: Tile[]; equation: Equation };

/** The signs on offer, and what counts as a friendly running total (1 for whole numbers). */
export type BoardRules = { ops: readonly Op[]; grain?: number };

export const EMPTY_EQUATION: Equation = { tiles: [], ops: [], pendingOp: null };

export const freshTiles = (values: readonly number[], firstId: number): Tile[] =>
  values.map((value, index) => ({ id: firstId + index, value, used: false }));

/** The numbers placed in the equation so far, in order. */
export const boardValues = ({ hand, equation }: Board): number[] =>
  equation.tiles.map((id) => hand.find((tile) => tile.id === id)?.value ?? 0);

/** Running totals after each tile of the equation; empty if nothing is placed. */
export const boardTotals = (board: Board, grain = 1): number[] =>
  boardValues(board).reduce<number[]>((totals, value, index) => {
    if (index === 0) return [value];
    const op = board.equation.ops[index - 1];
    const previous = totals[totals.length - 1];
    if (op === undefined || previous === undefined) return totals;
    return [...totals, applyStep(previous, { op, value }, grain) ?? previous];
  }, []);

export const boardTotal = (board: Board, grain = 1): number | null => boardTotals(board, grain).at(-1) ?? null;

const MIN_POWER = 2;

/**
 * How many tiles it really took to reach the final total. `3 + 4 + 5 - 5` is still a two-tile
 * seven, so adding a number and taking it away again earns nothing. It never drops below two:
 * `6 × 1` is padding too, but it is still a right answer and hits like one.
 */
export const sumPower = (totals: readonly number[]): number => {
  const final = totals.at(-1);
  return final === undefined ? 0 : Math.max(MIN_POWER, totals.indexOf(final) + 1);
};

export type Refusal = "needOperator" | "badStep";

/** The board with the tile added to the sum, why it cannot be, or null if the tile is not free. */
export const placeTile = (board: Board, tileId: number, { ops, grain = 1 }: BoardRules): Board | Refusal | null => {
  const tile = board.hand.find((candidate) => candidate.id === tileId);
  if (!tile || tile.used) return null;
  const { equation } = board;
  const take = (next: Equation): Board => ({
    equation: next,
    hand: board.hand.map((t) => (t.id === tileId ? { ...t, used: true } : t)),
  });
  if (equation.tiles.length === 0) return take({ tiles: [tileId], ops: [], pendingOp: null });

  const onlyOp = ops.length === 1 ? ops[0] : undefined;
  const op = equation.pendingOp ?? onlyOp;
  if (!op) return "needOperator";

  const total = boardTotal(board, grain);
  if (total === null || applyStep(total, { op, value: tile.value }, grain) === null) return "badStep";
  return take({ tiles: [...equation.tiles, tileId], ops: [...equation.ops, op], pendingOp: null });
};

export const pickOp = (board: Board, op: Op, { ops }: BoardRules): Board | null =>
  board.equation.tiles.length === 0 || !ops.includes(op)
    ? null
    : { hand: board.hand, equation: { ...board.equation, pendingOp: op } };

const release = (hand: readonly Tile[], tileIds: readonly number[]): Tile[] =>
  hand.map((tile) => (tileIds.includes(tile.id) ? { ...tile, used: false } : tile));

/** Takes back the sign just picked, or else the last tile; null if there is nothing to take back. */
export const undoLast = ({ hand, equation }: Board): Board | null => {
  if (equation.pendingOp) return { hand, equation: { ...equation, pendingOp: null } };
  const last = equation.tiles.at(-1);
  if (last === undefined) return null;
  return {
    hand: release(hand, [last]),
    equation: { tiles: equation.tiles.slice(0, -1), ops: equation.ops.slice(0, -1), pendingOp: null },
  };
};

/** Puts every tile of the sum back in the hand; null if the sum is already empty. */
export const clearBoard = ({ hand, equation }: Board): Board | null =>
  equation.tiles.length === 0 && !equation.pendingOp
    ? null
    : { hand: release(hand, equation.tiles), equation: EMPTY_EQUATION };
