import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3111";
const sitesToken = process.env.SITES_BYPASS_TOKEN;

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    extraHTTPHeaders: sitesToken
      ? { "OAI-Sites-Authorization": `Bearer ${sitesToken}` }
      : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3111",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    { name: "small-mobile", use: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
    { name: "tablet-landscape", use: { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
