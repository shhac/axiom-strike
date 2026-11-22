import { useRef } from "preact/hooks";
import { aimTarget, bannedNow, equationTotal, hintNext, type BattleState } from "../../engine/battle";
import { showNumber } from "../../engine/fractions";
import { icon } from "../assets";
import { dispatch } from "../store";
import { CastButton, EquationBox, handRowClass, OpRow, TileRow } from "../sums/SumBoard";
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

const BattleCast = ({ state }: { state: BattleState }) => {
  const strikes = (state.aim?.kind ?? "strike") === "strike";
  const target = aimTarget(state);
  return (
    <CastButton
      kind={strikes ? "strike" : "parry"}
      label={strikes ? "STRIKE!" : "BLOCK!"}
      icon={strikes ? "sword" : "shield"}
      target={target}
      total={equationTotal(state)}
      ready={state.equation.tiles.length >= 2}
      ariaLabel={`${strikes ? "Strike" : "Block"}: make ${target === null ? "the number" : showNumber(target)}`}
      go={() => dispatch({ type: "cast" })}
    />
  );
};

const Hand = ({ state }: { state: BattleState }) => {
  const hinted = hintNext(state);
  return (
    <div class={handRowClass(state.level.ops)}>
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
    <BattleCast state={state} />
  </div>
);
