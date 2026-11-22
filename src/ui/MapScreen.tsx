import { useEffect, useState } from "preact/hooks";
import { REGIONS, type LandId } from "../engine/levels";
import { landStars } from "../engine/progress";
import { playMusic, playSfx } from "./audio";
import { icon } from "./assets";
import { Land } from "./map/Land";
import { goTo, goToCamp, mapPage, settingsOpen } from "./nav";
import { press } from "./press";
import { save } from "./save";
import { freshStars } from "./store";
import { useHint } from "./useHint";

/** How long the map can sit untouched before it points at the levels that can be played. */
const NUDGE_AFTER_MS = 15000;
/** New stars wait for the curtain, then fly one after another into the land's counter. */
const TRAIL_STARTS_MS = 700;
const TRAIL_GAP_MS = 160;
const TRAIL_FLIGHT_MS = 800;
const STARS_IN_A_LAND = 15;
/** A land with no stars is this grey; it gains its colour star by star. */
const GREYEST = 0.75;
const PAGE_NAMES = ["Home", "Far Lands"] as const;
const PAGE_ART = ["world_map", "far_map"] as const;

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

/**
 * Stars won since the map was last open. They are held back from the counters until they have
 * been seen flying in from the level that earned them.
 */
const useStarTrail = () => {
  const [flying, setFlying] = useState(freshStars.value);
  useEffect(() => {
    if (!flying) return;
    const lands = setTimeout(
      () => {
        playSfx("star");
        freshStars.value = null;
        setFlying(null);
      },
      TRAIL_STARTS_MS + TRAIL_GAP_MS * (flying.count - 1) + TRAIL_FLIGHT_MS,
    );
    return () => clearTimeout(lands);
  }, []);
  return flying;
};

/** The part of the screen a land covers, as percentages from the left: its column, out to the edge at either end. */
const landSpan = (index: number, count: number) => {
  const width = 90 / count;
  return { left: index === 0 ? 0 : 5 + index * width, right: index === count - 1 ? 0 : 95 - (index + 1) * width };
};

export const MapScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const { nudging, touched } = useIdleNudge();
  const { hint, say } = useHint();
  const flying = useStarTrail();
  const progress = save.value;
  const page = mapPage.value;
  const lands = REGIONS.filter((region) => region.page === page);
  const otherPage = page === 0 ? 1 : 0;
  const { stories, potions, scrolls } = progress;
  const lit = stories > 0;
  const shown = (land: LandId) => landStars(progress, land) - (flying?.land === land ? flying.count : 0);
  const turnPage = () => {
    freshStars.value = null;
    mapPage.value = otherPage;
  };
  return (
    <div class={`screen map ${nudging ? "is-nudging" : ""}`} data-screen="map" data-page={page} onPointerDown={touched}>
      <div class="map-art" style={{ backgroundImage: `url(./assets/bg/${PAGE_ART[page] ?? PAGE_ART[0]}.webp)` }} />
      {lands.map((region, index) => {
        const { left, right } = landSpan(index, lands.length);
        return (
          <div
            key={region.id}
            class="map-grey"
            style={{
              backgroundImage: `url(./assets/bg/${PAGE_ART[page] ?? PAGE_ART[0]}_grey.webp)`,
              clipPath: `inset(0 ${right}% 0 ${left}%)`,
              opacity: GREYEST * (1 - Math.min(1, shown(region.id) / STARS_IN_A_LAND)),
            }}
          />
        );
      })}
      <div class="regions" style={{ gridTemplateColumns: `repeat(${lands.length}, 1fr)` }}>
        {lands.map((region) => (
          <Land
            key={region.id}
            region={region}
            progress={progress}
            shownStars={shown(region.id)}
            flying={flying?.land === region.id ? flying : null}
            say={say}
          />
        ))}
      </div>
      {nudging && !hint && (
        <div class="map-nudge" data-nudge>
          Tap a glowing number to play!
        </div>
      )}
      {hint && (
        <div class="map-nudge map-hint" data-hint>
          {hint}
        </div>
      )}
      <button
        class={`btn map-page map-page-${otherPage}`}
        data-action="page"
        aria-label={`Go to ${PAGE_NAMES[otherPage]}`}
        onClick={press(turnPage)}
      >
        {PAGE_NAMES[otherPage]}
        <i class="map-page-arrow" />
      </button>
      <button class="btn btn-icon map-back" data-action="back" aria-label="Back to title" onClick={() => goTo("title")}>
        <img src={icon("undo")} alt="" />
      </button>
      <div class="map-tools">
        <button
          class={`btn map-fire ${lit ? "is-lit" : ""}`}
          data-action="campfire"
          aria-label={`Camp, ${stories} stories waiting. Read one to win a potion and a hint scroll. You have ${potions} potions and ${scrolls} hint scrolls`}
          onClick={press(() => goToCamp())}
        >
          <img src={icon("campfire")} alt="" />
          <span class="map-fire-text">
            {lit ? "Story time!" : "Camp"}
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
