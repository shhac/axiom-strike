import { render } from "preact";
import { App } from "./ui/App";
import "@fontsource-variable/fredoka";
import { preloadAudio } from "./ui/audio";
import { preloadSprites } from "./ui/preload";
import "./styles.css";

preloadAudio();
preloadSprites();
render(<App />, document.getElementById("app")!);
