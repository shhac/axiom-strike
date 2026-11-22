import { useEffect, useState } from "preact/hooks";
import type { LandId, Level } from "../../engine/levels";
import { standAt } from "../../engine/progress";
import { heroStrip } from "../assets";
import { Pet, Sprite } from "../common";
import { updateSave } from "../save";

/** Where each of a land's five levels sits inside its column, as percentages: a path winding upward. */
export const SPOTS = [
  { x: 30, y: 83 },
  { x: 70, y: 71 },
  { x: 30, y: 59 },
  { x: 70, y: 47 },
  { x: 46, y: 33 },
] as const;

export const PATH = SPOTS.map((spot) => `${spot.x},${spot.y}`).join(" ");

/** The curtain has to be open before the hero sets off, or the walk is missed. */
const WALK_STARTS_AFTER_MS = 700;
const WALK_TAKES_MS = 1100;

/**
 * The hero on the map, beside the level last played. When that level has just been beaten the
 * hero hops along the trail to the newly opened one and stays there.
 */
export const MapHero = ({ from, to, pet }: { from: Level; to: Level; pet: LandId | null }) => {
  const [at, setAt] = useState(from);
  const walking = at.id === to.id && from.id !== to.id;
  useEffect(() => {
    if (from.id === to.id) return;
    const setOff = setTimeout(() => setAt(to), WALK_STARTS_AFTER_MS);
    const arrive = setTimeout(
      () => updateSave((progress) => standAt(progress, to)),
      WALK_STARTS_AFTER_MS + WALK_TAKES_MS,
    );
    return () => {
      clearTimeout(setOff);
      clearTimeout(arrive);
    };
  }, [from.id, to.id]);
  const spot = SPOTS[at.step] ?? SPOTS[0];
  // Always on the side of its level nearer the middle of the land, so it never hangs off the map.
  const onTheRight = spot.x < 50;
  const walksLeft = (SPOTS[to.step]?.x ?? 0) < (SPOTS[from.step]?.x ?? 0);
  const facesLeft = walking ? walksLeft : onTheRight;
  return (
    <div
      class={`map-hero ${walking ? "is-walking" : ""} ${onTheRight ? "is-right" : ""} ${facesLeft ? "is-facing-left" : ""}`}
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, transitionDuration: `${WALK_TAKES_MS}ms` }}
      data-map-hero={at.id}
    >
      <Sprite strip={heroStrip("idle")} />
      {pet && <Pet land={pet} />}
    </div>
  );
};
