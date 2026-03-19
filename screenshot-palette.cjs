const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Dismiss onboarding tour if present
  const skipBtn = page.getByText('Skip tour');
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
  // Debug: dump page to see if CommandPalette trigger is in DOM
  const html = await page.evaluate(() => document.querySelector('.topbar-shell')?.innerHTML || 'NO TOPBAR');
  console.log('Topbar HTML length:', html.length);
  console.log('Has search text:', html.includes('Search features'));
  // Try clicking directly
  const trigger = await page.$('button:has-text("Search features")');
  if (trigger) {
    console.log('Found trigger button via CSS selector');
    await trigger.click();
    await page.waitForTimeout(500);
    await page.keyboard.type('orig', { delay: 80 });
    await page.waitForTimeout(500);
  } else {
    console.log('No trigger button found via CSS selector either');
    // Try Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
    // Check if palette opened
    const overlay = await page.$('[style*="z-index: 9998"]');
    console.log('Overlay found:', !!overlay);
    await page.keyboard.type('orig', { delay: 80 });
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'command-palette-screenshot.png', fullPage: false });
  await browser.close();
  console.log('Done');
})();
