import { BattleScreen } from "./BattleScreen";
import { MapScreen } from "./MapScreen";
import { screen, type Screen } from "./nav";
import { TitleScreen } from "./TitleScreen";

const SCREENS: Record<Screen, () => preact.JSX.Element> = {
  title: TitleScreen,
  map: MapScreen,
  battle: BattleScreen,
};

export const App = () => {
  const Current = SCREENS[screen.value];
  return <Current />;
};
