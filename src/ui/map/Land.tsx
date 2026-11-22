import { caveId } from "../../engine/cave";
import { LEVELS, type Level, type Region } from "../../engine/levels";
import {
  chestReady,
  GATES,
  hasCaveKey,
  heroGoal,
  heroSpot,
  isUnlocked,
  landIsOpen,
  landStars,
  nextGate,
  starsFor,
  totalStars,
  type Save,
} from "../../engine/progress";
import { icon } from "../assets";
import { Num, Stars } from "../common";
import { enterBattle, visit } from "../nav";
import { press } from "../press";
import { MapHero, PATH, SPOTS } from "./MapHero";

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
      {stars > 0 && <Stars count={stars} class="node-stars" />}
    </button>
  );
};

/** New stars wait for the curtain to open, then set off one after another. */
export const TRAIL_STARTS_MS = 700;
export const TRAIL_GAP_MS = 160;

type GateProps = { region: Region; progress: Save; say: (hint: string) => void };

/** The land's star chest: how far along the next one is, and the way into its lock when it is ready. */
const ChestButton = ({ region, progress, say }: GateProps) => {
  const gate = nextGate(progress, region.id);
  const ready = chestReady(progress, region.id);
  const stars = landStars(progress, region.id);
  const open = () => {
    if (ready) return visit("lock", region.id);
    say(gate === null ? "You opened every chest here!" : `Win ${gate} stars in ${region.label} to open this chest`);
  };
  return (
    <button
      class={`gate gate-chest ${ready ? "is-ready" : ""} ${gate === null ? "is-spent" : ""}`}
      data-chest={region.id}
      aria-label={
        gate === null
          ? `${region.label} chests: all ${GATES.length} opened`
          : `${region.label} chest: ${stars} of ${gate} stars${ready ? ", ready to open" : ""}`
      }
      onClick={press(open)}
    >
      <img src={icon(gate === null ? "chest_open" : "chest")} alt="" />
      <small>{gate === null ? "Done!" : `${Math.min(stars, gate)}/${gate}`}</small>
    </button>
  );
};

/** The land's "Impossible or not?" cave, shut until its key turns up in the second chest. */
const CaveButton = ({ region, progress, say }: GateProps) => {
  const open = hasCaveKey(progress, region.id);
  const stars = progress.stars[caveId(region.id)] ?? 0;
  const enter = () => (open ? visit("cave", region.id) : say("The key to this cave is in the second chest"));
  return (
    <button
      class={`gate gate-cave ${open ? "" : "is-locked"}`}
      data-cave={region.id}
      aria-label={`${region.label} cave${open ? "" : ", locked"}${stars ? `, ${stars} stars` : ""}`}
      onClick={press(enter)}
    >
      <img src={icon("cave")} alt="" />
      {open ? <Stars count={stars} class="node-stars" /> : <img class="gate-key" src={icon("key")} alt="" />}
    </button>
  );
};

/** A far land that has not opened yet says what it takes. */
const LandLock = ({ region, progress }: { region: Region; progress: Save }) => (
  <div class="land-lock" data-land-lock={region.id}>
    <img src={icon("lock")} alt="" />
    <b>
      <img src={icon("star")} alt="" />
      {totalStars(progress)}/{region.opensAt}
    </b>
    <span>stars to enter</span>
  </div>
);

type LandProps = {
  region: Region;
  progress: Save;
  /** Stars to show in the counter: fewer than earned while new ones are still flying in. */
  shownStars: number;
  /** New stars on their way from a level to the counter. */
  flying: { levelId: string; count: number } | null;
  say: (hint: string) => void;
};

export const Land = ({ region, progress, shownStars, flying, say }: LandProps) => {
  const levels = LEVELS.filter((level) => level.region === region.id);
  const current = levels.find((level) => isUnlocked(progress, level) && starsFor(progress, level) === 0);
  const open = landIsOpen(progress, region.id);
  const complete = shownStars >= levels.length * 3;
  const heroFrom = heroSpot(progress);
  const heroTo = heroGoal(progress);
  const from = SPOTS[levels.find((level) => level.id === flying?.levelId)?.step ?? 0] ?? SPOTS[0];
  return (
    <section
      class={`region region-${region.id} ${complete ? "is-complete" : ""} ${open ? "" : "is-shut"}`}
      aria-label={region.name}
    >
      <Num class="region-symbol" value={region.sign} />
      <header class="region-title">
        <span class="region-name">
          {complete ? <img class="region-crown" src={icon("crown")} alt="" /> : <Num value={region.sign} />}
          {region.label}
        </span>
        <span class="region-stars" data-land-stars={region.id}>
          <img src={icon("star")} alt="" />
          {shownStars}/{levels.length * 3}
        </span>
      </header>
      {open && (
        <div class="gates">
          <ChestButton region={region} progress={progress} say={say} />
          <CaveButton region={region} progress={progress} say={say} />
        </div>
      )}
      <svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={PATH} />
      </svg>
      {levels.map((level) => (
        <NodeButton key={level.id} level={level} current={level.id === current?.id} progress={progress} />
      ))}
      {!open && <LandLock region={region} progress={progress} />}
      {heroFrom && heroTo && heroFrom.region === region.id && (
        <MapHero from={heroFrom} to={heroTo} pet={progress.pet} />
      )}
      {flying &&
        Array.from({ length: flying.count }, (_, index) => (
          <img
            class="star-fly"
            src={icon("star")}
            alt=""
            style={{
              "--from-x": `${from.x}%`,
              "--from-y": `${from.y}%`,
              animationDelay: `${TRAIL_STARTS_MS + index * TRAIL_GAP_MS}ms`,
            }}
          />
        ))}
      {complete && [0, 1, 2].map((n) => <img class={`twinkle twinkle-${n}`} src={icon("star")} alt="" />)}
    </section>
  );
};
