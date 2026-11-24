import { heroStrip } from "./assets";
import { ControlPanel } from "./battle/ControlPanel";
import { Result } from "./battle/Result";
import { EnemyView, Hud } from "./battle/Stage";
import { attacksLanding, type BattleState } from "../engine/battle";
import type { LandId } from "../engine/levels";
import { Sprite } from "./common";
import { banner, heroPose, speech, toast } from "./fx";
import { PetBuddy } from "./PetBuddy";
import { petMood } from "./petMood";
import { save } from "./save";
import { battle, busy } from "./store";

/** The pet watches the fight: it frets while an attack is about to land, unless something has just happened. */
const BattlePet = ({ land, state }: { land: LandId; state: BattleState }) => {
  const fretting = petMood.value === "calm" && state.phase === "player" && attacksLanding(state).length > 0;
  return <PetBuddy land={land} mood={fretting ? "worried" : petMood.value} class="hero-pet" />;
};

export const BattleScreen = () => {
  const state = battle.value;
  return (
    <div class={`screen ${busy.value ? "is-busy" : ""}`}>
      <div class={`stage stage-${state.level.region}`}>
        <Hud state={state} />
        <div class="hero" data-hero>
          <Sprite
            key={heroPose.value}
            strip={heroStrip(heroPose.value)}
            once={heroPose.value === "attack" || heroPose.value === "hurt"}
            class={`pose-${heroPose.value}`}
          />
        </div>
        {save.value.pet && <BattlePet land={save.value.pet} state={state} />}
        <div class={`enemies ${state.aim ? "has-aim" : ""}`}>
          {state.enemies.map((enemy) => (
            <EnemyView key={enemy.id} enemy={enemy} state={state} />
          ))}
        </div>
        {banner.value && <div class="banner">{banner.value}</div>}
        {speech.value && (
          <div class={`say say-${speech.value.who}`} data-say={speech.value.who} key={speech.value.text}>
            <span class="say-name">{speech.value.name}</span>
            {speech.value.text}
          </div>
        )}
      </div>
      <ControlPanel state={state} />
      <div id="fx" />
      {toast.value && <div class="toast">{toast.value}</div>}
      <Result state={state} />
    </div>
  );
};
