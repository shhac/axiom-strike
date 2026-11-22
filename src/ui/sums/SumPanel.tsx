import type { ComponentChildren } from "preact";
import { boardTotal, pickOp, placeTile, undoLast, type Board, type Refusal } from "../../engine/board";
import type { Level } from "../../engine/levels";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { Num } from "../common";
import { EquationBox, OpRow, TileRow } from "./SumBoard";

export const REFUSALS: Record<Refusal, string> = {
  needOperator: "Pick a sign first",
  badStep: "That can't go below zero or split unevenly",
};

type SumPanelProps = {
  board: Board;
  /** Supplies the signs on offer and whether numbers come in halves or quarters. */
  level: Level;
  target: number | null;
  change: (next: Board) => void;
  refuse: (why: string) => void;
  /** What sits in the top-left and bottom-left corners, where a battle has Impossible and Hint. */
  corner: ComponentChildren;
  below?: ComponentChildren;
  cast: { label: string; icon: string; go: () => void };
};

/**
 * The battle's control panel without the battle: a sum to build, the tiles and signs to build it
 * from, and one big button to try it. The mini games share it so they feel like the fights.
 */
export const SumPanel = ({ board, level, target, change, refuse, corner, below, cast }: SumPanelProps) => {
  const apply = (next: Board | Refusal | null, sound: "tile_tap" | "tile_undo" = "tile_tap") => {
    if (next === null) return;
    if (typeof next === "string") {
      playSfx("error", 0.7);
      return refuse(REFUSALS[next]);
    }
    playSfx(sound);
    change(next);
  };
  const total = boardTotal(board, level.grain);
  const ready = board.equation.tiles.length >= 2;
  return (
    <div class="panel">
      <div class="panel-rows">
        <div class="row row-equation">
          {corner}
          <EquationBox board={board} total={total} target={target} />
          <button class="btn btn-icon" aria-label="Undo" onClick={() => apply(undoLast(board), "tile_undo")}>
            <img src={icon("undo")} alt="" />
          </button>
        </div>
        <div class={`row row-hand ${level.ops.length >= 4 ? "is-crowded" : ""}`}>
          {below}
          <TileRow hand={board.hand} onTap={(tileId) => apply(placeTile(board, tileId, level))} />
          <OpRow ops={level.ops} pending={board.equation.pendingOp} onTap={(op) => apply(pickOp(board, op, level))} />
        </div>
      </div>
      <button
        class={`btn btn-cast ${ready ? "" : "is-waiting"} ${ready && total === target ? "is-exact" : ""}`}
        data-action="cast"
        onClick={cast.go}
      >
        <span class="cast-goal">
          <img src={icon(cast.icon)} alt="" />
          <Num class="cast-number" key={target} value={target ?? "?"} />
        </span>
        <span class="cast-label">{cast.label}</span>
      </button>
    </div>
  );
};
