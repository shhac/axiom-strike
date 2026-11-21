import { BattleScreen } from "./BattleScreen";
import { CampfireScreen } from "./CampfireScreen";
import { RotatePrompt } from "./common";
import { IntroScreen } from "./IntroScreen";
import { MapScreen } from "./MapScreen";
import { screen, settingsOpen, type Screen } from "./nav";
import { SettingsSheet } from "./SettingsSheet";
import { TitleScreen } from "./TitleScreen";

const SCREENS: Record<Screen, () => preact.JSX.Element | null> = {
  title: TitleScreen,
  map: MapScreen,
  intro: IntroScreen,
  battle: BattleScreen,
  campfire: CampfireScreen,
};

export const App = () => {
  const Current = SCREENS[screen.value];
  return (
    <>
      <Current />
      {settingsOpen.value && <SettingsSheet />}
      <RotatePrompt />
    </>
  );
};
