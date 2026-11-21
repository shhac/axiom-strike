const SFX = [
  "tile_tap",
  "tile_undo",
  "button",
  "aim",
  "sword_swing",
  "hit_light",
  "hit_heavy",
  "miss",
  "parry",
  "block",
  "enemy_attack",
  "hero_hurt",
  "enemy_defeat",
  "combo",
  "hint",
  "deal",
  "star",
  "error",
  "jingle_victory",
  "jingle_defeat",
  "jingle_wave",
] as const;

export type SfxName = (typeof SFX)[number];
export type MusicName = "music_title" | "music_battle" | "music_calm";

const MUSIC_VOLUME = 0.35;
const FADE_MS = 600;

type Bank = { context: AudioContext; buffers: Map<SfxName, AudioBuffer> };

const bank: { current: Bank | null } = { current: null };
const music: { wanted: MusicName | null; playing: MusicName | null; element: HTMLAudioElement | null } = {
  wanted: null,
  playing: null,
  element: null,
};

const url = (name: string) => `./assets/audio/${name}.mp3`;

const load = async (context: AudioContext, name: SfxName): Promise<[SfxName, AudioBuffer]> => {
  const response = await fetch(url(name));
  return [name, await context.decodeAudioData(await response.arrayBuffer())];
};

/**
 * Decoding happens while the game loads, on a context that starts suspended. The first tap then
 * only has to resume it, which keeps that tap instant on a slow phone.
 */
export const preloadAudio = () => {
  if (bank.current) return;
  const context = new AudioContext();
  const buffers = new Map<SfxName, AudioBuffer>();
  bank.current = { context, buffers };
  SFX.forEach((name) => {
    load(context, name)
      .then(([key, buffer]) => buffers.set(key, buffer))
      .catch(() => undefined);
  });
};

export const playSfx = (name: SfxName, volume = 1) => {
  const active = bank.current;
  const buffer = active?.buffers.get(name);
  if (!active || !buffer || active.context.state !== "running") return;
  const source = active.context.createBufferSource();
  const gain = active.context.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain).connect(active.context.destination);
  source.start();
};

const fade = (element: HTMLAudioElement, to: number, then?: () => void) => {
  const from = element.volume;
  const started = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - started) / FADE_MS);
    element.volume = from + (to - from) * t;
    if (t < 1) return void setTimeout(step, 50);
    then?.();
  };
  step();
};

const startWanted = () => {
  const { wanted, playing, element } = music;
  if (wanted === playing) return;
  if (element) fade(element, 0, () => element.pause());
  music.playing = wanted;
  music.element = null;
  if (!wanted) return;
  const next = new Audio(url(wanted));
  next.loop = true;
  next.volume = 0;
  music.element = next;
  next
    .play()
    .then(() => fade(next, MUSIC_VOLUME))
    .catch(() => {
      // Not allowed yet (no gesture): the next unlock will try again.
      music.playing = null;
      music.element = null;
    });
};

/** Music is streamed, not decoded up front, so it never delays the first screen. */
export const playMusic = (name: MusicName | null) => {
  music.wanted = name;
  startWanted();
};

/** Browsers only let sound start from a gesture. */
export const unlockAudio = () => {
  const context = bank.current?.context;
  if (context?.state === "suspended") void context.resume();
  startWanted();
};
