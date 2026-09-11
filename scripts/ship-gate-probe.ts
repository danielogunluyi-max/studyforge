import { chromium } from "@playwright/test";
import {
  applyPreset,
  createTestUser,
  dismissPresetModal,
  registerUser,
} from "../tests/e2e/support/auth";

const baseURL = "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });

  const anon = await browser.newContext({ baseURL });
  const p = await anon.newPage();
  await p.goto("/nonexistent-xyz-batch-h", { waitUntil: "domcontentloaded" });
  console.log("ANON_URL", p.url());
  console.log("ANON_TEXT", (await p.locator("body").innerText()).slice(0, 220).replace(/\s+/g, " "));

  const ctx = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const user = createTestUser();
  await registerUser(page, user);
  await dismissPresetModal(page);
  await applyPreset(page, "HIGHSCHOOL").catch(() => undefined);
  await page.goto("/nonexistent-xyz-batch-h", { waitUntil: "domcontentloaded" });
  console.log("AUTH_URL", page.url());
  console.log("AUTH_TEXT", (await page.locator("body").innerText()).slice(0, 220).replace(/\s+/g, " "));

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const dash = await page.evaluate(() => {
    const html = document.querySelector("main")?.innerHTML ?? "";
    return {
      whatIf: /What-?If|Project your grades/i.test(html),
      backdrop: (html.match(/backdrop-blur/g) || []).length,
      gradient: (html.match(/bg-gradient-/g) || []).length,
    };
  });
  console.log("DASH", dash);

  await browser.close();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
