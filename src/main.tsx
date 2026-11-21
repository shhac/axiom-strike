import { render } from "preact";
import { App } from "./ui/App";
import "@fontsource-variable/fredoka";
import { installAudio } from "./ui/audio";
import { exposeDebug } from "./ui/debug";
import { startFromUrl } from "./ui/nav";
import { preloadSprites } from "./ui/preload";
import "./styles/index.css";

installAudio();
preloadSprites();
exposeDebug();
render(<App />, document.getElementById("app")!);
startFromUrl();
