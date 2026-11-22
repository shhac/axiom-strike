import { useLayoutEffect, useRef } from "preact/hooks";
import { aimTarget, equationTotal, equationValues, hintNext, type BattleState } from "../../engine/battle";
import { bracketEnds } from "../../engine/equation";
import { icon } from "../assets";
import { Num } from "../common";
import { dispatch } from "../store";
import { act } from "./act";

type Hinted = ReturnType<typeof hintNext>;

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

const EquationBar = ({ state }: { state: BattleState }) => {
  const target = aimTarget(state);
  const total = equationTotal(state);
  const kind = state.aim?.kind ?? "strike";
  const placed = equationValues(state);
  const exact = total !== null && total === target;
  const { ops, pendingOp } = state.equation;
  const closes = bracketEnds(pendingOp ? [...ops, pendingOp] : ops);
  const terms = useShrinkToFit(`${placed.join()} ${ops.join()} ${pendingOp ?? ""}`);
  return (
    <div class="row row-equation">
      <HintButton hints={state.hints} />
      <CallOrEnd called={state.called} />
      <div class={`goal goal-${kind}`}>
        <img src={icon(kind === "strike" ? "sword" : "shield")} alt="" />
        <Num class="goal-number" key={target} value={target ?? "?"} />
      </div>
      <div class="equation" aria-live="polite">
        {placed.length === 0 && <span class="equation-empty">Tap numbers to make {target}</span>}
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
            <Num value={`=${total}`} />
          </span>
        )}
      </div>
      <button class="btn btn-icon" aria-label="Undo" onClick={act("tile_undo", { type: "undo" })}>
        <img src={icon("undo")} alt="" />
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

/** How long the End turn button ignores taps after it replaces Impossible, so a double tap on that cannot give the turn away. */
const END_TURN_ARMS_AFTER_MS = 700;

const EndTurn = () => {
  const shownAt = useRef(performance.now());
  const endTurn = () => {
    if (performance.now() - shownAt.current < END_TURN_ARMS_AFTER_MS) return;
    act("button", { type: "endTurn" })();
  };
  return (
    <button class="btn btn-call" data-action="end-turn" onClick={endTurn}>
      <img src={icon("hourglass")} alt="" />
      <span>End turn</span>
    </button>
  );
};

/** One call each turn, so once it is made its button becomes the way to give the turn away. */
const CallOrEnd = ({ called }: { called: boolean }) =>
  called ? (
    <EndTurn />
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
    <b class="badge">{hints}</b>
  </button>
);

const CastButton = ({ state }: { state: BattleState }) => {
  const kind = state.aim?.kind ?? "strike";
  const total = equationTotal(state);
  const ready = state.equation.tiles.length >= 2;
  const exact = total !== null && total === aimTarget(state);
  return (
    <button
      class={`btn btn-cast btn-cast-${kind} ${ready ? "" : "is-waiting"} ${ready && exact ? "is-exact" : ""}`}
      data-action="cast"
      onClick={() => dispatch({ type: "cast" })}
    >
      <img src={icon(kind === "strike" ? "sword" : "shield")} alt="" />
      {kind === "strike" ? "STRIKE!" : "BLOCK!"}
    </button>
  );
};

const Hand = ({ state }: { state: BattleState }) => {
  const hinted = hintNext(state);
  return (
    <div class="row row-hand">
      <Tiles state={state} hinted={hinted} />
      <Ops state={state} hinted={hinted} />
    </div>
  );
};

export const ControlPanel = ({ state }: { state: BattleState }) => (
  <div class="panel">
    <div class="panel-rows">
      <EquationBar state={state} />
      <Hand state={state} />
    </div>
    <CastButton state={state} />
  </div>
);
