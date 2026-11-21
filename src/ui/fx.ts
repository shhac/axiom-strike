import { signal } from "@preact/signals";
import { cheerFor, leadOf, tauntFor } from "../content/taunts";
import type { BattleEvent, BattleState } from "../engine/battle";
import type { HeroPose } from "./assets";
import { playMusic, playSfx } from "./audio";
import { burst, enemyNode, find, flash, float, heroNode, knockOut, lunge, shake, wait } from "./motion";

export const heroPose = signal<HeroPose>("idle");
export const banner = signal<string | null>(null);
export const toast = signal<string | null>(null);

export type Speech = { who: "hero" | "enemy"; name: string; text: string };
export const speech = signal<Speech | null>(null);

const speechTimer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

/** Holds the battle for `holdMs` so the line is noticed, then lets play carry on underneath it. */
const say = async (line: Speech, holdMs: number, lingerMs: number) => {
  if (speechTimer.id) clearTimeout(speechTimer.id);
  speech.value = line;
  speechTimer.id = setTimeout(() => (speech.value = null), holdMs + lingerMs);
  await wait(holdMs);
};

export const hush = () => {
  if (speechTimer.id) clearTimeout(speechTimer.id);
  speech.value = null;
};

const showBanner = async (text: string, ms: number) => {
  banner.value = text;
  await wait(ms);
  banner.value = null;
};

const toastTimer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

export const showToast = (text: string) => {
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
  noExact: "No exact answer left. Tap Impossible!",
  noPotions: "No potions left. Earn more at the campfire",
  fullHealth: "You are already at full health",
  alreadyCalled: "One Impossible call each turn",
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

/** The hero celebrates for `ms`, and for whatever `then` adds, before settling again. */
const cheer = async (ms: number, then?: () => Promise<void>) => {
  heroPose.value = "victory";
  await wait(ms);
  await then?.();
  heroPose.value = "idle";
};

const anotherWaveComing = (state: BattleState) =>
  state.enemies.every((enemy) => enemy.hp <= 0) && state.wave + 1 < state.level.waves.length;

const KO_WORDS = ["KO!", "POW!", "BAM!", "ZAP!"];

const defeatedFx = async (event: EventOf<"defeated">, state: BattleState) => {
  const target = enemyNode(event.enemyId);
  playSfx("enemy_defeat");
  setTimeout(() => playSfx("star", 0.7), 140);
  knockOut(target);
  burst(target);
  shake(find(".stage"), 220);
  float(KO_WORDS[event.enemyId % KO_WORDS.length] ?? "KO!", target, "ko", -0.6);
  await cheer(560, async () => {
    if (anotherWaveComing(state)) await say({ who: "hero", name: "You", text: cheerFor(state.seed) }, 650, 0);
  });
};

const sharpEyeFx = (event: EventOf<"sharpEye">) => {
  playSfx("reward");
  float("SHARP EYE!", find(".tiles"), "ko", -1.2);
  float(`${event.swapped} new numbers`, find(".tiles"), "good", 1);
  return cheer(620);
};

const lookAgainFx = () => {
  playSfx("miss", 0.8);
  shake(find(".tiles"), 240);
  showToast("These numbers could make it. Look again!");
  return wait(200);
};

const waveStartFx = async (event: EventOf<"waveStart">, state: BattleState) => {
  if (event.wave > 0) playSfx("jingle_wave", 0.7);
  await showBanner(`Wave ${event.wave + 1} of ${state.level.waves.length}`, 600);
  const lead = leadOf(state.enemies);
  if (!lead) return;
  playSfx("enemy_attack", 0.5);
  lunge(enemyNode(lead.id), "-1.4rem");
  await say({ who: "enemy", ...tauntFor(lead, event.wave, state.seed) }, 500, 1700);
};

export const afterEvent = async (event: BattleEvent, state: BattleState) => {
  switch (event.type) {
    case "strike":
      return strikeFx(event);
    case "parry":
      return parryFx(event);
    case "defeated":
      return defeatedFx(event, state);
    case "weaknessShift":
      return wait(260);
    case "enemyAttack":
      return enemyAttackFx(event);
    case "waveStart":
      return waveStartFx(event, state);
    case "sharpEye":
      return sharpEyeFx(event);
    case "lookAgain":
      return lookAgainFx();
    case "deal":
      playSfx("deal", 0.6);
      return wait(120);
    case "healed":
      playSfx("potion");
      float(`+${event.amount}`, heroNode(), "good");
      return cheer(520);
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
