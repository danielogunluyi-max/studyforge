import { chromium } from "playwright";
import fs from "fs";

const ports = [3000, 3001];
const out = {};

for (const port of ports) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  const scripts = [];
  page.on("response", async (res) => {
    const url = res.url();
    const ct = res.headers()["content-type"] || "";
    if (
      res.request().resourceType() === "script" ||
      url.includes("/_next/static/chunks/") ||
      ct.includes("javascript")
    ) {
      scripts.push({ url, status: res.status() });
    }
  });

  const url = `http://127.0.0.1:${port}/?evidence=${Date.now()}`;
  let html = "";
  try {
    const resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    html = (await resp?.text()) ?? "";
  } catch (e) {
    out[port] = { error: String(e) };
    await browser.close();
    continue;
  }

  // Find hero-related chunk URLs from page
  const chunkUrls = await page.evaluate(() =>
    [...document.querySelectorAll("script[src]")]
      .map((s) => s.src)
      .filter((u) => u.includes("/_next/")),
  );

  // Also pull RSC flight / modulepreload
  const allScriptUrls = [
    ...new Set([...chunkUrls, ...scripts.map((s) => s.url)]),
  ].filter((u) => u.includes("127.0.0.1") || u.includes("localhost"));

  let hits = [];
  for (const u of allScriptUrls.slice(0, 80)) {
    try {
      const text = await page.request.get(u).then((r) => r.text());
      const hasTypewriter = text.includes("useTypewriter");
      const hasLen0Reset =
        text.includes("len:0") ||
        text.includes("len: 0") ||
        /wi:\s*0,\s*len:\s*0/.test(text);
      const has1800 = text.includes("1800");
      const has1400OnOnly =
        text.includes("on:true") && text.includes("1400") && !hasLen0Reset;
      if (hasTypewriter || hasLen0Reset || has1800) {
        hits.push({
          url: u.replace(/.*\/_next/, "/_next").slice(0, 120),
          hasTypewriter,
          hasLen0Reset,
          has1800,
          has1400: text.includes("1400"),
          size: text.length,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // Timeline samples
  const samples = [];
  const nav = Date.now();
  for (const ms of [500, 1000, 1800, 4000]) {
    const wait = ms - (Date.now() - nav);
    if (wait > 0) await page.waitForTimeout(wait);
    samples.push(
      await page.evaluate((t) => {
        const typed =
          document.querySelector('em.kv-rotator span[aria-hidden="true"]')
            ?.textContent ?? "";
        return {
          t,
          typed,
          typedLen: typed.length,
          stage: document.querySelector(".hero-stage-num")?.textContent ?? "",
          meta: document.querySelector(".window-meta")?.textContent ?? "",
          reduce: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        };
      }, `${ms}ms`),
    );
  }

  out[port] = {
    url,
    scriptCount: allScriptUrls.length,
    hits,
    samples,
    errors,
    reduce: samples[0]?.reduce,
  };

  await browser.close();
}

fs.writeFileSync(
  "tmp/evidence-landing.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
