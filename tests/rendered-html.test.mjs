import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

const renderHomepage = async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  return { response, html: await response.text() };
};

test("renders the pan-Alpine public product story", async () => {
  const { response, html } = await renderHomepage();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /Welcome to GemGo/i);
  assert.match(html, /Try the app now/i);
  assert.match(html, /Meet the team/i);
  assert.match(html, /Explore more of the Alps/i);
  assert.match(html, /without following the crowd/i);
  assert.match(html, /Predict/i);
  assert.match(html, /Recommend/i);
  assert.match(html, /Verify/i);
  assert.match(html, /Demonstration data/i);
  assert.match(html, /href="\/app"/i);
});

test("does not lead with the retired XP and credits vocabulary", async () => {
  const { html } = await renderHomepage();
  assert.doesNotMatch(html, /GemCredits/i);
  assert.doesNotMatch(html, /GemXP/i);
  assert.match(html, /GemPoints/i);
});
