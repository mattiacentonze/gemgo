import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [archive, output = "app/data/gtfs-bavaria-regional-stops.json"] = process.argv.slice(2);
if (!archive) throw new Error("Usage: node scripts/extract-bavaria-gtfs.mjs feed.zip [output.json]");

const parseRow = (row) => {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  return values;
};

const csv = execFileSync("unzip", ["-p", archive, "stops.txt"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const [headerRow, ...rows] = csv.trim().split(/\r?\n/);
const header = parseRow(headerRow);
const positions = Object.fromEntries(header.map((name, index) => [name, index]));
const seen = new Set();
const stops = [];

for (const row of rows) {
  const fields = parseRow(row);
  const lat = Number(fields[positions.stop_lat]);
  const lon = Number(fields[positions.stop_lon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 47.2 || lat > 48.3 || lon < 9.2 || lon > 13.9) continue;
  const id = fields[positions.parent_station] || fields[positions.stop_id];
  const key = `${id}:${fields[positions.stop_name]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  stops.push({ id, name: fields[positions.stop_name], lat, lon });
}

stops.sort((first, second) => first.name.localeCompare(second.name, "de"));
writeFileSync(output, `${JSON.stringify({
  meta: {
    source: "GTFS.de regional rail Germany (DELFI e.V.)",
    sourceUrl: "https://download.gtfs.de/germany/rv_free/latest.zip",
    licence: "Creative Commons 4.0",
    extractedAt: new Date().toISOString().slice(0, 10),
    coverage: "Regional-rail stops inside the Alpine Bavaria/foothills bounding box 47.2–48.3 N, 9.2–13.9 E",
    caveat: "Static timetable locations; not a live journey planner. Valle d’Aosta has no verified regional GTFS feed in this revision.",
  },
  stops,
}, null, 2)}\n`);
console.log(`Wrote ${stops.length} deduplicated Bavarian regional-rail stops to ${output}`);
