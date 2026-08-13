import { expect, test, type Page, type Route } from "@playwright/test";

type Suggestion = {
  id: string;
  author_id: string;
  name: string;
  description: string;
  region: string;
  category: string;
  map_url: string;
  status: "pending" | "approved";
  created_at: string;
  latitude: number;
  longitude: number;
  location_accuracy_m: number;
  location_captured_at: string;
  location_source: "device_gps_claim";
  risk_flags: string[];
  contribution_media: Array<{ object_path: string }>;
};

const memberId = "11111111-1111-4111-8111-111111111111";
const projectOrigin = "https://lhowrxqddjfvzmlwnuoj.supabase.co";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(body),
  });

const setLocalRole = async (
  page: Page,
  role: "member" | "admin",
  balance = 0,
) => {
  await page.evaluate(
    ({ nextRole, nextBalance }) => {
      window.localStorage.setItem("gemgo-e2e-role", nextRole);
      window.localStorage.setItem(
        "gemgo-e2e-verified-balance",
        String(nextBalance),
      );
      window.localStorage.setItem("gemgo-locale-v3", "en");
    },
    { nextRole: role, nextBalance: balance },
  );
};

test.skip(
  process.env.NEXT_PUBLIC_GEMGO_E2E_MOCK_AUTH !== "1",
  "Run with npm run test:authenticated; the local-only auth adapter is disabled by default.",
);

test("local authenticated contribution -> admin review -> exactly one +70 reward", async ({
  page,
  context,
}) => {
  const state: {
    suggestion: Suggestion | null;
    verifiedBalance: number;
    reviewCalls: number;
    multipartHadEvidence: boolean;
  } = {
    suggestion: null,
    verifiedBalance: 0,
    reviewCalls: 0,
    multipartHadEvidence: false,
  };

  await context.grantPermissions(["geolocation"], {
    origin: "http://127.0.0.1:3100",
  });
  await context.setGeolocation({
    latitude: 45.737,
    longitude: 7.32,
    accuracy: 18,
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/gems") {
      if (request.method() === "GET") {
        return json(route, {
          suggestions: state.suggestion
            ? [{
                id: state.suggestion.id,
                name: state.suggestion.name,
                status: state.suggestion.status,
                created_at: state.suggestion.created_at,
              }]
            : [],
        });
      }

      const multipart = request.postDataBuffer()?.toString("latin1") ?? "";
      state.multipartHadEvidence = [
        'name="photo"',
        'name="locationLatitude"',
        'name="locationLongitude"',
        'name="locationAccuracy"',
        'name="locationCapturedAt"',
        'name="formStartedAt"',
      ].every((field) => multipart.includes(field));
      state.suggestion = {
        id: "33333333-3333-4333-8333-333333333333",
        author_id: memberId,
        name: "Quiet alpine lake",
        description:
          "A calm landscape reached on foot outside the busiest visiting window.",
        region: "aosta",
        category: "nature",
        map_url: "",
        status: "pending",
        created_at: new Date().toISOString(),
        latitude: 45.737,
        longitude: 7.32,
        location_accuracy_m: 18,
        location_captured_at: new Date().toISOString(),
        location_source: "device_gps_claim",
        risk_flags: [],
        contribution_media: [],
      };
      return json(
        route,
        {
          suggestion: {
            id: state.suggestion.id,
            name: state.suggestion.name,
            status: "pending",
          },
        },
        201,
      );
    }

    if (url.origin === projectOrigin && url.pathname === "/auth/v1/settings") {
      return json(route, { external: { google: false } });
    }

    if (
      url.origin === projectOrigin &&
      url.pathname === "/rest/v1/gem_suggestions"
    ) {
      return json(
        route,
        state.suggestion?.status === "pending" ? [state.suggestion] : [],
      );
    }

    if (
      url.origin === projectOrigin &&
      url.pathname === "/rest/v1/rpc/review_gem_suggestion"
    ) {
      const payload = request.postDataJSON() as {
        p_id?: string;
        p_decision?: string;
      };
      expect(payload.p_id).toBe(state.suggestion?.id);
      expect(payload.p_decision).toBe("approved");
      state.reviewCalls += 1;
      const awardedNow = state.suggestion?.status === "pending" ? 70 : 0;
      if (state.suggestion) state.suggestion.status = "approved";
      state.verifiedBalance += awardedNow;
      return json(route, [{
        contribution_id: payload.p_id,
        new_status: "approved",
        awarded_now: awardedNow,
        balance: state.verifiedBalance,
        object_path: "",
      }]);
    }

    return route.continue();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await setLocalRole(page, "member");
  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Local member")).toBeVisible();
  await expect(page.getByText(/70 GemPoints after approval/)).toBeVisible();

  const form = page.locator(".contribution-form");
  await form.locator('input[name="name"]').fill("Quiet alpine lake");
  await form
    .locator('textarea[name="description"]')
    .fill("A calm landscape reached on foot outside the busiest visiting window.");
  await form.locator('select[name="region"]').selectOption("aosta");
  await form.locator('select[name="category"]').selectOption("nature");
  await form
    .locator('input[name="photo"]')
    .setInputFiles("public/assets/neuschwanstein-aerial.webp");
  await form.locator('input[name="termsAccepted"]').check();
  await form.getByRole("button", { name: "Capture current location" }).click();
  await expect(form.getByText(/Location captured · ±18 m/)).toBeVisible();
  await form.getByRole("button", { name: "Suggest this gem" }).click();
  await expect(page.getByText(/pending review/i)).toBeVisible();
  expect(state.multipartHadEvidence).toBe(true);
  expect(state.verifiedBalance).toBe(0);

  await setLocalRole(page, "admin");
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Quiet alpine lake" })).toBeVisible();
  await expect(page.getByText(/not independently verified/i)).toBeVisible();
  await page.getByRole("button", { name: "Approve and award 70" }).click();
  await expect(page.getByText("No pending contributions.")).toBeVisible();
  expect(state.verifiedBalance).toBe(70);

  const replay = await page.evaluate(async ({ origin, id }): Promise<
    Array<{ awarded_now: number }>
  > => {
    const response = await fetch(
      `${origin}/rest/v1/rpc/review_gem_suggestion`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_id: id,
          p_decision: "approved",
          p_note: null,
        }),
      },
    );
    return response.json() as Promise<Array<{ awarded_now: number }>>;
  }, { origin: projectOrigin, id: state.suggestion?.id });
  expect(replay[0].awarded_now).toBe(0);
  expect(state.verifiedBalance).toBe(70);
  expect(state.reviewCalls).toBe(2);

  await setLocalRole(page, "member", state.verifiedBalance);
  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("70 GemPoints").first()).toBeVisible();
});
