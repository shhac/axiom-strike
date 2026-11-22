import { useRef } from "preact/hooks";
import { aimTarget, attacksLanding, bannedNow, equationTotal, hintNext, type BattleState } from "../../engine/battle";
import { showNumber } from "../../engine/fractions";
import { icon } from "../assets";
import { dispatch } from "../store";
import { CastButton, EquationBox, handRowClass, OpRow, TileRow } from "../sums/SumBoard";
import { act } from "./act";

const EquationRow = ({ state }: { state: BattleState }) => (
  <div class="row row-equation">
    <CallOrPass called={state.called} attacks={attacksLanding(state).length} />
    <EquationBox board={state} total={equationTotal(state)} target={aimTarget(state)} />
    <button class="btn btn-icon" aria-label="Undo" onClick={act("tile_undo", { type: "undo" })}>
      <img src={icon("undo")} alt="" />
    </button>
  </div>
);

/** How long the Pass button ignores taps after it replaces Impossible, so a double tap on that cannot give the turn away. */
const PASS_ARMS_AFTER_MS = 700;

/** The button says what passing costs: new numbers always, and a hit when a monster is ready to attack. */
const Pass = ({ attacks }: { attacks: number }) => {
  const shownAt = useRef(performance.now());
  const endTurn = () => {
    if (performance.now() - shownAt.current < PASS_ARMS_AFTER_MS) return;
    act("button", { type: "endTurn" })();
  };
  return (
    <button
      class={`btn btn-call btn-pass ${attacks > 0 ? "is-risky" : ""}`}
      data-action="pass"
      aria-label={attacks > 0 ? "Pass: new numbers, and the monsters attack" : "Pass: new numbers"}
      onClick={endTurn}
    >
      <span class="pass-title">
        <img src={icon(attacks > 0 ? "claw" : "hourglass")} alt="" />
        Pass
      </span>
      <span class="pass-cost">{attacks > 0 ? "They attack!" : "New numbers"}</span>
    </button>
  );
};

/** A wrong call uses up the turn's call, and its button becomes the way to give the turn away. */
const CallOrPass = ({ called, attacks }: { called: boolean; attacks: number }) =>
  called ? (
    <Pass attacks={attacks} />
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
