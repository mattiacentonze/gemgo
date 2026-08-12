import { expect, test, type Page } from "@playwright/test";

type Locale = "en" | "it" | "de" | "fr" | "sl";

const appOrigin = "http://127.0.0.1:3100";

const cases: Array<{
  name: string;
  path: string;
  locale: Locale;
  viewport: { width: number; height: number };
}> = [
  { name: "home-desktop-en", path: "/", locale: "en", viewport: { width: 1440, height: 900 } },
  { name: "home-notebook-de", path: "/", locale: "de", viewport: { width: 1024, height: 768 } },
  { name: "explore-tablet-sl", path: "/app/explore", locale: "sl", viewport: { width: 768, height: 1024 } },
  { name: "profile-mobile-de", path: "/app/profile", locale: "de", viewport: { width: 390, height: 844 } },
  { name: "privacy-mobile-sl", path: "/privacy", locale: "sl", viewport: { width: 360, height: 800 } },
  { name: "admin-guest-it", path: "/app/admin", locale: "it", viewport: { width: 430, height: 932 } },
  { name: "notifications-narrow-fr", path: "/app/notifications", locale: "fr", viewport: { width: 320, height: 780 } },
];

const setLocale = async (page: Page, locale: Locale) => {
  await page.context().addCookies([{
    name: "gemgo-locale",
    value: locale,
    domain: "127.0.0.1",
    path: "/",
    sameSite: "Lax",
  }]);
  await page.addInitScript((nextLocale) => {
    window.localStorage.setItem("gemgo-locale-v3", nextLocale);
  }, locale);
};

for (const visualCase of cases) {
  test(`${visualCase.name}: responsive locale story`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown";
      // Next.js may cancel speculative route prefetches when a page settles or closes.
      if (url.origin === appOrigin && failure !== "net::ERR_ABORTED") {
        errors.push(`first-party request failed: ${url.pathname} (${failure})`);
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      const expectedGuestResponse = url.pathname === "/api/gems" && response.status() === 401;
      if (url.origin === appOrigin && response.status() >= 400 && !expectedGuestResponse) {
        errors.push(`first-party response ${response.status()}: ${url.pathname}`);
      }
    });
    page.on("console", (message) => {
      // Chromium does not include the failed URL in this generic message. First-party
      // failures are asserted above; external media/weather calls can be unavailable in CI.
      if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
        errors.push(message.text());
      }
    });

    await page.setViewportSize(visualCase.viewport);
    await setLocale(page, visualCase.locale);
    await page.goto(visualCase.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", visualCase.locale);
    await page.waitForTimeout(600);

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document, "document horizontal overflow").toBeLessThanOrEqual(1);
    expect(overflow.body, "body horizontal overflow").toBeLessThanOrEqual(1);

    await page.keyboard.press("Tab");
    const focusIsVisible = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    expect(focusIsVisible, "first keyboard target should be visible").toBe(true);

    await page.screenshot({ path: testInfo.outputPath(`${visualCase.name}.png`), fullPage: true });
    expect(errors, `browser errors: ${errors.join(" | ")}`).toEqual([]);
  });
}

test("guest auth, contribution and admin boundaries are explicit", async ({ page }) => {
  await setLocale(page, "en");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });

  const google = page.getByRole("button", { name: /Google sign-in is not configured yet/i });
  await expect(google).toBeVisible();
  await expect(google).toBeDisabled();
  await expect(page.getByText(/70 GemPoints after approval/i)).toBeVisible();
  await expect(page.getByText(/Sign in to suggest a gem/i)).toBeVisible();

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/requires a content editor, admin or owner role/i)).toBeVisible();
});

test("reduced motion stops the automatic hero gallery", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setLocale(page, "en");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const firstPhoto = page.locator(".hero-plan-card .destination-gallery-image").first();
  await expect(firstPhoto).toBeVisible();
  const before = await firstPhoto.getAttribute("src");
  await page.waitForTimeout(5_200);
  await expect(firstPhoto).toHaveAttribute("src", before ?? "");
});
