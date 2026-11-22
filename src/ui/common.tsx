import { FRACTION_DIGITS, showNumber } from "../engine/fractions";
import { PETS } from "../content/gear";
import type { LandId } from "../engine/levels";
import { enemyStrip, glyphFile, glyphSrc, icon } from "./assets";
import { goTo } from "./nav";
import { press } from "./press";

const Glyph = ({ char }: { char: string }) => {
  const fraction = FRACTION_DIGITS[char];
  if (fraction) {
    return (
      <span class="num-frac">
        <img src={glyphSrc(fraction[0])} alt="" draggable={false} />
        <i />
        <img src={glyphSrc(fraction[1])} alt="" draggable={false} />
      </span>
    );
  }
  const file = glyphFile(char);
  return file ? <img src={glyphSrc(file)} alt="" draggable={false} /> : <span>{char}</span>;
};

/** Numbers and signs drawn with the game's own glyph set instead of a font. Halves and quarters are stacked digits. */
export const Num = ({ value, class: className = "" }: { value: number | string; class?: string }) => {
  const text = typeof value === "number" ? showNumber(value) : value;
  return (
    <span class={`num ${text.length > 1 ? "num-long" : ""} ${className}`} aria-label={text} role="img">
      {[...text].map((char) => (
        <Glyph char={char} />
      ))}
    </span>
  );
};

/** A tamed small monster. It faces the way the hero does, so the strip is flipped. */
export const Pet = ({ land, class: className = "" }: { land: LandId; class?: string }) => {
  const pet = PETS[land];
  return (
    <Sprite class={`pet ${pet.golden ? "is-golden" : ""} ${className}`} strip={enemyStrip(pet.family, "minion")} />
  );
};

type SpriteProps = ({ strip: string; once?: boolean } | { still: string }) & { class?: string };

/**
 * A character drawn from a four-frame strip. `once` plays the frames a single time and holds the
 * last one (an attack, a flinch); otherwise they loop. `still` shows a single picture instead.
 */
export const Sprite = (props: SpriteProps) => {
  const look =
    "strip" in props
      ? { src: props.strip, kind: `sprite-frames ${props.once ? "is-once" : ""}` }
      : { src: props.still, kind: "sprite-still" };
  return <div class={`sprite ${look.kind} ${props.class ?? ""}`} style={{ backgroundImage: `url(${look.src})` }} />;
};

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
