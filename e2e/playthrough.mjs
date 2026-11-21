// Plays whole battles through the real UI with the solver choosing moves, on an emulated
// Galaxy S21 in landscape with the CPU slowed 4x, and reports frame times and layout problems.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:5199/";
const shotDir = process.env.SHOT_DIR ?? "";
// Every run starts at the title screen and picks its level on the map, as a player would.
const runs = [
  { name: "addition-1", level: "add_1", query: "?seed=7" },
  { name: "subtraction-1", level: "sub_1", query: "?seed=11" },
  { name: "multiplication-1", level: "mul_1", query: "?seed=5" },
  { name: "division-1", level: "div_1", query: "?seed=3" },
];

const MAX_TURNS = 200;

const tap = (page, selector) => page.locator(selector).click({ force: true });

const idle = (page) => page.waitForFunction(() => window.__axiom && !window.__axiom.busy(), null, { timeout: 15000 });

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

const openLevel = async (page, url, level, shot) => {
  await page.goto(url);
  await page.waitForTimeout(1500);
  await shot("title");
  await tap(page, "[data-action=play]");
  await page.waitForTimeout(600);
  await shot("map");
  await tap(page, `[data-level=${level}]`);
  await idle(page);
  // Tiles scale in as they are dealt, so sizes are only meaningful once that has finished.
  await page.waitForTimeout(700);
};

const smallTouchTargets = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .map((b) => ({
        label: b.getAttribute("aria-label") ?? b.textContent,
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      }))
      .filter((b) => b.w < 48 || b.h < 48),
  );

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

const readLayout = (page) =>
  page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    vw: innerWidth,
    vh: innerHeight,
  }));

/** Runs in the page: parry what lands this turn, else strike the first enemy with an exact answer. */
const planMove = (page) =>
  page.evaluate(() => {
    const { state, solve } = window.__axiom;
    const s = state();
    if (s.phase !== "player") return { done: s.phase, stars: s.stars, hp: s.heroHp };
    const alive = s.enemies.filter((e) => e.hp > 0);
    const values = s.hand.map((t) => t.value);
    const used = s.hand.flatMap((t, i) => (t.used ? [i] : []));
    const tryFor = (target, max) => solve(values, s.level.ops, target, { maxTiles: max, exclude: used });
    const planFor = (kind, enemy, answer) => ({
      aim: `${kind}-${enemy.id}`,
      tiles: answer.tiles.map((i) => s.hand[i].id),
      ops: answer.ops,
      multi: s.level.ops.length > 1,
      wave: s.wave,
      n: alive.length,
    });
    const landing = alive.find((e) => e.intent.turns === 1 && e.intent.remaining > 0);
    const parry = landing && tryFor(landing.intent.damage, 2);
    if (parry) return planFor("parry", landing, parry);
    for (const e of alive) {
      const a = tryFor(e.weakness, 3);
      if (a) return planFor("strike", e, a);
    }
    return { end: true };
  });

const endTurn = async (page, shotOnce) => {
  await tap(page, "[data-action=end-turn]");
  await page.waitForTimeout(250);
  await shotOnce("attack");
  await idle(page);
};

const castMove = async (page, plan, shotOnce) => {
  await tap(page, `[data-aim="${plan.aim}"]`);
  for (const [t, tileId] of plan.tiles.entries()) {
    if (t > 0 && plan.multi) await tap(page, `[data-op="${plan.ops[t - 1]}"]`);
    await tap(page, `[data-tile="${tileId}"]`);
  }
  const key = `w${plan.wave}n${plan.n}${plan.aim.split("-")[0]}t${plan.tiles.length}`;
  await shotOnce(`eq_${key}`);
  await tap(page, "[data-action=cast]");
  await page.waitForTimeout(420);
  await shotOnce(`fx_${key}`);
  await idle(page);
};

const playTurns = async (page, shotOnce, turn = 0, casts = 0) => {
  if (turn >= MAX_TURNS) return { timeout: true };
  const plan = await planMove(page);
  if (plan.done) return { plan, casts };
  if (plan.end) {
    await endTurn(page, shotOnce);
    return playTurns(page, shotOnce, turn + 1, casts);
  }
  await castMove(page, plan, shotOnce);
  return playTurns(page, shotOnce, turn + 1, casts + 1);
};

const playLevel = async (page, url, prefix, level) => {
  const errors = watchErrors(page);
  const { shot, shotOnce } = screenshots(page, prefix);
  await openLevel(page, url, level, shot);
  const small = await smallTouchTargets(page);
  // Sampling starts once the first hand is on screen: this measures play, not page load.
  await startPerfSampling(page);
  const { plan, casts, timeout } = await playTurns(page, shotOnce);
  if (timeout) return { timeout: true, errors };
  await page.waitForTimeout(900);
  await shot("z_result");
  const perf = await readPerf(page);
  const layout = await readLayout(page);
  return { plan, casts, perf, layout, small, errors };
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 800, height: 360 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});
if (shotDir) mkdirSync(shotDir, { recursive: true });

const results = [];
for (const run of runs) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  results.push({ name: run.name, ...(await playLevel(page, base + run.query, run.name, run.level)) });
  await page.close();
}
await browser.close();

const problems = results.flatMap((r) => [
  ...(r.timeout ? [`${r.name}: did not finish`] : []),
  ...(r.plan?.done !== "won" ? [`${r.name}: ended ${r.plan?.done}`] : []),
  ...(r.errors?.length ? [`${r.name}: console errors ${JSON.stringify(r.errors)}`] : []),
  // Taking full-resolution screenshots stalls the page, so timings only count on runs without them.
  ...(!shotDir && r.perf?.p95 >= 20 ? [`${r.name}: p95 frame ${r.perf.p95.toFixed(1)}ms`] : []),
  ...(!shotDir && r.perf?.longTasks.some((ms) => ms > 100) ? [`${r.name}: long tasks ${r.perf.longTasks}`] : []),
  ...(r.layout && (r.layout.scrollW > r.layout.vw || r.layout.scrollH > r.layout.vh)
    ? [`${r.name}: page overflows`]
    : []),
  ...(r.small?.length ? [`${r.name}: small touch targets ${JSON.stringify(r.small)}`] : []),
]);
console.log(JSON.stringify(results, null, 1));
if (problems.length) {
  console.error("FAILED\n" + problems.join("\n"));
  process.exit(1);
}
console.log("OK");
