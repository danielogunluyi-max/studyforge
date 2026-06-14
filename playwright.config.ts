import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const webServerCommand = process.platform === 'win32'
  ? 'cmd /c npm.cmd run dev'
  : 'npm run dev'

export default defineConfig({
  testDir: './tests/e2e',
  // Each test performs two sequential DB-bound auth flows (register + login),
  // each waiting up to 60s on an API response. Against Neon's serverless
  // connections (which can cold-start/recycle), 60s total is too tight, so a
  // single slow connection blows the budget. 150s gives the sequential waits
  // room without weakening any assertions.
  timeout: 150_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})