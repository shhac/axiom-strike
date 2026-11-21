import { heroSprite } from "./assets";
import { unlockAudio } from "./audio";
import { ControlPanel } from "./battle/ControlPanel";
import { Result } from "./battle/Result";
import { EnemyView, Hud } from "./battle/Stage";
import { RotatePrompt } from "./common";
import { banner, heroPose, toast } from "./fx";
import { battle, busy } from "./store";

export const BattleScreen = () => {
  const state = battle.value;
  return (
    <div class={`screen ${busy.value ? "is-busy" : ""}`} onPointerDown={unlockAudio}>
      <div class={`stage stage-${state.level.region}`}>
        <Hud state={state} />
        <div class="hero" data-hero>
          <img class="sprite" src={heroSprite(heroPose.value)} alt="" draggable={false} />
        </div>
        <div class="enemies">
          {state.enemies.map((enemy) => (
            <EnemyView key={enemy.id} enemy={enemy} state={state} />
          ))}
        </div>
        {banner.value && <div class="banner">{banner.value}</div>}
      </div>
      <ControlPanel state={state} />
      <div id="fx" />
      {toast.value && <div class="toast">{toast.value}</div>}
      <Result state={state} />
      <RotatePrompt />
    </div>
  );
};
