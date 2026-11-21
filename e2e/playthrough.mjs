// Plays a whole battle through the real UI with the solver choosing moves, on an emulated
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

const playLevel = async (page, url, prefix, level) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const shot = async (name) => shotDir && page.screenshot({ path: `${shotDir}/${prefix}_${name}.png` });
  await page.goto(url);
  await page.waitForTimeout(1500);
  await shot("title");
  await page.locator("[data-action=play]").click({ force: true });
  await page.waitForTimeout(600);
  await shot("map");
  await page.locator(`[data-level=${level}]`).click({ force: true });
  const idle = async () => {
    await page.waitForFunction(() => window.__axiom && !window.__axiom.busy(), null, { timeout: 15000 });
  };
  await idle();
  // Tiles scale in as they are dealt, so sizes are only meaningful once that has finished.
  await page.waitForTimeout(700);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .map((b) => ({
        label: b.getAttribute("aria-label") ?? b.textContent,
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      }))
      .filter((b) => b.w < 48 || b.h < 48),
  );
  // Sampling starts once the first hand is on screen: this measures play, not page load.
  await page.evaluate(() => {
    const frames = [];
    let last = performance.now();
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => longTasks.push(Math.round(e.duration)))).observe(
      { entryTypes: ["longtask"] },
    );
    window.__perf = { frames, longTasks };
  });
  const seen = new Set();
  let casts = 0;
  for (let i = 0; i < 200; i++) {
    const plan = await page.evaluate(() => {
      const { state, solve } = window.__axiom;
      const s = state();
      if (s.phase !== "player") return { done: s.phase, stars: s.stars, hp: s.heroHp };
      const alive = s.enemies.filter((e) => e.hp > 0);
      const values = s.hand.map((t) => t.value);
      const used = s.hand.flatMap((t, i) => (t.used ? [i] : []));
      const landing = alive.find((e) => e.intent.turns === 1 && e.intent.remaining > 0);
      const tryFor = (target, max) => solve(values, s.level.ops, target, { maxTiles: max, exclude: used });
      const parry = landing && tryFor(landing.intent.damage, 2);
      if (parry)
        return {
          aim: `parry-${landing.id}`,
          tiles: parry.tiles.map((i) => s.hand[i].id),
          ops: parry.ops,
          multi: s.level.ops.length > 1,
          wave: s.wave,
          n: alive.length,
        };
      for (const e of alive) {
        const a = tryFor(e.weakness, 3);
        if (a)
          return {
            aim: `strike-${e.id}`,
            tiles: a.tiles.map((i) => s.hand[i].id),
            ops: a.ops,
            multi: s.level.ops.length > 1,
            wave: s.wave,
            n: alive.length,
          };
      }
      return { end: true };
    });
    if (plan.done) {
      await page.waitForTimeout(900);
      await shot("z_result");
      const perf = await page.evaluate(() => {
        const f = [...window.__perf.frames].sort((a, b) => a - b);
        return {
          frames: f.length,
          p50: f[Math.floor(f.length * 0.5)],
          p95: f[Math.floor(f.length * 0.95)],
          p99: f[Math.floor(f.length * 0.99)],
          max: f[f.length - 1],
          longTasks: window.__perf.longTasks,
        };
      });
      const layout = await page.evaluate(() => {
        const vw = innerWidth,
          vh = innerHeight;
        return {
          scrollW: document.documentElement.scrollWidth,
          scrollH: document.documentElement.scrollHeight,
          vw,
          vh,
        };
      });
      return { plan, casts, perf, layout, small, errors };
    }
    if (plan.end) {
      await page.locator("[data-action=end-turn]").click({ force: true });
      await page.waitForTimeout(250);
      if (!seen.has("attack")) {
        seen.add("attack");
        await shot("attack");
      }
      await idle();
      continue;
    }
    await page.locator(`[data-aim="${plan.aim}"]`).click({ force: true });
    for (let t = 0; t < plan.tiles.length; t++) {
      if (t > 0 && plan.multi) await page.locator(`[data-op="${plan.ops[t - 1]}"]`).click({ force: true });
      await page.locator(`[data-tile="${plan.tiles[t]}"]`).click({ force: true });
    }
    const key = `w${plan.wave}n${plan.n}${plan.aim.split("-")[0]}t${plan.tiles.length}`;
    if (!seen.has(key)) {
      seen.add(key);
      await shot(`eq_${key}`);
    }
    await page.locator("[data-action=cast]").click({ force: true });
    casts++;
    await page.waitForTimeout(420);
    if (!seen.has("fx" + key)) {
      seen.add("fx" + key);
      await shot(`fx_${key}`);
    }
    await idle();
  }
  return { timeout: true, errors };
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
