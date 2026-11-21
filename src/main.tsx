import { render } from "preact";
import { App } from "./ui/App";
import "@fontsource-variable/fredoka";
import { preloadAudio } from "./ui/audio";
import { exposeDebug } from "./ui/debug";
import { startFromUrl } from "./ui/nav";
import { preloadSprites } from "./ui/preload";
import "./styles/index.css";

preloadAudio();
preloadSprites();
exposeDebug();
render(<App />, document.getElementById("app")!);
startFromUrl();
