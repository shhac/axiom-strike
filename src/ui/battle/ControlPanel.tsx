import { aimTarget, equationTotal, equationValues, hintNext, type BattleState } from "../../engine/battle";
import { icon } from "../assets";
import { Num } from "../common";
import { dispatch } from "../store";
import { act } from "./act";

type Hinted = ReturnType<typeof hintNext>;

const EquationBar = ({ state }: { state: BattleState }) => {
  const target = aimTarget(state);
  const total = equationTotal(state);
  const kind = state.aim?.kind ?? "strike";
  const placed = equationValues(state);
  const ready = placed.length >= 2;
  const exact = total !== null && total === target;
  return (
    <div class="row row-equation">
      <div class={`goal goal-${kind}`}>
        <img src={icon(kind === "strike" ? "sword" : "shield")} alt="" />
        <Num class="goal-number" key={target} value={target ?? "?"} />
      </div>
      <div class="equation" aria-live="polite">
        {placed.length === 0 && <span class="equation-empty">Tap numbers to make {target}</span>}
        {placed.map((value, index) => (
          <>
            {index > 0 && <Num class="eq-op" value={state.equation.ops[index - 1] ?? ""} />}
            <Num class="eq-num" value={value} />
          </>
        ))}
        {state.equation.pendingOp && <Num class="eq-op is-pending" value={state.equation.pendingOp} />}
        {total !== null && (
          <span class={`eq-total ${exact ? "is-exact" : ""}`} data-total={total}>
            <Num value={`=${total}`} />
          </span>
        )}
      </div>
      <button class="btn btn-icon" aria-label="Undo" onClick={act("tile_undo", { type: "undo" })}>
        <img src={icon("undo")} alt="" />
      </button>
      <button
        class={`btn btn-call ${state.called ? "is-empty" : ""}`}
        data-action="impossible"
        aria-label="Impossible: the numbers left cannot make it"
        onClick={act("button", { type: "impossible" })}
      >
        <img src={icon("cross")} alt="" />
        <span>Impossible!</span>
      </button>
      <button
        class={`btn btn-cast btn-cast-${kind} ${ready ? "" : "is-waiting"} ${ready && exact ? "is-exact" : ""}`}
        data-action="cast"
        onClick={() => dispatch({ type: "cast" })}
      >
        {kind === "strike" ? "STRIKE!" : "PARRY!"}
      </button>
    </div>
  );
};

const Tiles = ({ state, hinted }: { state: BattleState; hinted: Hinted }) => (
  <div class="tiles">
    {state.hand.map((tile, index) => (
      <button
        key={tile.id}
        class={`tile ${tile.used ? "is-used" : ""} ${hinted?.tileId === tile.id ? "is-hinted" : ""}`}
        style={{ animationDelay: `${index * 45}ms` }}
        data-tile={tile.id}
        disabled={tile.used}
        aria-label={`Number ${tile.value}`}
        onClick={act("tile_tap", { type: "tapTile", tileId: tile.id })}
      >
        <Num value={tile.value} />
      </button>
    ))}
  </div>
);

const Ops = ({ state, hinted }: { state: BattleState; hinted: Hinted }) => {
  if (state.level.ops.length <= 1) return null;
  return (
    <div class="ops">
      {state.level.ops.map((op) => (
        <button
          class={`op ${state.equation.pendingOp === op ? "is-picked" : ""} ${hinted?.op === op && !state.equation.pendingOp ? "is-hinted" : ""}`}
          data-op={op}
          aria-label={`Sign ${op}`}
          onClick={act("tile_tap", { type: "tapOp", op })}
        >
          <Num value={op} />
        </button>
      ))}
    </div>
  );
};

const Tools = ({ hints }: { hints: number }) => (
  <div class="tools">
    <button
      class={`btn btn-tool ${hints === 0 ? "is-empty" : ""}`}
      data-action="hint"
      aria-label={`Hint, ${hints} left`}
      onClick={act("hint", { type: "hint" })}
    >
      <img src={icon("hint")} alt="" />
      <b class="badge">{hints}</b>
    </button>
    <button class="btn btn-tool btn-end" data-action="end-turn" onClick={act("button", { type: "endTurn" })}>
      <img src={icon("hourglass")} alt="" />
      <span>End turn</span>
    </button>
  </div>
);

const Hand = ({ state }: { state: BattleState }) => {
  const hinted = hintNext(state);
  return (
    <div class="row row-hand">
      <Tiles state={state} hinted={hinted} />
      <Ops state={state} hinted={hinted} />
      <Tools hints={state.hints} />
    </div>
  );
};

export const ControlPanel = ({ state }: { state: BattleState }) => (
  <div class="panel">
    <EquationBar state={state} />
    <Hand state={state} />
  </div>
);
