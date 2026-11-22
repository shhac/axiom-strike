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

/** Back to the camp from one of its activities. */
export const CampButton = ({ back }: { back: () => void }) => (
  <button class="btn btn-wide" data-action="camp" onClick={press(back)}>
    Camp
  </button>
);

type StarsProps = { count: number; class?: string; label?: boolean; stagger?: boolean };

/** Three stars, `count` of them lit. `stagger` pops them in one after another, as on a result panel. */
export const Stars = ({ count, class: className = "stars", label = false, stagger = false }: StarsProps) => (
  <span class={className} aria-label={label ? `${count} of 3 stars` : undefined}>
    {[1, 2, 3].map((n) => (
      <img
        src={icon(n <= count ? "star" : "star_empty")}
        alt=""
        style={stagger ? { animationDelay: `${n * 180}ms` } : undefined}
      />
    ))}
  </span>
);

const pipClass = (index: number, now: number) => {
  if (index < now) return "pip is-done";
  return index === now ? "pip is-now" : "pip";
};

/** A row of dots for steps through something: done, the current one, and still to come. */
export const Pips = ({ count, now, label }: { count: number; now: number; label?: string }) => (
  <span class="pips" aria-label={label}>
    {Array.from({ length: count }, (_, index) => (
      <i class={pipClass(index, now)} />
    ))}
  </span>
);

/** Days played in a row, as a flame that grows at three and seven. Nothing until a day has been played. */
export const Streak = ({ days }: { days: number }) => {
  if (days === 0) return null;
  const size = days >= 7 ? "is-roaring" : days >= 3 ? "is-bright" : "";
  return (
    <span class={`streak ${size}`} data-streak={days} aria-label={`${days} days played in a row`}>
      <img src={icon("flame")} alt="" />
      {days}
      <small>{days === 1 ? "day" : "days"}</small>
    </span>
  );
};

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
