import { useEffect, useState } from "preact/hooks";
import { PETS, STYLE_NAMES } from "../content/gear";
import { findRegion, type LandId } from "../engine/levels";
import { isUnlocked, lockLevel, newLock, pickDial, redealLock, tryDial } from "../engine/lock";
import { CHEST_PRIZES, openChest, type ChestPrize } from "../engine/progress";
import { icon } from "./assets";
import { playMusic, playSfx } from "./audio";
import { MapButton, Num } from "./common";
import { goTo, visiting } from "./nav";
import { PetBuddy } from "./PetBuddy";
import { press } from "./press";
import { save, updateSave } from "./save";
import { SumPanel } from "./sums/SumPanel";
import { useHint } from "./useHint";
import { randomSeed } from "./seed";

type Thing = Exclude<ChestPrize, "pet">;

const Prize = ({ prize, land }: { prize: Thing; land: LandId }) => {
  if (prize === "style") {
    return (
      <span data-prize="style">
        <i class="tile prize-tile" data-tiles={land}>
          <Num value={7} />
        </i>
        <b>{STYLE_NAMES[land]}</b>
        <small>a new look for your numbers</small>
      </span>
    );
  }
  return (
    <span data-prize="key">
      <img src={icon("key")} alt="" />
      <b>Cave key</b>
      <small>opens this land's cave</small>
    </span>
  );
};

/** A pet is met, not just handed over: it bounds in where the open chest would be and is introduced by name. */
const NewFriend = ({ land }: { land: LandId }) => (
  <div class="friend" data-prize="pet">
    <PetBuddy land={land} mood="dance" class="friend-pet" />
    <b>{PETS[land].name} wants to come with you!</b>
    <small>It will cheer you on in battle and wait for you by the campfire.</small>
  </div>
);

/** A pet takes the open chest's place at the top of the panel; a style or a key is listed with the other things. */
const Headline = ({ prize, land }: { prize: ChestPrize; land: LandId }) => {
  if (prize === "pet") {
    return (
      <>
        <h1>A new friend!</h1>
        <NewFriend land={land} />
      </>
    );
  }
  return (
    <>
      <img class="chest-open" src={icon("chest_open")} alt="" />
      <h1>Treasure!</h1>
    </>
  );
};

const Opened = ({ prize, land }: { prize: ChestPrize; land: LandId }) => (
  <div class="overlay" data-result="chest">
    <div class="result">
      <Headline prize={prize} land={land} />
      <div class="reward-items">
        {prize !== "pet" && <Prize prize={prize} land={land} />}
        <span>
          <img src={icon("potion")} alt="" />
          <b>+1 Potion</b>
          <small>heals you in battle</small>
        </span>
        <span>
          <img src={icon("hint")} alt="" />
          <b>+1 Hint scroll</b>
          <small>shows you an answer</small>
        </span>
      </div>
      <div class="result-buttons">
        <MapButton />
      </div>
    </div>
  </div>
);

export const LockScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const land = visiting.value;
  const region = findRegion(land);
  // Fixed when the screen opens: opening the chest moves the save on to the next one.
  const [gate] = useState(() => save.value.chests[land]);
  const [lock, setLock] = useState(() => newLock(lockLevel(land, gate), randomSeed()));
  const { hint, say } = useHint();
  const opened = isUnlocked(lock);

  const unlock = () => {
    const tried = tryDial(lock);
    setLock(tried.lock);
    if (!tried.opened) {
      playSfx("miss", 0.8);
      return say("Not that one. The tiles are back in your hand");
    }
    playSfx(isUnlocked(tried.lock) ? "jingle_victory" : "reward");
    if (isUnlocked(tried.lock)) updateSave((current) => openChest(current, land));
  };

  return (
    <div class={`screen stage-${land} lock`} data-screen="lock">
      <div class="lock-stage">
        <button
          class="btn btn-icon lock-back"
          data-action="map"
          aria-label="Back to the map"
          onClick={press(() => goTo("map"))}
        >
          <img src={icon("undo")} alt="" />
        </button>
        <div class="lock-title">
          <h1>{region.label} chest</h1>
          <p>Make each number to open its lock</p>
        </div>
        <img class={`lock-chest ${opened ? "is-open" : ""}`} src={icon(opened ? "chest_open" : "chest")} alt="" />
        <div class="dials">
          {lock.targets.map((target, dial) => (
            <button
              class={`dial ${lock.open[dial] ? "is-open" : ""} ${dial === lock.dial && !lock.open[dial] ? "is-picked" : ""}`}
              data-dial={dial}
              disabled={lock.open[dial]}
              aria-label={`Lock ${dial + 1}: ${lock.open[dial] ? "open" : `make ${target}`}`}
              onClick={press(() => setLock(pickDial(lock, dial)))}
            >
              <img class="dial-state" src={icon(lock.open[dial] ? "check" : "lock")} alt="" />
              <Num value={target} />
            </button>
          ))}
        </div>
        {hint && <div class="toast">{hint}</div>}
      </div>
      <SumPanel
        board={lock}
        level={lock.level}
        target={lock.targets[lock.dial] ?? null}
        change={(next) => setLock({ ...lock, ...next })}
        refuse={say}
        corner={
          <button
            class="btn btn-call"
            data-action="redeal"
            aria-label="New numbers"
            onClick={press(() => setLock(redealLock(lock, randomSeed())))}
          >
            <img src={icon("hourglass")} alt="" />
            <span>New numbers</span>
          </button>
        }
        cast={{ label: "UNLOCK!", icon: "key", go: unlock }}
      />
      {opened && <Opened prize={CHEST_PRIZES[gate] ?? "style"} land={land} />}
    </div>
  );
};
