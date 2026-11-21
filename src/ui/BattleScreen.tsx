import { useEffect } from "preact/hooks";
import {
  aimTarget,
  equationTotal,
  HERO_MAX_HP,
  hintNext,
  type AimKind,
  type BattleState,
  type Enemy,
} from "../engine/battle";
import { nextLevel } from "../engine/levels";
import { solve } from "../engine/solver";
import { icon, Num, RotatePrompt } from "./common";
import { banner, heroPose, toast } from "./fx";
import { playSfx, unlockAudio } from "./audio";
import { enterBattle, goTo, startLevelId } from "./nav";
import { battle, busy, dispatch, startBattle } from "./store";

const FAMILY_SPRITE = { add: "add", sub: "sub", mul: "mul", div: "div" } as const;

const enemySprite = (enemy: Enemy) => {
  const family = FAMILY_SPRITE[enemy.family];
  if (enemy.hp <= 0) return `./assets/chars/enemy_${family}_ko.png`;
  return `./assets/chars/${enemy.kind === "boss" ? "boss" : "enemy"}_${family}.png`;
};

const HpBar = ({ hp, max, tone }: { hp: number; max: number; tone: "hero" | "enemy" }) => (
  <div class={`hp hp-${tone}`}>
    <div class="hp-fill" style={{ transform: `scaleX(${Math.max(0, hp) / max})` }} />
    <span class="hp-text">{hp}</span>
  </div>
);

const AimChip = ({ enemy, kind, state }: { enemy: Enemy; kind: AimKind; state: BattleState }) => {
  const selected = state.aim?.enemyId === enemy.id && state.aim.kind === kind;
  const { intent } = enemy;
  const urgent = kind === "parry" && intent.turns === 1;
  const softened = kind === "parry" && intent.remaining < intent.damage;
  const number = kind === "strike" ? enemy.weakness : intent.damage;
  const label =
    kind === "strike"
      ? `Weakness ${number}`
      : `Attack ${number}, lands ${urgent ? "this turn" : `in ${intent.turns} turns`}`;
  return (
    <button
      class={`chip chip-${kind} ${selected ? "is-aimed" : ""} ${urgent ? "is-urgent" : ""} ${softened ? "is-softened" : ""}`}
      data-aim={`${kind}-${enemy.id}`}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => {
        playSfx("aim");
        dispatch({ type: "aim", aim: { enemyId: enemy.id, kind } });
      }}
    >
      <img class="chip-icon" src={icon(kind === "strike" ? "sword" : "shield")} alt="" />
      <Num class="chip-number" key={number} value={number} />
      {kind === "parry" && <span class="chip-when">{urgent ? "NOW!" : `in ${intent.turns}`}</span>}
    </button>
  );
};

const EnemyView = ({ enemy, state }: { enemy: Enemy; state: BattleState }) => {
  const alive = enemy.hp > 0;
  return (
    <div class={`enemy enemy-${enemy.kind} ${alive ? "" : "is-down"}`} data-enemy={enemy.id}>
      <div class="chips">
        {alive && <AimChip enemy={enemy} kind="strike" state={state} />}
        {alive && <AimChip enemy={enemy} kind="parry" state={state} />}
      </div>
      <img class="sprite" src={enemySprite(enemy)} alt="" draggable={false} />
      {alive ? <HpBar hp={enemy.hp} max={enemy.maxHp} tone="enemy" /> : <div class="hp hp-gone" />}
    </div>
  );
};

const Hud = ({ state }: { state: BattleState }) => (
  <div class="hud">
    <div class="hud-hero">
      <img class="hud-heart" src={icon("heart")} alt="Health" />
      <HpBar hp={state.heroHp} max={HERO_MAX_HP} tone="hero" />
    </div>
    <div class="hud-level">
      <span class="hud-name">{state.level.name}</span>
      <span class="pips" aria-label={`Wave ${state.wave + 1} of ${state.level.waves.length}`}>
        {state.level.waves.map((_, index) => (
          <i class={index < state.wave ? "pip is-done" : index === state.wave ? "pip is-now" : "pip"} />
        ))}
      </span>
    </div>
  </div>
);

