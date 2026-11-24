import { useEffect, useState } from "preact/hooks";
import { PETS, petLine } from "../../content/gear";
import type { LandId } from "../../engine/levels";
import { playSfx } from "../audio";
import { PetBuddy } from "../PetBuddy";
import { petFeels, petMood } from "../petMood";
import { press } from "../press";

const LINE_MS = 2200;

/** The pet waits by the fire. Tapping it gets a hop and a few words. */
export const CampPet = ({ land }: { land: LandId }) => {
  const [taps, setTaps] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => petFeels("calm"), []);
  useEffect(() => {
    if (line === null) return;
    const timer = setTimeout(() => setLine(null), LINE_MS);
    return () => clearTimeout(timer);
  }, [line, taps]);

  const pat = () => {
    playSfx("star", 0.7);
    petFeels("cheer", 700);
    setLine(petLine(PETS[land].name, taps));
    setTaps(taps + 1);
  };

  return (
    <button class="camp-pet" data-action="pet" aria-label={`Say hello to ${PETS[land].name}`} onClick={press(pat)}>
      {line && (
        <span class="camp-pet-says" key={taps}>
          {line}
        </span>
      )}
      <PetBuddy land={land} mood={petMood.value} />
    </button>
  );
};
