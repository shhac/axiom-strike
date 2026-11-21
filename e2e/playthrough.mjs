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
      const small = [...document.querySelectorAll("button")]
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
    const tryFor = (target, max) => solve(values, s.level.ops, target, { maxTiles: max, exclude: used });
    const planFor = (kind, enemy, answer) => ({
      aim: `${kind}-${enemy.id}`,
      kind,
      lethal: kind === "strike" && strikeDamage[answer.tiles.length] >= enemy.hp,
      tiles: answer.tiles.map((i) => s.hand[i].id),
      ops: answer.ops,
      multi: s.level.ops.length > 1,
      wave: s.wave,
      n: alive.length,
    });
    const landing = parries && alive.find((e) => e.intent.turns === 1 && e.intent.remaining > 0);
    const parry = landing && tryFor(landing.intent.damage, 2);
    if (parry) return planFor("parry", landing, parry);
    for (const e of alive) {
      const a = tryFor(e.weakness, 3);
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

const endTurn = async (page, shotOnce) => {
  await tap(page, "[data-action=end-turn]");
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
  const showedDamage = await appears(page, "#fx .float-damage");
  await shotOnce(`fx_${key}`);
  const celebrated =
    !plan.lethal || ((await appears(page, "#fx .float-ko")) && (await appears(page, "#fx .burst-star")));
  if (plan.lethal) await shotOnce("ko");
  await idle(page);
  return { showedDamage, celebrated };
};

/** Plays until the battle ends, or until `until` says to stop. Counts casts and keeps any that showed no damage number. */
const NEW_TALLY = { turns: 0, casts: 0, silentCasts: [], flatDefeats: 0, calls: { right: 0, wrong: 0, silent: 0 } };

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
  const { showedDamage, celebrated } = await castMove(page, plan, shotOnce);
  return playTurns(page, shotOnce, options, {
    ...tally,
    turns: tally.turns + 1,
    casts: tally.casts + 1,
    silentCasts: showedDamage ? tally.silentCasts : [...tally.silentCasts, plan],
    flatDefeats: tally.flatDefeats + (celebrated ? 0 : 1),
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
const withPage = async (run) => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 360 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const result = await run(page);
  await context.close();
  return result;
};

const results = [];
for (const run of levelRuns) {
  const result = await withPage((page) =>
    playLevel(page, run.name, (problems, shot) => openFromTitle(page, base + run.query, run.level, problems, shot)),
  );
  results.push({ name: run.name, ...result });
}
// The developer shortcut: straight into a battle from the address bar, with no intro.
results.push({
  name: "direct-link",
  // Not timed: skipping the title means the first tap also has to wake the sound system.
  ...(await withPage((page) =>
    playLevel(page, "direct", () => page.goto(`${base}?level=add_2&seed=9`), { timed: false }),
  )),
});
results.push({ name: "journey", ...(await withPage(journey)) });
await browser.close();

const problems = results.flatMap((result) => result.problems.map((problem) => `${result.name}: ${problem}`));
const rightCalls = results.reduce((sum, result) => sum + (result.outcome?.calls.right ?? 0), 0);
if (rightCalls === 0) problems.push("no Impossible call was ever right, so its reward was never seen");
console.log(JSON.stringify(results, null, 1));
if (problems.length) {
  console.error("FAILED\n" + problems.join("\n"));
  process.exit(1);
}
console.log("OK");
