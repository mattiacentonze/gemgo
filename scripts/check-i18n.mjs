import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  messageKeys,
  messages,
  sharedMessageKeys,
  supportedLocales,
  translationOverrides,
} from "../app/i18n/catalogs.mjs";

const englishKeys = new Set(messageKeys);
const shared = new Set(sharedMessageKeys);
const placeholders = (value) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

for (const locale of supportedLocales) {
  const catalogue = messages[locale];
  assert(catalogue, `Missing catalogue: ${locale}`);
  assert.deepEqual(
    Object.keys(catalogue).sort(),
    [...englishKeys].sort(),
    `Catalogue keys differ for ${locale}`,
  );
  for (const key of messageKeys) {
    assert.equal(
      typeof catalogue[key],
      "string",
      `Missing ${locale} translation for ${key}`,
    );
    assert.deepEqual(
      placeholders(catalogue[key]),
      placeholders(messages.en[key]),
      `Placeholder mismatch in ${locale}:${key}`,
    );
    if (locale !== "en" && !shared.has(key)) {
      assert(
        Object.hasOwn(translationOverrides[locale], key),
        `Untranslated fallback in ${locale}:${key}`,
      );
    }
  }
}

const components = [
  "app/page.tsx",
  "app/components/DestinationMap.tsx",
];
const allowedVisibleLiterals = new Set(["GemGo"]);
for (const file of components) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const match of source.matchAll(
    /<(?:span|p|h1|h2|h3|small|strong|button|a|label|option)[^>]*>\s*([A-Za-z][^<>{}\n]*?)\s*<\//g,
  )) {
    const literal = match[1].trim();
    assert(
      allowedVisibleLiterals.has(literal),
      `Visible hardcoded text in ${file}: ${literal}`,
    );
  }
  assert.doesNotMatch(
    source,
    /\b(?:aria-label|placeholder|title)="[A-Za-z][^"]+"/,
    `Hardcoded accessible text in ${file}`,
  );
}

const page = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);
for (const legacy of [
  '"Walking"',
  '"Public transport"',
  '"Quiet places"',
  '"Lakes"',
  '"Culture"',
]) {
  assert(!page.includes(legacy), `Legacy language-dependent value: ${legacy}`);
}

console.log(
  `i18n check passed: ${messageKeys.length} keys × ${supportedLocales.length} locales`,
);
