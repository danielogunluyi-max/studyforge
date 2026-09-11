import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = __dirname;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010";
mkdirSync(out, { recursive: true });

const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const user = {
  email: `batchm-${token}@example.com`,
  password: "BatchM123!",
  name: "Batch M",
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.addInitScript(() => {
  localStorage.setItem("kyvex-onboarded", "1");
});

const signup = await context.request.post(`${baseURL}/api/auth/signup`, {
  data: { name: user.name, email: user.email, password: user.password },
});
console.log("signup", signup.status(), await signup.text());

await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('input[type="email"]').fill(user.email);
await page.locator('input[type="password"]').fill(user.password);
await Promise.all([
  page.waitForResponse(
    (r) =>
      r.url().includes("/api/auth/callback/credentials") &&
      r.request().method() === "POST",
    { timeout: 90_000 },
  ),
  page.getByRole("button", { name: /log in/i }).click({ noWaitAfter: true }),
]);

await page.waitForURL(/\/(dashboard|onboarding)$/, { timeout: 90_000 });
if (new URL(page.url()).pathname === "/onboarding") {
  const skip = page.getByRole("button", { name: /^skip$/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  else {
    const explore = page.getByRole("button", { name: /explore first/i });
    if (await explore.isVisible().catch(() => false)) await explore.click();
  }
  await page.waitForURL(/\/dashboard$/, { timeout: 90_000 });
}
console.log("on dashboard");

await page.evaluate(() => {
  document.cookie = "kv-nav=sidebar; path=/; max-age=31536000; samesite=lax";
  window.dispatchEvent(new CustomEvent("kyvex-nav-changed", { detail: "sidebar" }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("main", { timeout: 60_000 });

const getStarted = page.getByRole("button", { name: /get started/i });
if (await getStarted.isVisible().catch(() => false)) {
  await page.getByRole("button", { name: /high school/i }).click();
  await getStarted.click();
  await getStarted.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
}

const openDrawer = async () => {
  await page.getByRole("banner").getByRole("button", { name: "Open menu" }).click();
};

// 1) 390px drawer open — Inbox visible
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await openDrawer();
await page.waitForTimeout(600);
const inbox = page.locator("aside").getByRole("link", { name: /inbox/i });
console.log("Inbox visible?", await inbox.isVisible().catch(() => false));
await page.screenshot({ path: join(out, "sidebar-390-inbox.png") });

await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 2) More sheet ACCOUNT
await page.locator("button.kv-bottom-tab").filter({ hasText: "More" }).click();
await page.waitForTimeout(500);
console.log("ACCOUNT?", await page.getByText("ACCOUNT").isVisible().catch(() => false));
await page.screenshot({ path: join(out, "more-sheet-account.png") });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 3) 768 drawer open
await page.setViewportSize({ width: 768, height: 1024 });
await page.waitForTimeout(500);
await openDrawer();
await page.waitForTimeout(600);
const moreVisible = await page
  .locator("button.kv-bottom-tab")
  .filter({ hasText: "More" })
  .isVisible()
  .catch(() => false);
console.log("More tab visible with drawer open?", moreVisible);
await page.screenshot({ path: join(out, "drawer-768-backdrop.png") });

console.log("Wrote screenshots to", out);
await browser.close();
