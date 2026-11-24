import type { LandId } from "../engine/levels";
import { icon } from "./assets";
import { Num, Pet } from "./common";
import type { PetMood } from "./petMood";

const Emote = ({ mood }: { mood: PetMood }) => {
  if (mood === "cheer" || mood === "dance") return <img class="buddy-emote" src={icon("star")} alt="" />;
  if (mood === "scared" || mood === "worried") return <Num class="buddy-emote buddy-alarm" value="!" />;
  return null;
};

/** The pet as a character: it moves and shows a small sign above its head to suit its mood. */
export const PetBuddy = ({ land, mood, class: className = "" }: { land: LandId; mood: PetMood; class?: string }) => (
  <div class={`buddy is-${mood} ${className}`} data-pet={mood}>
    <Pet land={land} upset={mood === "scared" || mood === "sad"} />
    <Emote key={mood} mood={mood} />
  </div>
);
