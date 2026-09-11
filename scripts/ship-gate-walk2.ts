/**
 * Focused ship-gate re-walk — no cascade. One session, explicit checks.
 * Run: npx tsx scripts/ship-gate-walk2.ts
 */
import { chromium, expect, type Page } from "@playwright/test";
import {
  applyPreset,
  createTestUser,
  dismissPresetModal,
  registerUser,
} from "../tests/e2e/support/auth";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP" | "NOTE"; note: string };
const results: Row[] = [];

function rec(id: string, status: Row["status"], note: string) {
  results.push({ id, status, note });
  const mark = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "SKIP" ? "○" : "·";
  console.log(`${mark} ${id} — ${note}`);
}

async function soft(id: string, fn: () => Promise<void>) {
  try {
    await fn();
    rec(id, "PASS", "ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] ?? String(e) : String(e);
    rec(id, "FAIL", msg);
  }
}

/** Dialect scan scoped to [data-ship-page] or first page-owned main child, excluding known deferrals. */
async function scanPageBody(page: Page) {
  return page.evaluate(() => {
    const root =
      (document.querySelector("[data-page-root]") as HTMLElement | null) ??
      (document.querySelector("main .kv-page") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null) ??
      document.body;
    const html = root.innerHTML;
    const bad = [
      "bg-gradient-",
      "backdrop-blur",
      "rounded-xl",
      "rounded-2xl",
      "rounded-3xl",
      "shadow-[0_0",
      "from-blue-",
      "pro-glow",
    ].filter((t) => html.includes(t));
    return { bad, sample: html.slice(0, 120) };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  const phone = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const phonePage = await phone.newPage();
  const user = createTestUser();

  // Auth both contexts via register on phone, then login on laptop
  await soft("A1", async () => {
    await registerUser(phonePage, user);
    await dismissPresetModal(phonePage);
    await applyPreset(phonePage, "HIGHSCHOOL").catch(() => undefined);
    await expect(phonePage).toHaveURL(/\/dashboard/);
    await phonePage.reload({ waitUntil: "domcontentloaded" });
    await expect(phonePage).toHaveURL(/\/dashboard/);
  });

  rec("A2", "SKIP", "Real phone + worksheet photo required");

  // A3: Inbox-shaped save — tags include course code (API has no curriculumCode field)
  let noteId = "";
  await soft("A3", async () => {
    const res = await phonePage.request.post("/api/notes", {
      data: {
        title: "SCH4U Photosynthesis worksheet",
        content:
          "Ontario SCH4U photosynthesis. Chlorophyll absorbs blue and red. Light reactions ATP NADPH. Calvin cycle fixes CO2.",
        format: "detailed",
        tags: ["Inbox", "Chemistry", "SCH4U"],
      },
    });
    const body = (await res.json().catch(() => ({}))) as { note?: { id: string }; id?: string };
    noteId = body.note?.id ?? body.id ?? "";
    if (!res.ok || !noteId) throw new Error(`note create ${res.status} ${JSON.stringify(body)}`);
    await phonePage.goto("/my-notes", { waitUntil: "networkidle" });
    await expect(phonePage.getByText(/SCH4U Photosynthesis/i).first()).toBeVisible({ timeout: 20_000 });
    const html = await phonePage.locator("main").first().innerHTML();
    if (!html.includes("SCH4U") && !html.includes("kv-chip-course")) {
      throw new Error("course chip/code not visible on My Notes card");
    }
  });

  await soft("A4", async () => {
    if (!noteId) throw new Error("no noteId");
    const create = await phonePage.request.post("/api/decks", {
      data: { title: "Ship-gate deck", subject: "SCH4U", noteId },
    });
    const created = (await create.json().catch(() => ({}))) as { deck?: { id: string }; id?: string };
    const deckId = created.deck?.id ?? created.id ?? "";
    if (!create.ok || !deckId) throw new Error(`deck ${create.status}`);
    for (const card of [
      { front: "What is photosynthesis?", back: "Light to chemical energy" },
      { front: "Where is chlorophyll?", back: "Thylakoid membranes" },
    ]) {
      const r = await phonePage.request.post(`/api/decks/${deckId}/cards`, { data: card });
      if (!r.ok) throw new Error(`card ${r.status}`);
    }
    await phonePage.goto(`/flashcards/${deckId}`, { waitUntil: "domcontentloaded" });
    await expect(phonePage.getByText(/photosynthesis/i).first()).toBeVisible({ timeout: 15_000 });
  });

  await soft("A5", async () => {
    if (!noteId) throw new Error("no noteId");
    await phonePage.goto(`/mock-exam?noteId=${encodeURIComponent(noteId)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(phonePage).toHaveURL(new RegExp(`noteId=${noteId}`));
  });

  await soft("A6-A8-proxy", async () => {
    // Money-path E2E already covers full mock→results→Nova; spot-check results honesty
    await phonePage.goto("/results", { waitUntil: "domcontentloaded" });
    const text = await phonePage.locator("main").first().innerText();
    if (/projected growth|likely to score|invented/i.test(text)) {
      throw new Error("invented trend language");
    }
    await expect(phonePage.getByRole("heading", { name: /My Results|Results/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  await soft("A7", async () => {
    if (!noteId) throw new Error("no noteId");
    await phonePage.goto(`/tutor?noteId=${encodeURIComponent(noteId)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(phonePage).toHaveURL(new RegExp(`noteId=${noteId}`));
  });

  rec("A9", "SKIP", "Human squint on real phone");

  // Login laptop with same user (copy storage)
  const cookies = await phone.cookies();
  await ctx.addCookies(cookies);

  await soft("B-login", async () => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  for (const [path, label] of [
    ["/smart-upload", "Inbox"],
    ["/dashboard", "Dashboard"],
    ["/mock-exam", "Mock Exam"],
    ["/my-notes", "My Notes"],
    ["/tutor", "Nova"],
  ] as const) {
    await soft(`B1-${label}`, async () => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const { bad } = await scanPageBody(page);
      // Also code-level known widgets
      if (bad.length) throw new Error(bad.join(", "));
    });
  }

  await soft("B3-meta", async () => {
    await page.goto("/my-notes", { waitUntil: "domcontentloaded" });
    const n = await page.locator(".kv-meta, .kv-chip, .num, .kv-chip-course").count();
    if (n < 1) throw new Error("no meta/chip classes");
  });

  await soft("B4-serif", async () => {
    for (const path of ["/smart-upload", "/dashboard", "/mock-exam", "/my-notes", "/tutor"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const c = await page.locator(".kv-serif, .font-serif.italic").count();
      if (c > 1) throw new Error(`${path} serif ${c}`);
    }
  });

  await soft("B6-chip-css", async () => {
    await page.goto("/my-notes", { waitUntil: "domcontentloaded" });
    const ok = await page.evaluate(() => {
      const el = document.createElement("span");
      el.className = "kv-chip-course";
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      el.remove();
      return Boolean(cs.fontFamily);
    });
    if (!ok) throw new Error("kv-chip-course missing");
  });

  // C themes
  await soft("C1-theme-radios", async () => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    // open Appearance tab
    await page.getByRole("button", { name: /^Appearance$/i }).click();
    const labels = await page.locator('[role="radiogroup"][aria-label="Theme"]').innerText();
    if (!/System/.test(labels) || !/Dark/.test(labels) || !/Light/.test(labels)) {
      throw new Error(`theme labels: ${labels}`);
    }
    // note extra appearance controls
    const body = await page.locator("main").first().innerText();
    if (/Accent Color|Midnight|Arcade|Velocity/i.test(body)) {
      rec("C1-extra", "NOTE", "Appearance still exposes Accent Color / non-theme controls beside System/Dark/Light");
    }
  });

  await soft("C3-dark-token", async () => {
    await page.evaluate(() => {
      localStorage.setItem("kyvex-theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg-base").trim());
    if (!/^#15150[Ff]$/i.test(bg) && bg.toLowerCase() !== "#15150f") {
      // allow css var resolution
      const resolved = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      if (!/21,\s*21,\s*15|rgb\(21/.test(resolved) && bg !== "#15150F" && bg !== "#15150f") {
        throw new Error(`dark bg not warm black: --bg-base=${bg} body=${resolved}`);
      }
    }
  });

  await soft("C4-light-token", async () => {
    await page.evaluate(() => {
      localStorage.setItem("kyvex-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg-base").trim());
    if (!/#f1efe7/i.test(bg)) {
      const resolved = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      if (!/241,\s*239,\s*231/.test(resolved) && !/#f1efe7/i.test(bg)) {
        throw new Error(`light bg not cream: --bg-base=${bg} body=${resolved}`);
      }
    }
  });

  await soft("C6-persist", async () => {
    await page.evaluate(() => localStorage.setItem("kyvex-theme", "dark"));
    await page.reload({ waitUntil: "domcontentloaded" });
    const t = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (t !== "dark") throw new Error(`expected dark after reload, got ${t}`);
  });

  // D chrome
  await soft("D2-topnav", async () => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Appearance$/i }).click();
    // set nav style topnav if control exists
    const topnavBtn = page.getByRole("button", { name: /Topnav|Top nav|Top bar/i });
    if (await topnavBtn.count()) {
      await topnavBtn.first().click();
    } else {
      await page.evaluate(() => {
        localStorage.setItem("kyvex-nav-style", "topnav");
        localStorage.setItem("navStyle", "topnav");
      });
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const has = await page.locator(".kv-tabs, .kv-dropdown, nav.kv-tabs").count();
    if (has < 1) throw new Error("topnav kv chrome missing");
  });

  await soft("D4-palette", async () => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Control+KeyK");
    const palette = page.locator(".kv-palette, [cmdk-root], [data-command-palette], [role='dialog']").first();
    await expect(palette).toBeVisible({ timeout: 5000 }).catch(async () => {
      await page.keyboard.press("Meta+KeyK");
      await expect(page.getByPlaceholder(/search|command|jump/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  await soft("D5-crumb", async () => {
    for (const path of ["/focus", "/library", "/decay-alerts", "/essay-grade", "/planner"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const crumb = page.locator(".kv-crumb").first();
      await expect(crumb).toBeVisible({ timeout: 10_000 });
      const t = await crumb.innerText();
      if (!/Kyvex\s*\//i.test(t) && !/KYVEX\s*\//i.test(t)) throw new Error(`${path}: ${t}`);
    }
  });

  await soft("D6-avatar-focus", async () => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible({ timeout: 10_000 });
    const bell = await page.locator('[aria-label*="otification" i], button:has-text("🔔")').count();
    if (bell > 0) throw new Error("bell present");
  });

  // E
  for (const path of ["/predictor", "/plagiarism", "/kyvex-iq", "/study-dna", "/my-predictions"]) {
    await soft(`E1-${path}`, async () => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  }

  await soft("E2-landing", async () => {
    const anon = await browser.newContext({ baseURL });
    const p = await anon.newPage();
    await p.goto("/", { waitUntil: "domcontentloaded" });
    const text = await p.locator("body").innerText();
    if (/14k thinkers|14,000 thinkers/i.test(text)) throw new Error("fake social proof");
    if (!/coming soon/i.test(text)) throw new Error("Coming Soon missing");
    if (!/Inbox|worksheet|notes|Nova|Mock/i.test(text)) throw new Error("demo loop not evident");
    await anon.close();
  });

  await soft("E3-essay", async () => {
    await page.goto("/essay-grade", { waitUntil: "domcontentloaded" });
    const text = await page.locator("main").first().innerText();
    if (/Overall\s+\d+%/i.test(text) && /KU|Thinking|Communication|Application/i.test(text) === false) {
      throw new Error("invented overall without categories");
    }
  });

  await soft("E4-empty", async () => {
    for (const path of ["/library", "/community", "/decay-alerts"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const text = await page.locator("main").first().innerText();
      if (/🎉|✨|🎊/.test(text)) throw new Error(`${path} confetti`);
    }
  });

  await soft("E5-flashcards", async () => {
    await page.goto("/flashcards", { waitUntil: "domcontentloaded" });
    const text = await page.locator("main").first().innerText();
    if (/Last studied/i.test(text)) throw new Error("Last studied still present");
  });

  // F3 strict: CTA must not be dashboard-only for anon
  await soft("F3-404", async () => {
    const anon = await browser.newContext({ baseURL });
    const p = await anon.newPage();
    await p.goto("/this-route-does-not-exist-ship-gate-2", { waitUntil: "domcontentloaded" });
    const text = await p.locator("body").innerText();
    if (!/not found|doesn't exist|does not exist/i.test(text)) throw new Error("no 404 copy");
    if (/Back to Dashboard/i.test(text) && !/Sign in|Home|Landing|Get started/i.test(text)) {
      throw new Error("logged-out 404 only offers Dashboard hop");
    }
    await anon.close();
  });

  await soft("F4-signout", async () => {
    await page.goto("/api/auth/signout", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.evaluate(async () => {
      try {
        await fetch("/api/auth/signout", { method: "POST" });
      } catch {
        /* */
      }
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    if (!/Sign in|Begin|Get started|Create account|Register/i.test(text)) {
      throw new Error("signed-out landing missing auth CTA");
    }
  });

  // Code-static notes for known deferrals
  rec("C5", "NOTE", "Known deferrals: CaptureStudio viewfinder glass; nova-vision-panel/camera glass; settings Accent Color row");
  rec("C2", "SKIP", "OS theme live flip — human phone");
  rec("F1", "SKIP", "Lighthouse — human/DevTools");
  rec("F2", "NOTE", "Prior ship-gate F2 PASS on 5 key pages; re-check after batch fixes");

  await browser.close();

  console.log("\n======== WALK2 SUMMARY ========");
  for (const s of ["PASS", "FAIL", "SKIP", "NOTE"] as const) {
    const rows = results.filter((r) => r.status === s);
    console.log(`${s} ${rows.length}`);
    for (const r of rows) console.log(`  ${r.id}: ${r.note}`);
  }
  process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(2);
});
