import { defineConfig } from "@playwright/test";

const localChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests",
  outputDir: ".visual-artifacts/playwright",
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: localChromium ? {
      executablePath: localChromium,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    } : undefined,
  },
  webServer: {
    command: "npm run start:vercel -- -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
