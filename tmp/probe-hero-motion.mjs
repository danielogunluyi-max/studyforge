import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.emulateMedia({ reducedMotion: "no-preference" });

const url = `http://127.0.0.1:3001/?probe=${Date.now()}`;
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

const FULL = "a mock exam.";

// Wait until typewriter has left the static full first paint
await page.waitForFunction(
  (full) => {
    const typed =
      document.querySelector('em.kv-rotator span[aria-hidden="true"]')
        ?.textContent ?? null;
    return typed !== null && typed !== full;
  },
  FULL,
  { timeout: 8_000 },
);

const startedAt = Date.now();

const read = async (label) =>
  page.evaluate((t) => {
    const typed =
      document.querySelector('em.kv-rotator span[aria-hidden="true"]')
        ?.textContent ?? "";
    return {
      t,
      typed,
      typedLen: typed.length,
      stage: document.querySelector(".hero-stage-num")?.textContent ?? "",
      meta: document.querySelector(".window-meta")?.textContent ?? "",
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }, label);

// Align to user windows: ~1s / 3s / 6s from navigation by sampling
// from animation-start + offsets that land in those bands.
const s1 = await read("1s-band"); // just after leave-full (~500ms+), should be partial
await page.waitForTimeout(2000);
const s3 = await read("3s-band");
await page.waitForTimeout(3000);
const s6 = await read("6s-band");

// Also wall-clock samples from navigation for the report
await page.goto(url + "b", { waitUntil: "domcontentloaded", timeout: 60_000 });
const nav = Date.now();
const wall = [];
for (const ms of [1000, 3000, 6000]) {
  await page.waitForTimeout(ms - (Date.now() - nav));
  wall.push(await read(`${ms / 1000}s`));
}

console.log(
  JSON.stringify(
    {
      afterTypingStarted: [s1, s3, s6],
      msFromTypingStart: Date.now() - startedAt,
      wallClockFromNav: wall,
    },
    null,
    2,
  ),
);

await browser.close();