const EquationBar = ({ state }: { state: BattleState }) => {
  const target = aimTarget(state);
  const total = equationTotal(state);
  const kind = state.aim?.kind ?? "strike";
  const placed = state.equation.tiles.map((id) => state.hand.find((tile) => tile.id === id)?.value ?? 0);
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
      <button class="btn btn-icon" aria-label="Undo" onClick={() => (playSfx("tile_undo"), dispatch({ type: "undo" }))}>
        <img src={icon("undo")} alt="" />
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

const Hand = ({ state }: { state: BattleState }) => {
  const hinted = hintNext(state);
  const multiOp = state.level.ops.length > 1;
  return (
    <div class="row row-hand">
      <div class="tiles">
        {state.hand.map((tile, index) => (
          <button
            key={tile.id}
            class={`tile ${tile.used ? "is-used" : ""} ${hinted?.tileId === tile.id ? "is-hinted" : ""}`}
            style={{ animationDelay: `${index * 45}ms` }}
            data-tile={tile.id}
            disabled={tile.used}
            aria-label={`Number ${tile.value}`}
            onClick={() => {
              playSfx("tile_tap");
              dispatch({ type: "tapTile", tileId: tile.id });
            }}
          >
            <Num value={tile.value} />
          </button>
        ))}
      </div>
      {multiOp && (
        <div class="ops">
          {state.level.ops.map((op) => (
            <button
              class={`op ${state.equation.pendingOp === op ? "is-picked" : ""} ${hinted?.op === op && !state.equation.pendingOp ? "is-hinted" : ""}`}
              data-op={op}
              aria-label={`Sign ${op}`}
              onClick={() => {
                playSfx("tile_tap");
                dispatch({ type: "tapOp", op });
              }}
            >
              <Num value={op} />
            </button>
          ))}
        </div>
      )}
      <div class="tools">
        <button
          class={`btn btn-tool ${state.hints === 0 ? "is-empty" : ""}`}
          data-action="hint"
          aria-label={`Hint, ${state.hints} left`}
          onClick={() => {
            playSfx("hint");
            dispatch({ type: "hint" });
          }}
        >
          <img src={icon("hint")} alt="" />
          <b class="badge">{state.hints}</b>
        </button>
        <button
          class="btn btn-tool btn-end"
          data-action="end-turn"
          onClick={() => (playSfx("button"), dispatch({ type: "endTurn" }))}
        >
          <img src={icon("hourglass")} alt="" />
          <span>End turn</span>
        </button>
      </div>
    </div>
  );
};

const Result = ({ state }: { state: BattleState }) => {
  if (state.phase === "player") return null;
  const won = state.phase === "won";
  const next = nextLevel(state.level);
  return (
    <div class="overlay" data-result={state.phase}>
      <div class="result">
        <h1>{won ? "Victory!" : "So close!"}</h1>
        {won ? (
          <div class="stars" aria-label={`${state.stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <img
                src={icon(n <= state.stars ? "star" : "star_empty")}
                alt=""
                style={{ animationDelay: `${n * 180}ms` }}
              />
            ))}
          </div>
        ) : (
          <p>The monsters won this round. You can beat them!</p>
        )}
        <div class="result-buttons">
          <button class="btn btn-wide" data-action="map" onClick={() => (playSfx("button"), goTo("map"))}>
            Map
          </button>
          {(!won || !next) && (
            <button class="btn btn-wide btn-go" data-action="retry" onClick={() => startBattle(state.level.id)}>
              {won ? "Play again" : "Try again"}
            </button>
          )}
          {won && next && (
            <button class="btn btn-wide btn-go" data-action="next" onClick={() => startBattle(next.id)}>
              Next level
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Lets automated playthroughs read the board and ask the solver; not used by the game itself. */
const exposeDebug = () => {
  Object.assign(window, { __axiom: { state: () => battle.value, busy: () => busy.value, solve } });
};

export const BattleScreen = () => {
  const state = battle.value;
  useEffect(() => {
    exposeDebug();
    if (startLevelId) enterBattle(startLevelId);
  }, []);
  return (
    <div class={`screen ${busy.value ? "is-busy" : ""}`} onPointerDown={unlockAudio}>
      <div class={`stage stage-${state.level.region}`}>
        <Hud state={state} />
        <div class="hero" data-hero>
          <img class="sprite" src={`./assets/chars/hero_${heroPose.value}.png`} alt="" draggable={false} />
        </div>
        <div class="enemies">
          {state.enemies.map((enemy) => (
            <EnemyView key={enemy.id} enemy={enemy} state={state} />
          ))}
        </div>
        {banner.value && <div class="banner">{banner.value}</div>}
      </div>
      <div class="panel">
        <EquationBar state={state} />
        <Hand state={state} />
      </div>
      <div id="fx" />
      {toast.value && <div class="toast">{toast.value}</div>}
      <Result state={state} />
      <RotatePrompt />
    </div>
  );
};
