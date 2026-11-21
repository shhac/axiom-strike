import { applyStep, type Op } from "./equation";

export type Solution = { tiles: number[]; ops: Op[] };

type Frontier = { total: number; tiles: number[]; ops: Op[] };

const extend = (node: Frontier, values: readonly number[], ops: readonly Op[]): Frontier[] =>
  values.flatMap((value, index) =>
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
  const usable = (index: number) => !excluded.has(index);
  const prefix = options.prefix;

  const start: Frontier[] = prefix?.tiles.length
    ? [prefixFrontier(values, prefix)].filter((node): node is Frontier => node !== null)
    : values.flatMap((value, index) => (usable(index) ? [{ total: value, tiles: [index], ops: [] }] : []));

  const search = (frontier: Frontier[]): Solution | null => {
    if (frontier.length === 0) return null;
    const depth = frontier[0]?.tiles.length ?? 0;
    if (depth >= minTiles) {
      const hit = frontier.find((node) => node.total === target);
      if (hit) return { tiles: hit.tiles, ops: hit.ops };
    }
    if (depth >= maxTiles) return null;
    const allowed = values.map((value, index) => (usable(index) ? value : Number.NaN));
    return search(dedupe(frontier.flatMap((node) => extend(node, allowed, ops))));
  };
  return search(start);
};

const prefixFrontier = (values: readonly number[], prefix: Solution): Frontier | null => {
  const [firstIndex, ...rest] = prefix.tiles;
  const first = firstIndex === undefined ? undefined : values[firstIndex];
  if (first === undefined) return null;
  const total = rest.reduce<number | null>((sum, tileIndex, i) => {
    const value = values[tileIndex];
    const op = prefix.ops[i];
    if (sum === null || value === undefined || op === undefined) return null;
    return applyStep(sum, { op, value });
  }, first);
  return total === null ? null : { total, tiles: [...prefix.tiles], ops: [...prefix.ops] };
};
