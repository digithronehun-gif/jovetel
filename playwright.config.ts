import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`
// CI-ban és `E2E_SERVER=start` mellett production buildet tesztelünk, egyébként dev szervert.
const useBuild = process.env.CI === 'true' || process.env.E2E_SERVER === 'start'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM
      ? { executablePath: process.env.PW_CHROMIUM }
      : process.env.CI
        ? {}
        : { executablePath: '/opt/pw-browsers/chromium' },
  },
  projects: [
    {
      name: 'mobil',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: useBuild ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { E2E: 'true' },
      },
})
