export const icon = (name: string) => `./assets/icons/${name}.png`;

const GLYPH_FILES: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "−": "minus",
  "×": "times",
  "÷": "divide",
  "=": "equals",
  "!": "bang",
};

const glyphFile = (char: string) => (/\d/.test(char) ? char : GLYPH_FILES[char]);

/** Numbers and signs drawn with the game's own glyph set instead of a font. */
export const Num = ({ value, class: className = "" }: { value: number | string; class?: string }) => (
  <span class={`num ${String(value).length > 1 ? "num-long" : ""} ${className}`} aria-label={String(value)} role="img">
    {[...String(value)].map((char) => {
      const file = glyphFile(char);
      return file ? <img src={`./assets/glyphs/${file}.png`} alt="" draggable={false} /> : <span>{char}</span>;
    })}
  </span>
);

export const RotatePrompt = () => (
  <div class="rotate">
    <img src={icon("undo")} alt="" />
    <p>Turn your device sideways to play</p>
  </div>
);
