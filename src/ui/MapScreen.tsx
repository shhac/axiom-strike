import { useEffect } from "preact/hooks";
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
    <section class={`region region-${region.id}`}>
      <header class="region-title">
        <span>{region.name}</span>
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

export const MapScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const { stories } = save.value;
  return (
    <div class="screen map">
      <div class="map-art" />
      <div class="regions">
        {REGIONS.map((region) => (
          <RegionColumn key={region.id} region={region} progress={save.value} />
        ))}
      </div>
      <button class="btn btn-icon map-back" data-action="back" aria-label="Back to title" onClick={() => goTo("title")}>
        <img src={icon("undo")} alt="" />
      </button>
      <div class="map-tools">
        <button
          class={`btn btn-icon map-fire ${stories > 0 ? "is-lit" : ""}`}
          data-action="campfire"
          aria-label={`Campfire, ${stories} stories waiting`}
          onClick={press(() => goTo("campfire"))}
        >
          <img src={icon("campfire")} alt="" />
          {stories > 0 && <b class="badge">{stories}</b>}
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
