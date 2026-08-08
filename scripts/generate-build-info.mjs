import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const target = resolve(projectRoot, "app/generated/build-info.ts");
const now = new Date();
const parts = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  })
    .formatToParts(now)
    .map(({ type, value }) => [type, value]),
);
const monthName = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  month: "short",
}).format(now);
const version = `${parts.year}.${parts.month}.${parts.day}.${parts.hour}${parts.minute}`;
const source = `// This file is refreshed by scripts/generate-build-info.mjs before every production build.\nexport const buildInfo = {\n  version: ${JSON.stringify(version)},\n  updatedAt: ${JSON.stringify(now.toISOString())},\n  displayDate: ${JSON.stringify(`${parts.day} ${monthName} ${parts.year}`)},\n  displayTime: ${JSON.stringify(`${parts.hour}:${parts.minute} ${parts.timeZoneName}`)},\n} as const;\n`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, source, "utf8");
console.log(`GemGo build ${version} · ${parts.day} ${monthName} ${parts.year} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`);
