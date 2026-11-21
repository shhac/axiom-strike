import { glyphFile, glyphSrc, icon } from "./assets";
import { goTo } from "./nav";
import { press } from "./press";

/** Numbers and signs drawn with the game's own glyph set instead of a font. */
export const Num = ({ value, class: className = "" }: { value: number | string; class?: string }) => (
  <span class={`num ${String(value).length > 1 ? "num-long" : ""} ${className}`} aria-label={String(value)} role="img">
    {[...String(value)].map((char) => {
      const file = glyphFile(char);
      return file ? <img src={glyphSrc(file)} alt="" draggable={false} /> : <span>{char}</span>;
    })}
  </span>
);

/**
 * A character drawn from a four-frame strip. `once` plays the frames a single time and holds the
 * last one (an attack, a flinch); otherwise they loop. `still` shows a single picture instead.
 */
export const Sprite = (props: { strip?: string; still?: string; once?: boolean; class?: string }) => (
  <div
    class={`sprite ${props.strip ? "sprite-frames" : "sprite-still"} ${props.once ? "is-once" : ""} ${props.class ?? ""}`}
    style={{ backgroundImage: `url(${props.strip ?? props.still})` }}
  />
);

/** What a story can win, shown wherever a story is on offer so the prize is never a surprise. */
export const Prizes = ({ lead }: { lead: string }) => (
  <span class="prizes" data-prizes>
    {lead}
    <img src={icon("potion")} alt="a potion" />
    <img src={icon("hint")} alt="and a hint scroll" />
  </span>
);

export const RotatePrompt = () => (
  <div class="rotate">
    <img src={icon("undo")} alt="" />
    <p>Turn your device sideways to play</p>
  </div>
);

export const MapButton = () => (
  <button class="btn btn-wide" data-action="map" onClick={press(() => goTo("map"))}>
    Map
  </button>
);
