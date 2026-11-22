import { heroStrip } from "./assets";
import { ControlPanel } from "./battle/ControlPanel";
import { Result } from "./battle/Result";
import { EnemyView, Hud } from "./battle/Stage";
import { Pet, Sprite } from "./common";
import { banner, heroPose, speech, toast } from "./fx";
import { save } from "./save";
import { battle, busy } from "./store";

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
        {save.value.pet && <Pet land={save.value.pet} class="hero-pet" />}
        <div class="enemies">
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
