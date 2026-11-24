// Plays the game through the real UI with the solver choosing moves, on an emulated Galaxy S21 in
// landscape with the CPU slowed 4x. Reports frame times and layout problems, and walks the
// screens around the battles: intro scenes, campfire, items, pause and settings.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:5199/";
const shotDir = process.env.SHOT_DIR ?? "";
// These start at the title screen and pick their level on the map, as a player would.
const levelRuns = [
  { name: "addition-1", level: "add_1", query: "?seed=7" },
  { name: "subtraction-1", level: "sub_1", query: "?seed=11" },
  { name: "multiplication-1", level: "mul_1", query: "?seed=5" },
  { name: "division-1", level: "div_1", query: "?seed=3" },
];

const DIRECT_RUNS = [
  ["add_2&seed=9", "add_3&seed=4"],
  ["sub_4&seed=2", "div_5&seed=1"],
  ["big_1&seed=6", "frac_3&seed=8"],
];

const MAX_TURNS = 200;
const MIN_TOUCH = 48;

/** Taps are ignored while the curtain between screens is moving, so wait for it to clear first. */
const tap = async (page, selector) => {
  await page.waitForFunction(() => !document.querySelector(".curtain"), null, { timeout: 5000 });
  await page.locator(selector).first().click({ force: true });
};

const appears = (page, selector, timeout = 1500) =>
  page
    .waitForSelector(selector, { timeout })
    .then(() => true)
    .catch(() => false);

const onScreen = (page, name) =>
  page.waitForFunction((wanted) => window.__axiom?.screen() === wanted, name, { timeout: 15000 });

const idle = (page) =>
  page.waitForFunction(() => window.__axiom?.screen() === "battle" && !window.__axiom.busy(), null, {
    timeout: 15000,
  });

const readSave = (page) => page.evaluate(() => window.__axiom.save());
const readState = (page) => page.evaluate(() => window.__axiom.state());

const watchErrors = (page) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
};

const screenshots = (page, prefix) => {
  const taken = new Set();
  const shot = async (name) => shotDir && page.screenshot({ path: `${shotDir}/${prefix}_${name}.png` });
  const shotOnce = async (name) => {
    if (taken.has(name)) return;
    taken.add(name);
    await shot(name);
  };
  return { shot, shotOnce };
};

