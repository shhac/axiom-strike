import { BattleScreen } from "./BattleScreen";
import { CampfireScreen } from "./CampfireScreen";
import { CaveScreen } from "./CaveScreen";
import { RotatePrompt } from "./common";
import { IntroScreen } from "./IntroScreen";
import { LockScreen } from "./LockScreen";
import { MapScreen } from "./MapScreen";
import { icon } from "./assets";
import { curtain, screen, settingsOpen, type Screen } from "./nav";
import { save } from "./save";
import { SettingsSheet } from "./SettingsSheet";
import { TitleScreen } from "./TitleScreen";

const SCREENS: Record<Screen, () => preact.JSX.Element | null> = {
  title: TitleScreen,
  map: MapScreen,
  intro: IntroScreen,
  battle: BattleScreen,
  campfire: CampfireScreen,
  lock: LockScreen,
  cave: CaveScreen,
};

export const App = () => {
  const Current = SCREENS[screen.value];
  // The chosen tile style is worn by every tile in the game, whichever screen draws it.
  document.documentElement.dataset.tiles = save.value.tileStyle ?? "classic";
  return (
    <>
      <Current />
      {settingsOpen.value && <SettingsSheet />}
      {curtain.value && (
        <div class={`curtain is-${curtain.value}`} aria-hidden="true">
          <i class="curtain-left" />
          <i class="curtain-right" />
          <img class="curtain-star" src={icon("star")} alt="" />
        </div>
      )}
      <RotatePrompt />
    </>
  );
};
