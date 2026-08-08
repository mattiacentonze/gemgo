import { writeFileSync } from "node:fs";

const areas = [
  { region: "Valle d'Aosta", country: "Italy", boxes: [[45.45, 6.75, 45.72, 7.35], [45.45, 7.35, 45.72, 7.95], [45.72, 6.75, 45.98, 7.35], [45.72, 7.35, 45.98, 7.95]] },
  { region: "Bavaria", country: "Germany", boxes: [[47.2, 9.3, 47.75, 10.45], [47.2, 10.45, 47.75, 11.6], [47.2, 11.6, 47.75, 12.75], [47.2, 12.75, 47.75, 13.9], [47.75, 9.3, 48.3, 10.45], [47.75, 10.45, 48.3, 11.6], [47.75, 11.6, 48.3, 12.75], [47.75, 12.75, 48.3, 13.9]] },
];
const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

const queryFor = (box) => `[out:json][timeout:40];(nwr["name"]["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"](${box.join(",")});nwr["name"]["historic"~"castle|ruins|archaeological_site|monument"](${box.join(",")});nwr["name"]["natural"~"peak|waterfall|cave_entrance|spring"](${box.join(",")}););out center tags;`;

const fetchBox = async (box) => {
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);
      const body = new URLSearchParams({ data: queryFor(box) });
      const response = await fetch(endpoint, { method: "POST", body, signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) continue;
      return (await response.json()).elements ?? [];
    } catch {
      // Try the next public mirror. A failed box never produces invented records.
    }
  }
  return [];
};

const results = [];
for (const area of areas) {
  for (const box of area.boxes) {
    const elements = await fetchBox(box);
    for (const element of elements) {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (!element.tags?.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      results.push({
        id: `osm-${element.type}-${element.id}`,
        osmType: element.type,
        osmId: element.id,
        name: element.tags.name,
        region: area.region,
        country: area.country,
        latitude: lat,
        longitude: lon,
        category: element.tags.tourism ?? element.tags.historic ?? element.tags.natural,
        website: element.tags.website ?? element.tags["contact:website"] ?? null,
        wikidata: element.tags.wikidata ?? null,
        wikipedia: element.tags.wikipedia ?? null,
      });
    }
  }
}

const unique = [...new Map(results.map((item) => [item.id, item])).values()].sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
if (unique.length === 0) throw new Error("No Overpass records were returned; existing catalogue left untouched.");
writeFileSync("app/data/osm-tourism-pois.json", `${JSON.stringify({ meta: { source: "OpenStreetMap via Overpass API", licence: "ODbL 1.0", attribution: "© OpenStreetMap contributors", extractedAt: new Date().toISOString(), scope: "Named tourism, historic and selected natural POIs in the configured Valle d'Aosta and Alpine Bavaria bounding boxes", recordCount: unique.length }, locations: unique }, null, 2)}\n`);
console.log(`Downloaded ${unique.length} named open tourism POIs`);
