import { useRef } from "preact/hooks";
import { aimTarget, bannedNow, equationTotal, hintNext, type BattleState } from "../../engine/battle";
import { showNumber } from "../../engine/fractions";
import { icon } from "../assets";
import { Num } from "../common";
import { dispatch } from "../store";
import { EquationBox, OpRow, TileRow } from "../sums/SumBoard";
import { act } from "./act";

const EquationRow = ({ state }: { state: BattleState }) => (
  <div class="row row-equation">
    <CallOrPass called={state.called} />
    <EquationBox board={state} total={equationTotal(state)} target={aimTarget(state)} />
    <button class="btn btn-icon" aria-label="Undo" onClick={act("tile_undo", { type: "undo" })}>
      <img src={icon("undo")} alt="" />
    </button>
  </div>
);

/** How long the Pass button ignores taps after it replaces Impossible, so a double tap on that cannot give the turn away. */
const PASS_ARMS_AFTER_MS = 700;

const Pass = () => {
  const shownAt = useRef(performance.now());
  const endTurn = () => {
    if (performance.now() - shownAt.current < PASS_ARMS_AFTER_MS) return;
    act("button", { type: "endTurn" })();
  };
  return (
    <button class="btn btn-call" data-action="pass" onClick={endTurn}>
      <img src={icon("hourglass")} alt="" />
      <span>Pass</span>
    </button>
  );
};

/** One call each turn, so once it is made its button becomes the way to give the turn away. */
const CallOrPass = ({ called }: { called: boolean }) =>
  called ? (
    <Pass />
  ) : (
    <button
      class="btn btn-call"
      data-action="impossible"
      aria-label="Impossible: the numbers left cannot make it"
      onClick={act("button", { type: "impossible" })}
    >
      <img src={icon("cross")} alt="" />
      <span>Impossible!</span>
    </button>
  );

const HintButton = ({ hints }: { hints: number }) => (
  <button
    class={`btn btn-tool ${hints === 0 ? "is-empty" : ""}`}
    data-action="hint"
    aria-label={`Hint, ${hints} left`}
    onClick={act("hint", { type: "hint" })}
  >
    <img src={icon("hint")} alt="" />
    <span>Hint</span>
    <b class="badge">{hints}</b>
  </button>
);

const CastButton = ({ state }: { state: BattleState }) => {
  const kind = state.aim?.kind ?? "strike";
  const total = equationTotal(state);
  const ready = state.equation.tiles.length >= 2;
  const target = aimTarget(state);
  const exact = total !== null && total === target;
  return (
    <button
      class={`btn btn-cast btn-cast-${kind} ${ready ? "" : "is-waiting"} ${ready && exact ? "is-exact" : ""}`}
      data-action="cast"
      aria-label={`${kind === "strike" ? "Strike" : "Block"}: make ${target === null ? "the number" : showNumber(target)}`}
      onClick={() => dispatch({ type: "cast" })}
    >
      <span class="cast-goal">
        <img src={icon(kind === "strike" ? "sword" : "shield")} alt="" />
        <Num class="cast-number" key={target} value={target ?? "?"} />
      </span>
      <span class="cast-label">{kind === "strike" ? "STRIKE!" : "BLOCK!"}</span>
    </button>
  );
};

/** With this many signs the hint drops its label, so the tiles stay a fingertip wide. */
const MANY_SIGNS = 4;

const Hand = ({ state }: { state: BattleState }) => {
  const hinted = hintNext(state);
  return (
    <div class={`row row-hand ${state.level.ops.length >= MANY_SIGNS ? "is-crowded" : ""}`}>
      <HintButton hints={state.hints} />
      <TileRow
        hand={state.hand}
        hintedId={hinted?.tileId}
        onTap={(tileId) => act("tile_tap", { type: "tapTile", tileId })()}
      />
      <OpRow
        ops={state.level.ops}
        pending={state.equation.pendingOp}
        hinted={hinted?.op}
        banned={bannedNow(state)}
        onTap={(op) => act("tile_tap", { type: "tapOp", op })()}
      />
    </div>
  );
};

export const ControlPanel = ({ state }: { state: BattleState }) => (
  <div class="panel">
    <div class="panel-rows">
      <EquationRow state={state} />
      <Hand state={state} />
    </div>
    <CastButton state={state} />
  </div>
);
