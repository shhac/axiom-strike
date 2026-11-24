import { PETS, STYLE_NAMES } from "../../content/gear";
import { REGIONS, type LandId } from "../../engine/levels";
import { chestGiving, ownsPet, ownsStyle, wear, type ChestPrize, type Save } from "../../engine/progress";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { CampButton, Num, Pet } from "../common";
import { press } from "../press";
import { updateSave } from "../save";

type ChoiceProps = {
  picked: boolean;
  owned: boolean;
  label: string;
  where: string;
  name: string;
  pick: () => void;
  children: preact.ComponentChildren;
};

/** Something to wear. One not won yet shows which chest it is in instead of being pickable. */
const Choice = ({ picked, owned, label, where, name, pick, children }: ChoiceProps) => (
  <button
    class={`gear-choice ${picked ? "is-picked" : ""} ${owned ? "" : "is-locked"}`}
    data-gear={name}
    disabled={!owned}
    aria-label={owned ? label : `${label}, locked: ${where}`}
    aria-pressed={picked}
    onClick={press(pick)}
  >
    {children}
    {!owned && <img class="gear-lock" src={icon("lock")} alt="" />}
    <small>{owned ? label : where}</small>
  </button>
);

const ORDINALS = ["1st", "2nd", "3rd"];

const chestOf = (land: LandId, prize: ChestPrize) =>
  `${ORDINALS[chestGiving(prize) - 1] ?? ""} ${REGIONS.find((region) => region.id === land)?.label ?? ""} chest`;

/** The pet that follows the hero and the look of the number tiles, from what the chests have given. */
export const Gear = ({ save, back }: { save: Save; back: () => void }) => {
  const wearing = (change: Parameters<typeof wear>[1]) => () => {
    playSfx("reward", 0.6);
    updateSave((current) => wear(current, change));
  };
  return (
    <div class="camp-sheet" data-phase="gear">
      <h1>Pets and tiles</h1>
      <div class="gear-row" aria-label="Pets">
        <Choice picked={save.pet === null} owned label="No pet" where="" name="pet-none" pick={wearing({ pet: null })}>
          <img class="gear-none" src={icon("paw")} alt="" />
        </Choice>
        {REGIONS.map(({ id }) => (
          <Choice
            picked={save.pet === id}
            owned={ownsPet(save, id)}
            label={PETS[id].name}
            where={chestOf(id, "pet")}
            name={`pet-${id}`}
            pick={wearing({ pet: id })}
          >
            <Pet land={id} />
          </Choice>
        ))}
      </div>
      <div class="gear-row" aria-label="Tile styles">
        <Choice
          picked={save.tileStyle === null}
          owned
          label="Classic tiles"
          where=""
          name="tiles-classic"
          pick={wearing({ tileStyle: null })}
        >
          <i class="tile prize-tile" data-tiles="classic">
            <Num value={7} />
          </i>
        </Choice>
        {REGIONS.map(({ id }) => (
          <Choice
            picked={save.tileStyle === id}
            owned={ownsStyle(save, id)}
            label={STYLE_NAMES[id]}
            where={chestOf(id, "style")}
            name={`tiles-${id}`}
            pick={wearing({ tileStyle: id })}
          >
            <i class="tile prize-tile" data-tiles={id}>
              <Num value={7} />
            </i>
          </Choice>
        ))}
      </div>
      <div class="result-buttons">
        <CampButton back={back} />
      </div>
    </div>
  );
};
