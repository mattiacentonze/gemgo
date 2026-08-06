import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the integrated app reuses the premium draggable mobile navigation", () => {
  const page = read("app/app/page.tsx");
  const adapter = read("app/components/LiquidAppNavigation.tsx");
  const liquid = read("app/components/LiquidMobileNav.tsx");
  const css = read("app/styles/liquid-app-nav.css");
  assert.match(page, /<LiquidAppNavigation \/>/);
  assert.match(adapter, /pages: AppPage\[] = \["explore", "trip", "rewards", "about"\]/);
  assert.match(adapter, /mobile-bottom-nav > button/);
  assert.match(adapter, /snapshotRef/);
  assert.match(adapter, /button\?\.click\(\)/);
  assert.match(liquid, /onPointerDown=\{startDrag\}/);
  assert.match(liquid, /requestAnimationFrame/);
  assert.match(css, /liquid-nav-gradient/);
  assert.match(css, /has-liquid-app-nav/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
