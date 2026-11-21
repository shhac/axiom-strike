import { render } from "preact";
import { App } from "./ui/App";
import "@fontsource-variable/fredoka";
import { preloadAudio } from "./ui/audio";
import "./styles.css";

preloadAudio();
render(<App />, document.getElementById("app")!);
