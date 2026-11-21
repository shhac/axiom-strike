/** The moving parts of battle effects: shakes, lunges, floating text and bursts, done straight on the DOM. */
import { glyphFile, glyphSrc, icon } from "./assets";

/** Fixed waits rather than animation promises: those never settle if the tab is hidden. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const find = (selector: string) => document.querySelector<HTMLElement>(selector);
export const enemyNode = (id: number) => find(`[data-enemy="${id}"] .sprite`);
export const heroNode = () => find("[data-hero] .sprite");

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-0.5rem)" },
  { transform: "translateX(0.45rem)" },
  { transform: "translateX(-0.3rem)" },
  { transform: "translateX(0.15rem)" },
  { transform: "translateX(0)" },
];

export const shake = (node: HTMLElement | null, duration = 320) =>
  node?.animate(SHAKE, { duration, easing: "ease-out" });

export const lunge = (node: HTMLElement | null, distance: string) =>
  node?.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${distance})`, offset: 0.45 },
      { transform: "translateX(0)" },
    ],
    { duration: 380, easing: "ease-out" },
  );

export const flash = (node: HTMLElement | null) =>
  node?.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], {
    duration: 300,
  });

/** Numbers in floating text use the game's glyphs; words stay as text. */
const glyphNodes = (text: string): (Node | string)[] => {
  if (!/^[-+]?\d+$/.test(text)) return [text];
  return [...text].map((char) => {
    const img = document.createElement("img");
    img.src = glyphSrc(glyphFile(char) ?? char);
    img.alt = "";
    return img;
  });
};

export type FloatTone = "damage" | "hurt" | "good" | "miss" | "ko";

export const float = (text: string, anchor: HTMLElement | null, tone: FloatTone, lift = 0) => {
  const layer = find("#fx");
  if (!layer || !anchor) return;
  const box = anchor.getBoundingClientRect();
  const frame = layer.getBoundingClientRect();
  const node = document.createElement("div");
  node.className = `float float-${tone}`;
  node.append(...glyphNodes(text));
  node.style.left = `${box.left + box.width / 2 - frame.left}px`;
  node.style.top = `${box.top - frame.top + box.height * 0.2}px`;
  layer.append(node);
  node.animate(
    [
      { transform: `translate(-50%, ${lift}rem) scale(0.4)`, opacity: 0 },
      { transform: `translate(-50%, ${lift - 1}rem) scale(1.25)`, opacity: 1, offset: 0.2 },
      { transform: `translate(-50%, ${lift - 1.6}rem) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: `translate(-50%, ${lift - 2.6}rem) scale(1)`, opacity: 0 },
    ],
    { duration: 950, easing: "ease-out" },
  );
  setTimeout(() => node.remove(), 950);
};

const BURST_STARS = 9;

/** Stars flying out of a beaten monster. Transform and opacity only, so it stays cheap. */
export const burst = (anchor: HTMLElement | null) => {
  const layer = find("#fx");
  if (!layer || !anchor) return;
  const box = anchor.getBoundingClientRect();
  const frame = layer.getBoundingClientRect();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  Array.from({ length: BURST_STARS }, (_, index) => {
    const node = document.createElement("img");
    node.className = "burst-star";
    node.src = icon(index % 3 === 0 ? "coin" : "star");
    node.alt = "";
    node.style.left = `${box.left + box.width / 2 - frame.left}px`;
    node.style.top = `${box.top + box.height / 2 - frame.top}px`;
    layer.append(node);
    const angle = (index / BURST_STARS) * Math.PI * 2 + 0.3;
    const reach = (4 + (index % 3) * 1.6) * rem;
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach * 0.7;
    node.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.2) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y - rem}px)) scale(1.1) rotate(200deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${x * 1.15}px), calc(-50% + ${y + 2 * rem}px)) scale(0.6) rotate(320deg)`,
          opacity: 0,
        },
      ],
      { duration: 760, easing: "cubic-bezier(0.2, 0.8, 0.4, 1)" },
    );
    setTimeout(() => node.remove(), 760);
  });
};

export const knockOut = (node: HTMLElement | null) =>
  node?.animate(
    [
      { transform: "scale(1) rotate(0deg)" },
      { transform: "scale(1.35) rotate(-12deg)", offset: 0.25 },
      { transform: "scale(0.8) rotate(10deg)", offset: 0.6 },
      { transform: "scale(1) rotate(0deg)" },
    ],
    { duration: 460, easing: "ease-out" },
  );
