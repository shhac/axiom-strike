import { applyStep, type Op } from "./equation";

export type Solution = { tiles: number[]; ops: Op[] };

type Frontier = { total: number; tiles: number[]; ops: Op[] };

type Candidate = { index: number; value: number };

const extend = (node: Frontier, candidates: readonly Candidate[], ops: readonly Op[]): Frontier[] =>
  candidates.flatMap(({ index, value }) =>
    node.tiles.includes(index)
      ? []
      : ops.flatMap((op) => {
          const total = applyStep(node.total, { op, value });
          return total === null ? [] : [{ total, tiles: [...node.tiles, index], ops: [...node.ops, op] }];
        }),
  );

const dedupe = (nodes: Frontier[]): Frontier[] => {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.total}|${[...node.tiles].sort((a, b) => a - b).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Shortest exact way to reach `target` from `values` (tile indices), optionally continuing an
 * equation already started with `prefix`. Breadth-first, so fewer tiles always wins.
 */
export const solve = (
  values: readonly number[],
  ops: readonly Op[],
  target: number,
  options: { minTiles?: number; maxTiles?: number; prefix?: Solution; exclude?: readonly number[] } = {},
): Solution | null => {
  const minTiles = options.minTiles ?? 2;
  const maxTiles = Math.min(options.maxTiles ?? 4, values.length);
  const excluded = new Set(options.exclude ?? []);
  const candidates = values.flatMap((value, index) => (excluded.has(index) ? [] : [{ index, value }]));
  const prefix = options.prefix;

  const start: Frontier[] = prefix?.tiles.length
    ? prefixStart(values, prefix)
    : candidates.map(({ index, value }) => ({ total: value, tiles: [index], ops: [] }));

  const search = (frontier: Frontier[]): Solution | null => {
    if (frontier.length === 0) return null;
    const depth = frontier[0]?.tiles.length ?? 0;
    if (depth >= minTiles) {
      const hit = frontier.find((node) => node.total === target);
      if (hit) return { tiles: hit.tiles, ops: hit.ops };
    }
    if (depth >= maxTiles) return null;
    return search(dedupe(frontier.flatMap((node) => extend(node, candidates, ops))));
  };
  return search(start);
};

/** The single node an equation already on the board starts from, or nothing if it does not add up. */
const prefixStart = (values: readonly number[], prefix: Solution): Frontier[] => {
  const [firstIndex, ...rest] = prefix.tiles;
  const first = firstIndex === undefined ? undefined : values[firstIndex];
  if (first === undefined) return [];
  const total = rest.reduce<number | null>((sum, tileIndex, i) => {
    const value = values[tileIndex];
    const op = prefix.ops[i];
    if (sum === null || value === undefined || op === undefined) return null;
    return applyStep(sum, { op, value });
  }, first);
  return total === null ? [] : [{ total, tiles: [...prefix.tiles], ops: [...prefix.ops] }];
};
