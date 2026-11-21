import { useState } from "preact/hooks";
import {
  changeSettings,
  DIFFICULTIES,
  READING_LEVELS,
  resetProgress,
  type Difficulty,
  type ReadingLevel,
  type Settings,
} from "../engine/progress";
import { icon } from "./assets";
import { playSfx } from "./audio";
import { goTo, screen, settingsOpen } from "./nav";
import { press } from "./press";
import { save, updateSave } from "./save";

const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  auto: "Auto",
  gentle: "Gentle",
  standard: "Normal",
  tough: "Tough",
};

const READING_NAMES: Record<ReadingLevel, string> = { auto: "Auto", easy: "Easy", medium: "Medium", hard: "Hard" };

const set = (change: Partial<Settings>) => {
  updateSave((current) => changeSettings(current, change));
  playSfx("button");
};

const Toggle = ({ name, label, image, on }: { name: "music" | "sound"; label: string; image: string; on: boolean }) => (
  <button
    class={`btn setting-toggle ${on ? "is-on" : ""}`}
    data-setting={name}
    aria-pressed={on}
    onClick={() => set({ [name]: !on })}
  >
    <img src={icon(image)} alt="" />
    <span>{label}</span>
    <b>{on ? "On" : "Off"}</b>
  </button>
);

const Choice = <T extends string>(props: {
  label: string;
  name: string;
  options: readonly T[];
  names: Record<T, string>;
  value: T;
  pick: (value: T) => void;
}) => (
  <div class="setting-choice">
    <span>{props.label}</span>
    <div class="segments" role="group" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          class={`segment ${option === props.value ? "is-picked" : ""}`}
          data-setting={`${props.name}-${option}`}
          aria-pressed={option === props.value}
          onClick={() => props.pick(option)}
        >
          {props.names[option]}
        </button>
      ))}
    </div>
  </div>
);

export const SettingsSheet = () => {
  const [confirming, setConfirming] = useState(false);
  const { settings } = save.value;
  const inBattle = screen.value === "battle";

  const close = press(() => (settingsOpen.value = false));

  const reset = () => {
    if (!confirming) return setConfirming(true);
    updateSave(resetProgress);
    playSfx("tile_undo");
    goTo("title");
  };

  return (
    <div class="overlay sheet-overlay" data-screen="settings">
      <div class="sheet">
        <header class="sheet-head">
          <h1>{inBattle ? "Paused" : "Settings"}</h1>
          <button class="btn btn-icon" data-action="close-settings" aria-label="Close" onClick={close}>
            <img src={icon("cross")} alt="" />
          </button>
        </header>
        <div class="sheet-row">
          <Toggle name="music" label="Music" image="music" on={settings.music} />
          <Toggle name="sound" label="Sounds" image="sound" on={settings.sound} />
        </div>
        <Choice
          label="Sums"
          name="difficulty"
          options={DIFFICULTIES}
          names={DIFFICULTY_NAMES}
          value={settings.difficulty}
          pick={(difficulty) => set({ difficulty })}
        />
        <Choice
          label="Stories"
          name="reading"
          options={READING_LEVELS}
          names={READING_NAMES}
          value={settings.reading}
          pick={(reading) => set({ reading })}
        />
        <div class="sheet-row sheet-foot">
          {inBattle ? (
            <button class="btn btn-wide" data-action="leave" onClick={press(() => goTo("map"))}>
              <img src={icon("exit")} alt="" />
              Leave battle
            </button>
          ) : (
            <button class={`btn btn-wide ${confirming ? "is-danger" : ""}`} data-action="reset" onClick={reset}>
              {confirming ? "Tap again to erase everything" : "Start over"}
            </button>
          )}
          <button class="btn btn-wide btn-go" data-action="resume" onClick={close}>
            {inBattle ? "Keep playing" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};
