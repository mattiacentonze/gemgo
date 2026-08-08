import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the integrated app uses direct lightweight responsive navigation", () => {
  const page = read("app/app/page.tsx");
  const shell = read("app/components/IntegratedAppShell.tsx");
  const css = read("app/styles/responsive.css");
  assert.doesNotMatch(page, /LiquidAppNavigation/);
  assert.match(shell, /mobile-bottom-nav/);
  assert.match(shell, /onClick=\{\(\) => chooseSection\(item\.id\)\}/);
  assert.match(shell, /id: "explore"/);
  assert.match(shell, /id: "trip"/);
  assert.match(shell, /id: "rewards"/);
  assert.match(shell, /href="\/about"/);
  assert.doesNotMatch(shell, /requestAnimationFrame\([^)]*button/);
  assert.match(css, /\.mobile-bottom-nav a/);
});
