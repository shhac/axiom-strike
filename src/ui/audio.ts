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
  "potion",
  "page",
  "reward",
  "jingle_victory",
  "jingle_defeat",
  "jingle_wave",
] as const;

export type SfxName = (typeof SFX)[number];
export type MusicName = "music_title" | "music_battle" | "music_calm";

const MUSIC_VOLUME = 0.35;
const FADE_MS = 600;

type Bank = { context: AudioContext; buffers: Map<SfxName, AudioBuffer> };
type Track = { name: MusicName; element: HTMLAudioElement; gain: GainNode };

export type AudioPrefs = { music: boolean; sound: boolean };

const bank: { current: Bank | null } = { current: null };
const music: { wanted: MusicName | null; track: Track | null } = { wanted: null, track: null };
const prefs: AudioPrefs = { music: true, sound: true };

const url = (name: string) => `./assets/audio/${name}.mp3`;

const load = async (context: AudioContext, name: SfxName): Promise<[SfxName, AudioBuffer]> => {
  const response = await fetch(url(name));
  return [name, await context.decodeAudioData(await response.arrayBuffer())];
};

/**
 * Decoding happens while the game loads, on a context that starts suspended. The first tap then
 * only has to resume it, which keeps that tap instant on a slow phone.
 */
const preloadAudio = () => {
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
  if (!prefs.sound || !active || !buffer || active.context.state !== "running") return;
  const source = active.context.createBufferSource();
  const gain = active.context.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain).connect(active.context.destination);
  source.start();
};

const fadeTo = (context: AudioContext, gain: GainNode, level: number) => {
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
  gain.gain.linearRampToValueAtTime(level, context.currentTime + FADE_MS / 1000);
};

const stopTrack = (context: AudioContext, track: Track) => {
  fadeTo(context, track.gain, 0);
  setTimeout(() => {
    track.element.pause();
    track.gain.disconnect();
  }, FADE_MS);
};

/**
 * Music is streamed, not decoded up front, so it never delays the first screen. Its loudness is
 * set by a gain node because iOS ignores the volume of an audio element.
 */
const startTrack = (context: AudioContext, name: MusicName): Track => {
  const element = new Audio(url(name));
  element.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0;
  context.createMediaElementSource(element).connect(gain).connect(context.destination);
  return { name, element, gain };
};

const syncMusic = () => {
  const context = bank.current?.context;
  if (!context) return;
  const wanted = prefs.music && !document.hidden ? music.wanted : null;
  const current = music.track;
  if (current && current.name !== wanted) {
    stopTrack(context, current);
    music.track = null;
  }
  if (!wanted || context.state !== "running") return;
  const track = music.track ?? startTrack(context, wanted);
  music.track = track;
  track.element
    .play()
    .then(() => fadeTo(context, track.gain, MUSIC_VOLUME))
    .catch(() => {
      // Not allowed yet (no gesture): the next unlock will try again.
      if (music.track === track) music.track = null;
    });
};

export const playMusic = (name: MusicName | null) => {
  music.wanted = name;
  syncMusic();
};

export const setAudioPrefs = (next: AudioPrefs) => {
  Object.assign(prefs, next);
  syncMusic();
};

/** Browsers only let sound start from a gesture; iOS can also interrupt it for a call or alarm. */
const unlock = () => {
  const context = bank.current?.context;
  if (!context || document.hidden) return;
  if (context.state === "running") return syncMusic();
  void context.resume().then(syncMusic);
};

const onVisibility = () => {
  const context = bank.current?.context;
  if (!context) return;
  if (!document.hidden) return unlock();
  syncMusic();
  void context.suspend();
};

/** Listens on the whole page so every screen unlocks sound, and silences the game when hidden. */
export const installAudio = () => {
  preloadAudio();
  (["pointerdown", "touchend", "click", "keydown"] as const).forEach((type) =>
    document.addEventListener(type, unlock, { passive: true }),
  );
  document.addEventListener("visibilitychange", onVisibility);
};