/** Visible buttons smaller than a fingertip, and whether the page scrolls: checked on every screen. */
const layoutProblems = (page, where) =>
  page.evaluate(
    ({ where, min }) => {
      // A spent tile is drawn smaller on purpose and cannot be tapped, so only live buttons count.
      const small = [...document.querySelectorAll("button:not(:disabled)")]
        .map((b) => ({ label: b.getAttribute("aria-label") ?? b.textContent, box: b.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (Math.round(box.width) < min || Math.round(box.height) < min))
        .map(
          ({ label, box }) => `${where}: small button "${label}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      const root = document.documentElement;
      const overflow =
        root.scrollWidth > innerWidth || root.scrollHeight > innerHeight ? [`${where}: page overflows`] : [];
      return [...small, ...overflow];
    },
    { where, min: MIN_TOUCH },
  );

/** Lets a screen settle, keeps a picture of it and checks its layout, so no screen gets one without the other. */
const checkScreen = async (page, problems, shot, { name, where = name, settleMs }) => {
  await page.waitForTimeout(settleMs);
  await shot(name);
  problems.push(...(await layoutProblems(page, where)));
};

/** Taps through an intro scene, checking it once on the way. Returns how many beats were shown. */
const passIntro = async (page, problems, shot) => {
  await onScreen(page, "intro");
  await checkScreen(page, problems, shot, { name: "intro", settleMs: 400 });
  const step = async (beats) => {
    await page.waitForFunction(() => !document.querySelector(".curtain"));
    if ((await page.evaluate(() => window.__axiom.screen())) !== "intro") return beats;
    await tap(page, "[data-screen=intro]");
    await page.waitForTimeout(150);
    return step(beats + 1);
  };
  return step(0);
};

const openFromTitle = async (page, url, level, problems, shot) => {
  await page.goto(url);
  await checkScreen(page, problems, shot, { name: "title", settleMs: 1500 });
  await tap(page, "[data-action=play]");
  await onScreen(page, "map");
  await checkScreen(page, problems, shot, { name: "map", settleMs: 500 });
  await tap(page, `[data-level=${level}]`);
  const beats = await passIntro(page, problems, shot);
  if (beats < 3) problems.push(`intro for ${level}: only ${beats} beats shown`);
};

const startPerfSampling = (page) =>
  page.evaluate(() => {
    const stamps = [performance.now()];
    const tick = (now) => {
      stamps.push(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => longTasks.push(Math.round(e.duration)))).observe(
      { entryTypes: ["longtask"] },
    );
    window.__perf = { stamps, longTasks };
  });

const readPerf = (page) =>
  page.evaluate(() => {
    const { stamps, longTasks } = window.__perf;
    const f = stamps
      .slice(1)
      .map((stamp, i) => stamp - stamps[i])
      .sort((a, b) => a - b);
    return {
      frames: f.length,
      p50: f[Math.floor(f.length * 0.5)],
      p95: f[Math.floor(f.length * 0.95)],
      p99: f[Math.floor(f.length * 0.99)],
      max: f[f.length - 1],
      longTasks,
    };
  });

/** Runs in the page: parry what lands this turn, else strike the first enemy with an exact answer. */
const planMove = (page, { parries = true } = {}) =>
  page.evaluate((parries) => {
    const { state, solve, strikeDamage } = window.__axiom;
    const s = state();
    if (s.phase !== "player") return { done: s.phase, stars: s.stars, hp: s.heroHp };
    const alive = s.enemies.filter((e) => e.hp > 0);
    const values = s.hand.map((t) => t.value);
    const used = s.hand.flatMap((t, i) => (t.used ? [i] : []));
    // A monster that hates plus has to be struck without it; blocks are never restricted.
    const signs = (enemy, kind) =>
      kind === "strike" && enemy.quirk === "noPlus" ? s.level.ops.filter((op) => op !== "+") : s.level.ops;
    const tryFor = (enemy, kind, target, max) =>
      solve(values, signs(enemy, kind), target, { maxTiles: max, exclude: used, grain: s.level.grain });
    // A helmet soaks up a two-number sum (CLANG, no damage); three numbers knock it off and hurt.
    const clangs = (kind, enemy, answer) => kind === "strike" && enemy.quirk === "helmet" && answer.tiles.length < 3;
    const planFor = (kind, enemy, answer) => ({
      aim: `${kind}-${enemy.id}`,
      kind,
      enemy: enemy.id,
      clangs: clangs(kind, enemy, answer),
      lethal: kind === "strike" && !clangs(kind, enemy, answer) && strikeDamage[answer.tiles.length] >= enemy.hp,
      tiles: answer.tiles.map((i) => s.hand[i].id),
      ops: answer.ops,
      multi: s.level.ops.length > 1,
      wave: s.wave,
      n: alive.length,
    });
    const landing = parries && alive.find((e) => e.intent.turns === 1 && e.intent.remaining > 0);
    const parry = landing && tryFor(landing, "parry", landing.intent.damage, 2);
    if (parry) return planFor("parry", landing, parry);
    for (const e of alive) {
      const a = tryFor(e, "strike", e.weakness, 3);
      if (a) return planFor("strike", e, a);
    }
    return { end: true, canCall: !s.called };
  }, parries);

/** Calls "Impossible!" and reports whether the game agreed: "right", "wrong", or "silent" if it said nothing. */
const callImpossible = async (page, shotOnce) => {
  const before = (await readState(page)).hand.map((tile) => tile.id);
  await tap(page, "[data-action=impossible]");
  const answered = await appears(page, "#fx .float-good, .toast");
  await shotOnce("call");
  await idle(page);
  if (!answered) return "silent";
  // A right call trades the leftover tiles for new ones; a wrong one leaves the hand as it was.
  const { hand } = await readState(page);
  return hand.some((tile) => !before.includes(tile.id)) ? "right" : "wrong";
};

/** Pass only appears once an Impossible call has been wrong this turn, and takes a moment to arm. */
const END_TURN_ARMS_MS = 800;

const endTurn = async (page, shotOnce) => {
  // A right call deals new numbers and leaves Impossible in place, so it can take more than one.
  for (const _ of [1, 2, 3, 4]) {
    if ((await page.locator("[data-action=pass]").count()) > 0) break;
    await tap(page, "[data-action=impossible]");
    await idle(page);
  }
  await page.waitForTimeout(END_TURN_ARMS_MS);
  await tap(page, "[data-action=pass]");
  await page.waitForTimeout(250);
  await shotOnce("attack");
  await idle(page);
};

/** Returns true if the cast put a damage number on screen (expected for every exact strike). */
const castMove = async (page, plan, shotOnce) => {
  await tap(page, `[data-aim="${plan.aim}"]`);
  for (const [t, tileId] of plan.tiles.entries()) {
    if (t > 0 && plan.multi) await tap(page, `[data-op="${plan.ops[t - 1]}"]`);
    await tap(page, `[data-tile="${tileId}"]`);
  }
  const key = `w${plan.wave}n${plan.n}${plan.kind}t${plan.tiles.length}`;
  await shotOnce(`eq_${key}`);
  await tap(page, "[data-action=cast]");
  const showedDamage = await appears(page, plan.clangs ? "#fx .float-ko" : "#fx .float-damage");
  await shotOnce(`fx_${key}`);
  const celebrated =
    !plan.lethal || ((await appears(page, "#fx .float-ko")) && (await appears(page, "#fx .burst-star")));
  if (plan.lethal) await shotOnce("ko");
  await idle(page);
  // A monster that took a hit and survived has to look it.
  const survivedAHit = plan.kind === "strike" && !plan.lethal && !plan.clangs;
  const looksHurt = !survivedAHit || (await page.locator(`[data-enemy="${plan.enemy}"].is-hurt`).count()) > 0;
  if (survivedAHit) await shotOnce("hurt");
  return { showedDamage, celebrated, looksHurt };
};

/** Plays until the battle ends, or until `until` says to stop. Counts casts and keeps any that showed no damage number. */
const NEW_TALLY = {
  turns: 0,
  casts: 0,
  silentCasts: [],
  flatDefeats: 0,
  unmarkedHits: 0,
  calls: { right: 0, wrong: 0, silent: 0 },
};

const playTurns = async (page, shotOnce, options = {}, tally = NEW_TALLY) => {
  if (tally.turns >= MAX_TURNS) return { ...tally, timeout: true };
  if (options.until && (await options.until())) return { ...tally, stopped: true };
  const plan = await planMove(page, options);
  if (plan.done) return { ...tally, plan };
  // Out of answers: say so first, as a player would, and only then give the turn away.
  if (plan.end && plan.canCall && !options.neverCalls) {
    const verdict = await callImpossible(page, shotOnce);
    const calls = { ...tally.calls, [verdict]: tally.calls[verdict] + 1 };
    return playTurns(page, shotOnce, options, { ...tally, turns: tally.turns + 1, calls });
  }
  if (plan.end) {
    await endTurn(page, shotOnce);
    return playTurns(page, shotOnce, options, { ...tally, turns: tally.turns + 1 });
  }
  const { showedDamage, celebrated, looksHurt } = await castMove(page, plan, shotOnce);
  return playTurns(page, shotOnce, options, {
    ...tally,
    turns: tally.turns + 1,
    casts: tally.casts + 1,
    silentCasts: showedDamage ? tally.silentCasts : [...tally.silentCasts, plan],
    flatDefeats: tally.flatDefeats + (celebrated ? 0 : 1),
    unmarkedHits: tally.unmarkedHits + (looksHurt ? 0 : 1),
  });
};

/** A whole level, measured: frame times and stalls while playing, layout once the hand is dealt. */
const playLevel = async (page, prefix, open, { timed = true } = {}) => {
  const errors = watchErrors(page);
  const problems = [];
  const { shot, shotOnce } = screenshots(page, prefix);
  await open(problems, shot);
  if (!(await appears(page, "[data-say=enemy]", 5000))) problems.push("no monster spoke as the wave arrived");
  await shot("taunt");
  await idle(page);
  // Tiles scale in as they are dealt, so sizes are only meaningful once that has finished.
  await page.waitForTimeout(700);
  problems.push(...(await layoutProblems(page, "battle")));
  // Sampling starts once the first hand is on screen: this measures play, not page load.
  await startPerfSampling(page);
  const outcome = await playTurns(page, shotOnce);
  await page.waitForTimeout(900);
  await shot("z_result");
  problems.push(...(await layoutProblems(page, "result")));
  const perf = await readPerf(page);

  if (outcome.timeout) problems.push("did not finish");
  if (outcome.plan?.done !== "won") problems.push(`ended ${outcome.plan?.done ?? "unfinished"}`);
  if (!(outcome.casts > 0)) problems.push("no casts were made");
  if (outcome.silentCasts.length > 0) {
    problems.push(
      `${outcome.silentCasts.length} casts showed no damage number: ${JSON.stringify(outcome.silentCasts)}`,
    );
  }
  if (outcome.flatDefeats > 0) problems.push(`${outcome.flatDefeats} defeats had no KO burst`);
  if (outcome.unmarkedHits > 0) problems.push(`${outcome.unmarkedHits} monsters survived a hit without looking hurt`);
  if (outcome.calls.silent > 0) problems.push(`${outcome.calls.silent} Impossible calls got no answer`);
  if (errors.length) problems.push(`console errors ${JSON.stringify(errors)}`);
  if (!(perf.frames > 100)) problems.push(`only ${perf.frames} frames sampled`);
  // Taking full-resolution screenshots stalls the page, so timings only count on runs without them.
  if (timed && !shotDir && !(perf.p95 < 20)) problems.push(`p95 frame ${perf.p95}ms`);
  if (timed && !shotDir && perf.longTasks.some((ms) => ms > 100)) problems.push(`long tasks ${perf.longTasks}`);
  return { outcome, perf, problems };
};

const expectThat = (problems, ok, message) => {
  if (!ok) problems.push(message);
};

const winFirstLevel = async ({ page, problems, shot, shotOnce }) => {
  await openFromTitle(page, `${base}?seed=7`, "add_1", problems, shot);
  await idle(page);
  const first = await playTurns(page, shotOnce);
  expectThat(problems, first.plan?.done === "won", `first level ended ${first.plan?.done}`);
  await page.waitForTimeout(900);
  expectThat(problems, (await readSave(page)).stories === 1, "a win did not light the campfire");
  expectThat(
    problems,
    await appears(page, "[data-result=won] [data-prizes]"),
    "the victory panel does not show the story prize",
  );
};

const readAtCampfire = async ({ page, problems, shot }) => {
  await tap(page, "[data-action=campfire]");
  await onScreen(page, "campfire");
  await checkScreen(page, problems, shot, { name: "fire_read", where: "campfire passage", settleMs: 400 });
  expectThat(problems, await appears(page, "[data-phase=read] [data-prizes]"), "the story does not show its prize");
  await tap(page, "[data-action=read-done]");
  await checkScreen(page, problems, shot, { name: "fire_ask", where: "campfire question", settleMs: 300 });
  await tap(page, "[data-action=read-again]");
  await tap(page, "[data-action=read-done]");
  await tap(page, "[data-answer=correct]");
  await page.waitForSelector("[data-reward='1-1']", { timeout: 3000 }).catch(() => problems.push("no reward shown"));
  await checkScreen(page, problems, shot, { name: "fire_done", where: "campfire reward", settleMs: 500 });
  const rewarded = await readSave(page);
  expectThat(
    problems,
    rewarded.potions === 1 && rewarded.scrolls === 1 && rewarded.stories === 0 && rewarded.read.length === 1,
    `campfire save wrong: ${JSON.stringify(rewarded)}`,
  );
};

const useCarriedItems = async ({ page, problems, shot, shotOnce }) => {
  await tap(page, "[data-action=map]");
  await onScreen(page, "map");
  // Left alone, the map points at the levels that can be played; a touch clears it.
  expectThat(problems, (await page.locator("[data-nudge]").count()) === 0, "the map nudged straight away");
  // The first level was just beaten, so the hero walks on to the one it opened and stays there.
  expectThat(
    problems,
    await appears(page, "[data-map-hero=add_2]", 4000),
    "the map hero did not walk to the new level",
  );
  await shot("map_hero");
  const arrived = await page
    .waitForFunction(() => window.__axiom.save().heroAt === "add_2", null, { timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  expectThat(problems, arrived, "the map hero's new spot was not saved");
  expectThat(problems, await appears(page, "[data-nudge]", 17000), "the idle map never pointed at a level");
  await shot("map_nudge");
  await page.locator("[data-screen=map]").click({ position: { x: 400, y: 20 }, force: true });
  expectThat(problems, (await page.locator("[data-nudge]").count()) === 0, "a touch did not clear the map nudge");
  await tap(page, "[data-level=add_2]");
  await idle(page);
  const opening = await readState(page);
  expectThat(problems, opening.hints === 4 && opening.potions === 1, "items were not carried into the battle");

  // Take a hit on purpose so there is something to heal.
  const takeHit = async (turnsLeft) => {
    if ((await readState(page)).heroHp < 100 || turnsLeft === 0) return;
    await endTurn(page, shotOnce);
    return takeHit(turnsLeft - 1);
  };
  await takeHit(6);
  const before = await readState(page);
  await checkScreen(page, problems, shot, { name: "potion_ready", where: "battle with items", settleMs: 400 });
  await tap(page, "[data-action=potion]");
  await page.waitForTimeout(250);
  await shot("potion_used");
  await idle(page);
  const after = await readState(page);
  expectThat(problems, after.heroHp > before.heroHp && after.potions === 0, "the potion did not heal");
  expectThat(problems, (await readSave(page)).potions === 0, "the potion stayed in the bag");

  await tap(page, "[data-action=hint]");
  await tap(page, "[data-action=hint]");
  await tap(page, "[data-action=hint]");
  expectThat(problems, (await readSave(page)).scrolls === 1, "free hints used up a carried scroll");
  await tap(page, "[data-action=hint]");
  expectThat(problems, (await readSave(page)).scrolls === 0, "the carried scroll was not used up");
};

const changeSettingsAndLeave = async ({ page, problems, shot }) => {
  await tap(page, "[data-action=pause]");
  await page.waitForSelector("[data-screen=settings]");
  await checkScreen(page, problems, shot, { name: "pause", settleMs: 400 });
  await tap(page, "[data-setting=music]");
  await tap(page, "[data-setting=difficulty-gentle]");
  const tuned = (await readSave(page)).settings;
  expectThat(problems, tuned.music === false && tuned.difficulty === "gentle", "settings were not saved");
  await tap(page, "[data-action=leave]");
  await onScreen(page, "map");
};

/** Leaving mid-battle must not strand the next one. */
const comeBackOnGentle = async ({ page, problems }) => {
  await tap(page, "[data-level=add_2]");
  await idle(page);
  const gentle = await readState(page);
  expectThat(problems, gentle.level.tileMax === 9, `gentle setting not applied (tile max ${gentle.level.tileMax})`);
  await tap(page, "[data-action=pause]");
  await tap(page, "[data-action=leave]");
  await onScreen(page, "map");
};

const reloadAndStartOver = async ({ page, problems, shot }) => {
  await page.reload();
  await page.waitForTimeout(1200);
  const reloaded = await readSave(page);
  expectThat(problems, reloaded.stars.add_1 >= 1 && reloaded.settings.music === false, "progress did not persist");
  await tap(page, "[data-action=settings]");
  await page.waitForTimeout(300);
  await tap(page, "[data-action=reset]");
  await checkScreen(page, problems, shot, { name: "reset_confirm", where: "reset confirm", settleMs: 200 });
  await tap(page, "[data-action=reset]");
  await onScreen(page, "title");
  const wiped = await readSave(page);
  expectThat(
    problems,
    Object.keys(wiped.stars).length === 0 && wiped.seen.length === 0 && wiped.settings.music === false,
    "starting over did not wipe progress and keep settings",
  );
};

/** Win a level, read at the campfire, carry the reward into the next battle, drink it, and leave. */
const JOURNEY = [
  winFirstLevel,
  readAtCampfire,
  useCarriedItems,
  changeSettingsAndLeave,
  comeBackOnGentle,
  reloadAndStartOver,
];

/** A save with stars to spend: a land finished, its second chest ready, and some far-land progress. */
const RICH_SAVE = {
  stars: { add_1: 3, add_2: 3, add_3: 3, add_4: 3, add_5: 3, sub_1: 3, sub_2: 3, mul_1: 3 },
  chests: { add: 1 },
  pet: "add",
  beaten: { add_minion: 12, add_boss: 1 },
  heroAt: "add_5",
  seen: ["add", "sub", "mul", "div", "big", "frac", "add_boss"],
};

/** The numbers on the tiles still free, with the element index of each, read off the screen. */
const freeTiles = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-tile]")].flatMap((tile, index) =>
      tile.disabled ? [] : [{ index, value: Number(tile.getAttribute("aria-label").replace("Number ", "")) }],
    ),
  );

/** Builds a two-tile sum for `target` on a sum panel in an addition land, and presses its big button. */
const makeOnPanel = async (page, target) => {
  const tiles = await freeTiles(page);
  const pair = tiles.flatMap((a) =>
    tiles.filter((b) => b.index > a.index && a.value + b.value === target).map((b) => [a, b]),
  )[0];
  if (!pair) return false;
  for (const { index } of pair) await page.locator("[data-tile]").nth(index).tap();
  await tap(page, "[data-action=cast]");
  return true;
};

const openAChest = async ({ page, problems, shot }) => {
  await page.goto(base);
  await checkScreen(page, problems, shot, { name: "title_streak", where: "title", settleMs: 1500 });
  await tap(page, "[data-action=play]");
  await onScreen(page, "map");
  await checkScreen(page, problems, shot, { name: "map_rich", where: "map with chests", settleMs: 600 });
  await tap(page, "[data-chest=mul]");
  expectThat(problems, await appears(page, "[data-hint]"), "a chest that is not ready gave no hint");
  await tap(page, "[data-cave=add]");
  await page.waitForTimeout(300);
  expectThat(problems, (await page.evaluate(() => window.__axiom.screen())) === "map", "a locked cave opened");
  await tap(page, "[data-chest=add]");
  await onScreen(page, "lock");
  await checkScreen(page, problems, shot, { name: "lock", where: "chest lock", settleMs: 600 });
  for (const dial of [0, 1, 2]) {
    await tap(page, `[data-dial="${dial}"]`);
    const target = Number(await page.locator(`[data-dial="${dial}"] .num`).getAttribute("aria-label"));
    // A pair meant for another dial may have been used; new numbers always bring one back.
    if (!(await makeOnPanel(page, target))) {
      await tap(page, "[data-action=redeal]");
      expectThat(problems, await makeOnPanel(page, target), `no pair for lock ${dial} even after new numbers`);
    }
    await page.waitForTimeout(250);
  }
  expectThat(
    problems,
    await appears(page, "[data-result=chest] [data-prize=key]", 3000),
    "the chest did not open on a key",
  );
  await checkScreen(page, problems, shot, { name: "lock_open", where: "opened chest", settleMs: 500 });
  const opened = await readSave(page);
  expectThat(
    problems,
    opened.chests.add === 2 && opened.potions === 1 && opened.scrolls === 1,
    `chest save wrong: ${JSON.stringify([opened.chests, opened.potions, opened.scrolls])}`,
  );
  await tap(page, "[data-action=map]");
  await onScreen(page, "map");
};

const clearACave = async ({ page, problems, shot }) => {
  await tap(page, "[data-cave=add]");
  await onScreen(page, "cave");
  await checkScreen(page, problems, shot, { name: "cave", where: "cave riddle", settleMs: 500 });
  for (const round of [0, 1, 2, 3, 4, 5, 6, 7]) {
    await page.waitForSelector(`[data-riddle="${round}"]`);
    const { values, target } = await page.evaluate(() => ({
      values: [...document.querySelectorAll(".cave-tiles .tile .num")].map((n) => Number(n.getAttribute("aria-label"))),
      target: Number(document.querySelector(".cave-target").getAttribute("aria-label")),
    }));
    const possible = await page.evaluate(
      ({ values, target }) => window.__axiom.solve(values, ["+"], target, { maxTiles: 5 }) !== null,
      { values, target },
    );
    await tap(page, `[data-answer=${possible ? "yes" : "no"}]`);
    expectThat(
      problems,
      await appears(page, "[data-verdict=right]"),
      `cave riddle ${round} marked a right answer wrong`,
    );
    if (round === 0) await shot("cave_verdict");
    await tap(page, "[data-action=next]");
  }
  expectThat(problems, await appears(page, "[data-result=cave]", 3000), "the cave never finished");
  await checkScreen(page, problems, shot, { name: "cave_done", where: "cave result", settleMs: 800 });
  const cleared = await readSave(page);
  expectThat(
    problems,
    cleared.stars.cave_add === 3 && cleared.potions === 2,
    `cave save wrong: ${JSON.stringify(cleared.stars)}`,
  );
  await tap(page, "[data-action=map]");
  await onScreen(page, "map");
};

const visitFarLands = async ({ page, problems, shot }) => {
  await tap(page, "[data-action=page]");
  await checkScreen(page, problems, shot, { name: "map_far", where: "far lands map", settleMs: 500 });
  expectThat(
    problems,
    (await page.locator("[data-land-lock=frac]").count()) === 1,
    "fractions was not locked at 24 stars",
  );
  expectThat(
    problems,
    (await page.locator("[data-land-lock=big]").count()) === 0,
    "big numbers was not open at 24 stars",
  );
  await tap(page, "[data-action=page]");
};

const useTheCamp = async ({ page, problems, shot }) => {
  await tap(page, "[data-action=campfire]");
  await onScreen(page, "campfire");
  await checkScreen(page, problems, shot, { name: "camp", where: "camp", settleMs: 500 });
  await tap(page, "[data-action=pet]");
  expectThat(problems, await appears(page, ".camp-pet-says"), "the pet said nothing when tapped");
  expectThat(problems, await appears(page, "[data-pet=cheer]"), "the pet did not hop when tapped");
  await checkScreen(page, problems, shot, { name: "camp_pet", where: "camp with the pet tapped", settleMs: 200 });

  await tap(page, "[data-camp=book]");
  await checkScreen(page, problems, shot, { name: "camp_book", where: "monster book", settleMs: 300 });
  expectThat(problems, (await page.locator(".book-page.is-gold").count()) === 1, "ten beaten did not gild a book page");
  await tap(page, "[data-action=camp]");

  await tap(page, "[data-camp=gear]");
  await checkScreen(page, problems, shot, { name: "camp_gear", where: "pets and tiles", settleMs: 300 });
  await tap(page, "[data-gear=pet-none]");
  expectThat(problems, (await readSave(page)).pet === null, "picking no pet did not change the save");
  expectThat(
    problems,
    (await page.locator("[data-action=pet]").count()) === 0,
    "the camp showed a pet with none picked",
  );
  await tap(page, "[data-gear=pet-add]");
  expectThat(problems, (await readSave(page)).pet === "add", "picking a won pet did not change the save");
  expectThat(
    problems,
    await page.locator("[data-gear=tiles-add]").isDisabled(),
    "a tile style was on offer before its chest was opened",
  );
  await tap(page, "[data-action=camp]");

  await tap(page, "[data-camp=words]");
  await checkScreen(page, problems, shot, { name: "camp_words", where: "word lab", settleMs: 300 });
  const scrollsBefore = (await readSave(page)).scrolls;
  for (const round of [0, 1, 2, 3, 4]) {
    await page.waitForSelector(`[data-phase=words][data-round="${round}"]`);
    await tap(page, "[data-answer=correct]");
  }
  expectThat(
    problems,
    await appears(page, "[data-phase=words-done] [data-prizes]", 3000),
    "a perfect word lab gave no prize",
  );
  expectThat(problems, (await readSave(page)).scrolls === scrollsBefore + 1, "the word lab prize was not saved");
  await tap(page, "[data-action=camp]");

  await tap(page, "[data-camp=practice]");
  await page.waitForSelector("[data-phase=practice-ready]");
  await checkScreen(page, problems, shot, {
    name: "camp_practice_ready",
    where: "target practice start",
    settleMs: 900,
  });
  await tap(page, "[data-action=start]");
  const target = Number(await page.locator(".cast-number").getAttribute("aria-label"));
  expectThat(problems, await makeOnPanel(page, target), "target practice dealt no pair for its number");
  expectThat(
    problems,
    await appears(page, "[data-score='1'], [data-score='2']"),
    "a hit in target practice did not score",
  );
  await checkScreen(page, problems, shot, { name: "camp_practice", where: "target practice", settleMs: 900 });
  await tap(page, "[data-action=camp]");
  await page.waitForSelector("[data-phase=hub]");
};

const EXTRAS = [openAChest, clearACave, visitFarLands, useTheCamp];

/** Everything around the battles that needs stars first: chests, caves, the far lands and the camp. */
const extras = async (page) => {
  const errors = watchErrors(page);
  const problems = [];
  const stage = { page, problems, ...screenshots(page, "extras") };
  for (const leg of EXTRAS) await leg(stage);
  if (errors.length) problems.push(`console errors ${JSON.stringify(errors)}`);
  return { problems };
};

/** The same screens on a 4:3 tablet, where the layout is only 40rem wide: nothing may overflow or shrink below a fingertip. */
const tablet = async (page) => {
  const errors = watchErrors(page);
  const problems = [];
  const { shot } = screenshots(page, "tablet");
  await page.goto(base);
  await checkScreen(page, problems, shot, { name: "title", where: "tablet title", settleMs: 1500 });
  await tap(page, "[data-action=play]");
  await onScreen(page, "map");
  await checkScreen(page, problems, shot, { name: "map", where: "tablet map", settleMs: 600 });
  await tap(page, "[data-action=page]");
  await checkScreen(page, problems, shot, { name: "map_far", where: "tablet far map", settleMs: 500 });
  await tap(page, "[data-action=page]");
  await tap(page, "[data-chest=add]");
  await onScreen(page, "lock");
  await checkScreen(page, problems, shot, { name: "lock", where: "tablet chest lock", settleMs: 600 });
  await tap(page, "[data-action=map]");
  await onScreen(page, "map");
  await tap(page, "[data-action=campfire]");
  await onScreen(page, "campfire");
  await checkScreen(page, problems, shot, { name: "camp", where: "tablet camp", settleMs: 500 });
  for (const activity of ["book", "gear", "words"]) {
    await tap(page, `[data-camp=${activity}]`);
    await checkScreen(page, problems, shot, { name: `camp_${activity}`, where: `tablet ${activity}`, settleMs: 300 });
    await tap(page, "[data-action=camp]");
  }
  // The level with the most signs is the tightest fit for the tiles.
  for (const level of ["div_3", "big_2", "frac_3"]) {
    await page.goto(`${base}?level=${level}&seed=4`);
    await page.waitForFunction(() => window.__axiom?.state()?.hand.length > 0 && !window.__axiom.busy(), null, {
      timeout: 20000,
    });
    await checkScreen(page, problems, shot, {
      name: `battle_${level}`,
      where: `tablet battle ${level}`,
      settleMs: 900,
    });
  }
  if (errors.length) problems.push(`console errors ${JSON.stringify(errors)}`);
  return { problems };
};

const journey = async (page) => {
  const errors = watchErrors(page);
  const problems = [];
  const stage = { page, problems, ...screenshots(page, "journey") };
  for (const leg of JOURNEY) await leg(stage);
  if (errors.length) problems.push(`console errors ${JSON.stringify(errors)}`);
  return { problems };
};

const browser = await chromium.launch();
if (shotDir) mkdirSync(shotDir, { recursive: true });

/** Every run gets its own storage, so saved progress never leaks from one into the next. */
const PHONE = { width: 800, height: 360 };
const TABLET = { width: 1024, height: 768 };

const withPage = async (run, startingSave, viewport = PHONE) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  if (startingSave) {
    await context.addInitScript((stored) => {
      if (!localStorage.getItem("axiom-strike-save-v1")) localStorage.setItem("axiom-strike-save-v1", stored);
    }, JSON.stringify(startingSave));
  }
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const result = await run(page);
  await context.close();
  return result;
};

// `ONLY=extras` (or journey, levels, direct) runs one part, for working on that part.
const only = process.env.ONLY;
const wanted = (part) => !only || only === part;

const results = [];
for (const run of wanted("levels") ? levelRuns : []) {
  const result = await withPage((page) =>
    playLevel(page, run.name, (problems, shot) => openFromTitle(page, base + run.query, run.level, problems, shot)),
  );
  results.push({ name: run.name, ...result });
}
// The developer shortcut: straight into a battle from the address bar, with no intro. These cover
// what the first levels do not: helmets, a monster that hates plus, a boss, and the far lands.
// Not timed: skipping the title means the first tap also has to wake the sound system, and they
// run side by side.
const directRun = (query) =>
  withPage((page) =>
    playLevel(page, `direct-${query}`, () => page.goto(`${base}?level=${query}`), { timed: false }),
  ).then((result) => ({ name: `direct ${query}`, ...result }));
for (const pair of wanted("direct") ? DIRECT_RUNS : []) results.push(...(await Promise.all(pair.map(directRun))));
if (wanted("journey")) results.push({ name: "journey", ...(await withPage(journey)) });
if (wanted("tablet")) results.push({ name: "tablet", ...(await withPage(tablet, RICH_SAVE, TABLET)) });
if (wanted("extras")) results.push({ name: "extras", ...(await withPage(extras, RICH_SAVE)) });
await browser.close();

const problems = results.flatMap((result) => result.problems.map((problem) => `${result.name}: ${problem}`));
const rightCalls = results.reduce((sum, result) => sum + (result.outcome?.calls.right ?? 0), 0);
if (rightCalls === 0 && wanted("levels"))
  problems.push("no Impossible call was ever right, so its reward was never seen");
console.log(JSON.stringify(results, null, 1));
if (problems.length) {
  console.error("FAILED\n" + problems.join("\n"));
  process.exit(1);
}
console.log("OK");
