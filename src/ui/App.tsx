import { screen } from "./nav";
import { BattleScreen } from "./BattleScreen";
import { TitleScreen } from "./TitleScreen";

export const App = () => (screen.value === "title" ? <TitleScreen /> : <BattleScreen />);
