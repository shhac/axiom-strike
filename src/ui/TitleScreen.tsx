import { goTo } from "./nav";
import { glyphSrc } from "./assets";
import { RotatePrompt } from "./common";
import { playMusic, playSfx, unlockAudio } from "./audio";
import { useEffect } from "preact/hooks";

const DRIFTERS = ["plus", "7", "times", "3", "minus", "9", "divide"] as const;

/** Spread the drifting symbols evenly without needing randomness at render time. */
const drifterStyle = (index: number) => ({
  left: `${6 + ((index * 41) % 88)}%`,
  animationDuration: `${7 + (index % 5) * 1.6}s`,
  animationDelay: `${-index * 1.3}s`,
  width: `${1.3 + (index % 3) * 0.5}rem`,
});

const openMap = () => {
  playSfx("button");
  goTo("map");
};

export const TitleScreen = () => {
  useEffect(() => playMusic("music_title"), []);
  return (
    <div class="screen title" onPointerDown={unlockAudio}>
      <div class="title-art" />
      <div class="title-shade" />
      <div class="drifters" aria-hidden="true">
        {DRIFTERS.map((name, index) => (
          <img class="drifter" src={glyphSrc(name)} alt="" style={drifterStyle(index)} />
        ))}
      </div>
      <img class="logo" src="./assets/title/logo.png" alt="Axiom Strike" draggable={false} />
      <button class="play" data-action="play" onClick={openMap}>
        <span>PLAY</span>
      </button>
      <p class="tagline">Add it up. Strike it down.</p>
      <RotatePrompt />
    </div>
  );
};
