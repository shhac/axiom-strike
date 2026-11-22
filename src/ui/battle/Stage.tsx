import { HERO_MAX_HP, targetOf, type AimKind, type BattleState, type Enemy } from "../../engine/battle";
import { enemyStrip, icon, knockedOutSprite } from "../assets";
import { playSfx } from "../audio";
import { Num, Sprite } from "../common";
import { settingsOpen } from "../nav";
import { busy } from "../store";
import { act } from "./act";

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
  const number = targetOf(enemy, kind);
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
      onClick={act("aim", { type: "aim", aim: { enemyId: enemy.id, kind } })}
    >
      <img class="chip-icon" src={icon(kind === "strike" ? "sword" : "claw")} alt="" />
      <Num class="chip-number" key={number} value={number} />
      {kind === "parry" && <span class="chip-when">{urgent ? "NOW!" : `in ${intent.turns}`}</span>}
    </button>
  );
};

export const EnemyView = ({ enemy, state }: { enemy: Enemy; state: BattleState }) => {
  const alive = enemy.hp > 0;
  const hurt = alive && enemy.hp < enemy.maxHp;
  return (
    <div class={`enemy enemy-${enemy.kind} ${alive ? "" : "is-down"} ${hurt ? "is-hurt" : ""}`} data-enemy={enemy.id}>
      <div class="chips">
        {alive && <AimChip enemy={enemy} kind="strike" state={state} />}
        {alive && <AimChip enemy={enemy} kind="parry" state={state} />}
      </div>
      {alive ? (
        <Sprite strip={enemyStrip(enemy.family, enemy.kind, hurt)} />
      ) : (
        <Sprite still={knockedOutSprite(enemy.family)} />
      )}
      {alive ? <HpBar hp={enemy.hp} max={enemy.maxHp} tone="enemy" /> : <div class="hp hp-gone" />}
    </div>
  );
};

const pipClass = (index: number, wave: number) => {
  if (index < wave) return "pip is-done";
  return index === wave ? "pip is-now" : "pip";
};

const openPause = () => {
  if (busy.value) return;
  playSfx("button");
  settingsOpen.value = true;
};

export const Hud = ({ state }: { state: BattleState }) => (
  <div class="hud">
    <div class="hud-hero">
      <img class="hud-heart" src={icon("heart")} alt="Health" />
      <HpBar hp={state.heroHp} max={HERO_MAX_HP} tone="hero" />
    </div>
    <div class="hud-level">
      <span class="hud-name" aria-label={state.level.name}>
        <Num value={state.level.focus} />
        Level {state.level.step + 1}
      </span>
      <span class="pips" aria-label={`Wave ${state.wave + 1} of ${state.level.waves.length}`}>
        {state.level.waves.map((_, index) => (
          <i class={pipClass(index, state.wave)} />
        ))}
      </span>
    </div>
    <div class="hud-side">
      <button class="btn hud-pause" data-action="pause" aria-label="Pause" onClick={openPause}>
        <img src={icon("gear")} alt="" />
      </button>
      {state.potions > 0 && (
        <button
          class="btn hud-potion"
          data-action="potion"
          aria-label={`Drink a potion, ${state.potions} left`}
          onClick={act("button", { type: "potion" })}
        >
          <img src={icon("potion")} alt="" />
          <b class="badge">{state.potions}</b>
        </button>
      )}
    </div>
  </div>
);
