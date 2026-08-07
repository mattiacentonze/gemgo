import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

const renderPage = async (pathname = "/") => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, {
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

test("renders the overtourism-first pan-Alpine product story", async () => {
  const { response, html } = await renderPage();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /Too crowded/i);
  assert.match(html, /Find a better/i);
  assert.match(html, /Alpine alternative/i);
  assert.match(html, /Find a better alternative/i);
  assert.match(html, /Neuschwanstein Castle/i);
  assert.match(html, /Falkenstein Ruin Pfronten/i);
  assert.match(html, /href="\/about"/i);
  assert.match(html, /Popular plans concentrate pressure/i);
  assert.match(html, /choose better/i);
  assert.match(html, /href="\/app"/i);
});

test("renders the integrated application route", async () => {
  const { response, html } = await renderPage("/app");
  assert.equal(response.status, 200);
  assert.match(html, /What would you like to experience/i);
  assert.match(html, /Show my best alternatives/i);
  assert.match(html, /My Trip/i);
  assert.match(html, /GemPoints/i);
  assert.match(html, /Current catalogue/i);
});

test("does not lead with the retired XP and credits vocabulary", async () => {
  const { html } = await renderPage();
  assert.doesNotMatch(html, /GemCredits/i);
  assert.doesNotMatch(html, /GemXP/i);
  assert.match(html, /GemPoints/i);
});
