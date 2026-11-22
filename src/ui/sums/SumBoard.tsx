import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { boardValues, type Board, type Tile } from "../../engine/board";
import { bracketEnds, type Op } from "../../engine/equation";
import { showNumber } from "../../engine/fractions";
import { Num } from "../common";

/** Shrinks a long equation to the room it has, so the total beside it is never pushed out of view. */
const useShrinkToFit = (content: string) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const room = node?.parentElement?.clientWidth;
    if (!node || !room) return;
    const scale = Math.min(1, room / node.offsetWidth);
    node.style.transform = scale < 1 ? `scale(${scale})` : "";
  }, [content]);
  return ref;
};

type EquationProps = {
  board: Board;
  total: number | null;
  /** The number being made; the total lights up when it matches. */
  target: number | null;
  children?: ComponentChildren;
};

/** The sum being built, written out with brackets, and its running total. */
export const EquationBox = ({ board, total, target, children }: EquationProps) => {
  const placed = boardValues(board);
  const { ops, pendingOp } = board.equation;
  const exact = total !== null && total === target;
  const closes = bracketEnds(pendingOp ? [...ops, pendingOp] : ops);
  const terms = useShrinkToFit(`${placed.join()} ${ops.join()} ${pendingOp ?? ""}`);
  return (
    <div class="equation" aria-live="polite">
      {placed.length === 0 && (
        <span class="equation-empty">
          {children ?? `Tap numbers to make ${target === null ? "it" : showNumber(target)}`}
        </span>
      )}
      <div class="eq-room">
        <div class="eq-terms" ref={terms}>
          {closes.map((close) => (
            <Num key={`open-${close}`} class="eq-bracket" value="(" />
          ))}
          {placed.map((value, index) => (
            <>
              {index > 0 && <Num class="eq-op" value={ops[index - 1] ?? ""} />}
              <Num class="eq-num" value={value} />
              {closes.includes(index) && <Num class="eq-bracket" value=")" />}
            </>
          ))}
          {pendingOp && <Num class="eq-op is-pending" value={pendingOp} />}
        </div>
      </div>
      {total !== null && (
        <span class={`eq-total ${exact ? "is-exact" : ""}`} data-total={total}>
          <Num value={`=${showNumber(total)}`} />
        </span>
      )}
    </div>
  );
};

type TileRowProps = { hand: readonly Tile[]; hintedId?: number; onTap: (tileId: number) => void };

export const TileRow = ({ hand, hintedId, onTap }: TileRowProps) => (
  <div class="tiles">
    {hand.map((tile, index) => (
      <button
        key={tile.id}
        class={`tile ${tile.used ? "is-used" : ""} ${hintedId === tile.id ? "is-hinted" : ""}`}
        style={{ animationDelay: `${index * 45}ms` }}
        data-tile={tile.id}
        disabled={tile.used}
        aria-label={`Number ${showNumber(tile.value)}`}
        onClick={() => onTap(tile.id)}
      >
        <Num value={tile.value} />
      </button>
    ))}
  </div>
);

type OpRowProps = {
  ops: readonly Op[];
  pending: Op | null;
  hinted?: Op | null;
  /** A sign the monster being struck will not stand for; it is shown crossed out. */
  banned?: Op | null;
  onTap: (op: Op) => void;
};

/** The signs on offer. A land with a single sign applies it by itself, so it shows none. */
export const OpRow = ({ ops, pending, hinted, banned, onTap }: OpRowProps) => {
  if (ops.length <= 1) return null;
  return (
    <div class="ops">
      {ops.map((op) => (
        <button
          class={`op ${pending === op ? "is-picked" : ""} ${hinted === op && !pending ? "is-hinted" : ""} ${banned === op ? "is-banned" : ""}`}
          data-op={op}
          aria-label={`Sign ${op}${banned === op ? ", not allowed on this monster" : ""}`}
          onClick={() => onTap(op)}
        >
          <Num value={op} />
        </button>
      ))}
    </div>
  );
};
