import { useState } from "preact/hooks";
import { enemyStrip, heroStrip } from "./assets";
import { playSfx } from "./audio";
import { Num, Sprite } from "./common";
import { finishIntro, intro } from "./nav";

export const IntroScreen = () => {
  const [index, setIndex] = useState(0);
  const current = intro.value;
  if (!current) return null;
  const { scene } = current;
  const beat = scene.beats[index] ?? scene.beats[0];
  if (!beat) return null;
  const last = index >= scene.beats.length - 1;

  const advance = () => {
    playSfx("tile_tap");
    if (last) return finishIntro();
    setIndex(index + 1);
  };

  const skip = (event: Event) => {
    event.stopPropagation();
    playSfx("button");
    finishIntro();
  };

  return (
    <div class={`screen intro stage-${scene.family}`} data-screen="intro" onClick={advance}>
      <div class={`intro-cast is-${beat.speaker}`}>
        <Sprite class="intro-hero" strip={heroStrip(beat.speaker === "hero" ? "victory" : "idle")} />
        <Sprite
          class={`intro-enemy ${scene.boss ? "is-boss" : ""}`}
          strip={enemyStrip(scene.family, scene.boss ? "boss" : "standard")}
        />
      </div>
      <div class={`speech speech-${beat.speaker}`} key={index}>
        <span class="speech-name">{beat.speaker === "enemy" ? scene.name : "You"}</span>
        <p>{beat.text}</p>
        {beat.sum && <Num class="speech-sum" value={beat.sum} />}
        <span class="speech-next">{last ? "Tap to fight!" : "Tap to continue"}</span>
      </div>
      <button class="btn intro-skip" data-action="skip" onClick={skip}>
        Skip
      </button>
    </div>
  );
};
