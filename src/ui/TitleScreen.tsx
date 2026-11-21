import { goTo, settingsOpen } from "./nav";
import { glyphSrc, icon } from "./assets";
import { playMusic } from "./audio";
import { press } from "./press";
import { useEffect } from "preact/hooks";

const DRIFTERS = ["plus", "7", "times", "3", "minus", "9", "divide"] as const;

/** Spread the drifting symbols evenly without needing randomness at render time. */
const drifterStyle = (index: number) => ({
  left: `${6 + ((index * 41) % 88)}%`,
  animationDuration: `${7 + (index % 5) * 1.6}s`,
  animationDelay: `${-index * 1.3}s`,
  width: `${1.3 + (index % 3) * 0.5}rem`,
});

export const TitleScreen = () => {
  useEffect(() => playMusic("music_title"), []);
  return (
    <div class="screen title">
      <div class="title-art" />
      <div class="title-shade" />
      <div class="drifters" aria-hidden="true">
        {DRIFTERS.map((name, index) => (
          <img class="drifter" src={glyphSrc(name)} alt="" style={drifterStyle(index)} />
        ))}
      </div>
      <img class="logo" src="./assets/title/logo.png" alt="Axiom Strike" draggable={false} />
      <button class="play" data-action="play" onClick={press(() => goTo("map"))}>
        <span>PLAY</span>
      </button>
      <button
        class="btn btn-icon title-settings"
        data-action="settings"
        aria-label="Settings"
        onClick={press(() => (settingsOpen.value = true))}
      >
        <img src={icon("gear")} alt="" />
      </button>
      <p class="tagline">Add it up. Strike it down.</p>
    </div>
  );
};
