import { useEffect, useState } from "preact/hooks";
import { LEVELS, REGIONS, type Level, type Region } from "../engine/levels";
import { isUnlocked, starsFor, type Save } from "../engine/progress";
import { playMusic } from "./audio";
import { icon } from "./assets";
import { Num } from "./common";
import { enterBattle, goTo, settingsOpen } from "./nav";
import { press } from "./press";
import { save } from "./save";

/** Where each of a land's five levels sits inside its column, as percentages: a path winding upward. */
const SPOTS = [
  { x: 30, y: 83 },
  { x: 70, y: 71 },
  { x: 30, y: 59 },
  { x: 70, y: 47 },
  { x: 46, y: 33 },
] as const;

const PATH = SPOTS.map((spot) => `${spot.x},${spot.y}`).join(" ");

const NodeButton = ({ level, current, progress }: { level: Level; current: boolean; progress: Save }) => {
  const spot = SPOTS[level.step] ?? SPOTS[0];
  const open = isUnlocked(progress, level);
  const stars = starsFor(progress, level);
  const boss = level.step === SPOTS.length - 1;
  return (
    <button
      class={`node ${open ? "" : "is-locked"} ${stars > 0 ? "is-done" : ""} ${current ? "is-current" : ""} ${boss ? "is-boss" : ""}`}
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      data-level={level.id}
      aria-label={`${level.name}${open ? "" : ", locked"}${stars ? `, ${stars} stars` : ""}`}
      disabled={!open}
      onClick={press(() => enterBattle(level))}
    >
      {open ? <Num value={level.step + 1} /> : <img class="node-lock" src={icon("lock")} alt="" />}
      {current && <i class="node-arrow" />}
      {stars > 0 && (
        <span class="node-stars">
          {[1, 2, 3].map((n) => (
            <img src={icon(n <= stars ? "star" : "star_empty")} alt="" />
          ))}
        </span>
      )}
    </button>
  );
};

const RegionColumn = ({ region, progress }: { region: Region; progress: Save }) => {
  const levels = LEVELS.filter((level) => level.region === region.id);
  const current = levels.find((level) => isUnlocked(progress, level) && starsFor(progress, level) === 0);
  const earned = levels.reduce((sum, level) => sum + starsFor(progress, level), 0);
  return (
    <section class={`region region-${region.id}`} aria-label={region.name}>
      <Num class="region-symbol" value={region.focus} />
      <header class="region-title">
        <span class="region-name">
          <Num value={region.focus} />
          {region.label}
        </span>
        <span class="region-stars">
          <img src={icon("star")} alt="" />
          {earned}/{levels.length * 3}
        </span>
      </header>
      <svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={PATH} />
      </svg>
      {levels.map((level) => (
        <NodeButton key={level.id} level={level} current={level.id === current?.id} progress={progress} />
      ))}
    </section>
  );
};

/** How long the map can sit untouched before it points at the levels that can be played. */
const NUDGE_AFTER_MS = 15000;

/** True once nothing has been touched for a while; any touch clears it and starts the wait again. */
const useIdleNudge = () => {
  const [nudging, setNudging] = useState(false);
  const [touches, setTouches] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setNudging(true), NUDGE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [touches]);
  const touched = () => {
    setNudging(false);
    setTouches((count) => count + 1);
  };
  return { nudging, touched };
};

export const MapScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const { nudging, touched } = useIdleNudge();
  const { stories, potions, scrolls } = save.value;
  const lit = stories > 0;
  return (
    <div class={`screen map ${nudging ? "is-nudging" : ""}`} data-screen="map" onPointerDown={touched}>
      <div class="map-art" />
      <div class="regions">
        {REGIONS.map((region) => (
          <RegionColumn key={region.id} region={region} progress={save.value} />
        ))}
      </div>
      {nudging && (
        <div class="map-nudge" data-nudge>
          Tap a glowing number to play!
        </div>
      )}
      <button class="btn btn-icon map-back" data-action="back" aria-label="Back to title" onClick={() => goTo("title")}>
        <img src={icon("undo")} alt="" />
      </button>
      <div class="map-tools">
        <button
          class={`btn map-fire ${lit ? "is-lit" : ""}`}
          data-action="campfire"
          aria-label={`Campfire, ${stories} stories waiting. Read one to win a potion and a hint scroll. You have ${potions} potions and ${scrolls} hint scrolls`}
          onClick={press(() => goTo("campfire"))}
        >
          <img src={icon("campfire")} alt="" />
          <span class="map-fire-text">
            {lit ? "Story time!" : "Campfire"}
            {lit ? (
              <small>
                Win
                <img src={icon("potion")} alt="" />
                <img src={icon("hint")} alt="" />
              </small>
            ) : (
              <small>
                <img src={icon("potion")} alt="" />
                <span data-bag="potions">{potions}</span>
                <img src={icon("hint")} alt="" />
                <span data-bag="scrolls">{scrolls}</span>
              </small>
            )}
          </span>
          {lit && <b class="badge">{stories}</b>}
        </button>
        <button
          class="btn btn-icon"
          data-action="settings"
          aria-label="Settings"
          onClick={press(() => (settingsOpen.value = true))}
        >
          <img src={icon("gear")} alt="" />
        </button>
      </div>
    </div>
  );
};
