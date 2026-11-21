import { signal } from "@preact/signals";
import type { BattleEvent, BattleState } from "../engine/battle";
import { glyphFile, glyphSrc, type HeroPose } from "./assets";
import { playMusic, playSfx } from "./audio";

export const heroPose = signal<HeroPose>("idle");
export const banner = signal<string | null>(null);
export const toast = signal<string | null>(null);

/** Fixed waits rather than animation promises: those never settle if the tab is hidden. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const find = (selector: string) => document.querySelector<HTMLElement>(selector);
const enemyNode = (id: number) => find(`[data-enemy="${id}"] .sprite`);
const heroNode = () => find("[data-hero] .sprite");

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-0.5rem)" },
  { transform: "translateX(0.45rem)" },
  { transform: "translateX(-0.3rem)" },
  { transform: "translateX(0.15rem)" },
  { transform: "translateX(0)" },
];

const shake = (node: HTMLElement | null, duration = 320) => node?.animate(SHAKE, { duration, easing: "ease-out" });

const lunge = (node: HTMLElement | null, distance: string) =>
  node?.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${distance})`, offset: 0.45 },
      { transform: "translateX(0)" },
    ],
    { duration: 380, easing: "ease-out" },
  );

const flash = (node: HTMLElement | null) =>
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

type FloatTone = "damage" | "hurt" | "good" | "miss";

const float = (text: string, anchor: HTMLElement | null, tone: FloatTone, lift = 0) => {
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

const showBanner = async (text: string, ms: number) => {
  banner.value = text;
  await wait(ms);
  banner.value = null;
};

const toastTimer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

const showToast = (text: string) => {
  toast.value = text;
  if (toastTimer.id) clearTimeout(toastTimer.id);
  toastTimer.id = setTimeout(() => (toast.value = null), 1800);
};

type EventOf<T extends BattleEvent["type"]> = Extract<BattleEvent, { type: T }>;

const REJECTIONS: Record<EventOf<"rejected">["reason"], string> = {
  needOperator: "Pick a sign first",
  badStep: "That can't go below zero or split unevenly",
  tooShort: "Use at least two numbers",
  noAim: "Tap a target first",
  noHints: "No hint scrolls left",
  noExact: "No exact answer left this turn",
};

const COMBO_NAMES = ["", "", "", "COMBO!", "SUPER COMBO!", "MEGA COMBO!"];

/** Wind-ups that should be seen before the numbers on screen change. */
export const beforeEvent = async (event: BattleEvent) => {
  if (event.type === "strike") {
    heroPose.value = "attack";
    playSfx("sword_swing", 0.8);
    lunge(heroNode(), "2.2rem");
    await wait(170);
  }
  if (event.type === "enemyAttack") {
    playSfx("enemy_attack", 0.8);
    lunge(enemyNode(event.enemyId), "-3rem");
    await wait(170);
  }
};

const strikeFx = async (event: EventOf<"strike">) => {
  const target = enemyNode(event.enemyId);
  if (event.damage > 0) {
    playSfx(event.exact && event.power >= 3 ? "hit_heavy" : "hit_light");
    shake(target);
    flash(target);
    float(`-${event.damage}`, target, "damage");
    const combo = event.exact ? COMBO_NAMES[Math.min(event.power, 5)] : "";
    if (combo) {
      playSfx("combo", 0.8);
      float(combo, target, "good", -1.6);
    }
    if (!event.exact) float("So close!", target, "miss", -1.6);
  } else {
    playSfx("miss", 0.8);
    float("MISS", target, "miss");
  }
  await wait(480);
  heroPose.value = "idle";
};

const parryFeedback = (event: EventOf<"parry">, target: HTMLElement | null) => {
  if (event.exact) {
    playSfx("parry");
    float("PARRIED!", target, "good", -1.6);
    float(`-${event.counter}`, target, "damage");
    shake(target);
    return;
  }
  if (event.blocked > 0) {
    playSfx("block", 0.8);
    float(`Blocked ${event.blocked}`, target, "good");
    return;
  }
  playSfx("miss", 0.8);
  float("Too far off", target, "miss");
};

const parryFx = (event: EventOf<"parry">) => {
  parryFeedback(event, enemyNode(event.enemyId));
  return wait(480);
};

const enemyAttackFx = async (event: EventOf<"enemyAttack">) => {
  const hero = heroNode();
  if (event.damage > 0) {
    heroPose.value = "hurt";
    playSfx("hero_hurt");
    shake(hero);
    shake(find(".stage"), 260);
    float(`-${event.damage}`, hero, "hurt");
  } else {
    playSfx("block");
    float("BLOCKED!", hero, "good");
  }
  await wait(520);
  heroPose.value = "idle";
};

const wonFx = (event: EventOf<"won">) => {
  heroPose.value = "victory";
  playMusic(null);
  playSfx("jingle_victory");
  // One ding per star, in time with the stars popping in on the result panel.
  Array.from({ length: event.stars }, (_, index) => setTimeout(() => playSfx("star"), 480 + index * 180));
};

export const afterEvent = async (event: BattleEvent, state: BattleState) => {
  switch (event.type) {
    case "strike":
      return strikeFx(event);
    case "parry":
      return parryFx(event);
    case "defeated":
      playSfx("enemy_defeat");
      return wait(380);
    case "weaknessShift":
      return wait(260);
    case "enemyAttack":
      return enemyAttackFx(event);
    case "waveStart":
      if (event.wave > 0) playSfx("jingle_wave", 0.7);
      return showBanner(`Wave ${event.wave + 1} of ${state.level.waves.length}`, 900);
    case "deal":
      playSfx("deal", 0.6);
      return wait(120);
    case "won":
      return wonFx(event);
    case "lost":
      playMusic(null);
      playSfx("jingle_defeat");
      heroPose.value = "hurt";
      return;
    case "rejected":
      playSfx("error", 0.7);
      shake(find(".equation"), 240);
      showToast(REJECTIONS[event.reason]);
      return;
  }
};
