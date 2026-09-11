import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];

page.on("console", (msg) => {
  logs.push({ type: msg.type(), text: msg.text() });
});
page.on("pageerror", (err) => {
  logs.push({ type: "pageerror", text: String(err) });
});

await page.goto("http://127.0.0.1:3001/", {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.waitForTimeout(2500);

const check = await page.evaluate(() => ({
  reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  typed:
    document.querySelector('em.kv-rotator span[aria-hidden="true"]')
      ?.textContent ?? null,
  stage: document.querySelector(".hero-stage-num")?.textContent ?? null,
  meta: document.querySelector(".window-meta")?.textContent ?? null,
  h1: document.querySelector("h1.landing-h-hero")?.innerText ?? null,
}));

const interesting = logs.filter(
  (l) =>
    l.type === "error" ||
    l.type === "warning" ||
    l.type === "pageerror" ||
    /hydrat|Hydration|Error|warn/i.test(l.text),
);

console.log(
  JSON.stringify(
    {
      check,
      interesting,
      allLogCount: logs.length,
      allLogs: logs,
    },
    null,
    2,
  ),
);

await browser.close();
