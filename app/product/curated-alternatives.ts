import { BASE_VISIT_POINTS } from "./gempoints.ts";
import type { Experience, ExperienceKind, SearchPreferences, Season } from "./types";

type CuratedPlace = {
  id: string;
  name: string;
  region: "Bavaria" | "Valle d’Aosta";
  country: "Germany" | "Italy";
  latitude: number;
  longitude: number;
  caption: string;
  kind: ExperienceKind[];
  durationMinutes: number;
  seasons: Season[];
  peakSeasons: Season[];
  sourceUrl: string;
  sourceLabel: string;
  operationalNote?: string;
  crowd?: Experience["crowd"];
  difficulty?: Experience["difficulty"];
  imageTone?: Experience["imageTone"];
};

export type CuratedScenarioAlternative = {
  id: string;
  travelNote: string;
  accessNote?: string;
};

export type CuratedScenario = {
  id: string;
  hotspot: string;
  aliases: string[];
  alternatives: CuratedScenarioAlternative[];
  provenance: string;
};

const green: Season[] = ["spring", "summer", "autumn"];
const all: Season[] = ["spring", "summer", "autumn", "winter"];

const places: CuratedPlace[] = [
  { id: "expert-bosco-peuterey", name: "Bosco del Peuterey", region: "Valle d’Aosta", country: "Italy", latitude: 45.789, longitude: 6.91, caption: "A larch-wood setting in Val Veny, served by Courmayeur’s seasonal valley transport and connected to walking routes.", kind: ["nature", "hiking"], durationMinutes: 120, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.courmayeurmontblanc.it/en/once-you-re-here/", sourceLabel: "Courmayeur Mont Blanc tourism", operationalNote: "Val Veny access and shuttle service are seasonal; use the current timetable.", imageTone: "forest" },
  { id: "expert-big-bench-la-salle", name: "Big Bench La Salle", region: "Valle d’Aosta", country: "Italy", latitude: 45.754, longitude: 7.073, caption: "A hillside panoramic bench above La Salle, reached by a short local walk through the Mont Blanc-facing landscape.", kind: ["nature", "hiking", "family"], durationMinutes: 75, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.lasallemontblanc.com/", sourceLabel: "La Salle Mont Blanc tourism", imageTone: "valley" },
  { id: "expert-lenteney", name: "Lenteney Waterfall", region: "Valle d’Aosta", country: "Italy", latitude: 45.721, longitude: 7.105, caption: "The Lenteney stream drops through the Derby woodland near La Salle and is visible from a short roadside access area.", kind: ["nature", "water", "family"], durationMinutes: 60, seasons: green, peakSeasons: ["spring", "summer"], sourceUrl: "https://www.lasallemontblanc.com/", sourceLabel: "La Salle Mont Blanc tourism", operationalNote: "Keep to the signed viewing access and check wet or icy conditions.", imageTone: "forest" },
  { id: "expert-chatel-argent", name: "Châtel-Argent", region: "Valle d’Aosta", country: "Italy", latitude: 45.704, longitude: 7.209, caption: "A walking itinerary above Villeneuve links the Châtel-Argent fortifications, Romanesque churches and the circular keep.", kind: ["culture", "castle", "hiking"], durationMinutes: 90, seasons: green, peakSeasons: ["spring", "summer", "autumn"], sourceUrl: "https://www.grand-paradis.it/en/cultural-spaces/ch%C3%A2tel-argent", sourceLabel: "Fondation Grand Paradis", imageTone: "culture" },
  { id: "expert-lillaz-falls", name: "Lillaz Waterfalls", region: "Valle d’Aosta", country: "Italy", latitude: 45.594, longitude: 7.394, caption: "A short path from Lillaz follows the Urtier torrent past a sequence of waterfalls and rocky viewpoints.", kind: ["nature", "water", "hiking", "family"], durationMinutes: 90, seasons: green, peakSeasons: ["spring", "summer"], sourceUrl: "https://www.visitcogne.it/en/", sourceLabel: "Cogne tourism", operationalNote: "Upper sections can be steep, wet or icy; check the local path status.", crowd: "moderate", imageTone: "forest" },
  { id: "expert-etrubles", name: "Étroubles", region: "Valle d’Aosta", country: "Italy", latitude: 45.821, longitude: 7.231, caption: "Étroubles is a compact medieval village on the Via Francigena with an open-air art route through its historic streets.", kind: ["villages", "culture", "accessible"], durationMinutes: 90, seasons: all, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.italia.it/en/aosta-valley/etroubles", sourceLabel: "Italia.it", imageTone: "village" },
  { id: "expert-doues-aqueduct", name: "Doues Aqueduct Gallery", region: "Valle d’Aosta", country: "Italy", latitude: 45.819, longitude: 7.307, caption: "A historic water-channel gallery near Doues forms part of the area’s irrigation heritage and hillside walking network.", kind: ["culture", "hiking", "nature"], durationMinutes: 90, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.lovevda.it/en/database/7/one-day-excursions/doues/", sourceLabel: "Aosta Valley tourism", operationalNote: "Confirm the precise route, gallery access and current path condition locally.", difficulty: "moderate", imageTone: "culture" },
  { id: "expert-niel", name: "Niel", region: "Valle d’Aosta", country: "Italy", latitude: 45.724, longitude: 7.862, caption: "Niel is a small Walser hamlet above Gaby and a starting point for signed routes through the upper Niel valley.", kind: ["villages", "nature", "hiking"], durationMinutes: 120, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://visitmonterosa.com/en/locality/niel/", sourceLabel: "Visit Monterosa", operationalNote: "The mountain road and onward trails require a current-condition check.", imageTone: "village" },
  { id: "expert-pont-saint-martin", name: "Pont-Saint-Martin Roman Bridge", region: "Valle d’Aosta", country: "Italy", latitude: 45.596, longitude: 7.798, caption: "The single-span Roman bridge crosses the Lys in the centre of Pont-Saint-Martin and remains part of the town’s street network.", kind: ["culture", "accessible"], durationMinutes: 60, seasons: all, peakSeasons: ["spring", "summer", "autumn"], sourceUrl: "https://www.lovevda.it/en/database/8/roman-architecture/pont-saint-martin/roman-bridge/941", sourceLabel: "Aosta Valley tourism", imageTone: "culture" },

  { id: "expert-speiden", name: "Speiden", region: "Bavaria", country: "Germany", latitude: 47.607, longitude: 10.599, caption: "Speiden is a small Ostallgäu village near the Eisenberg castle landscape and its local walking routes.", kind: ["villages", "culture", "hiking"], durationMinutes: 75, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.eisenberg-allgaeu.de/", sourceLabel: "Eisenberg municipality", imageTone: "village" },
  { id: "expert-eisenberg-ruin", name: "Eisenberg Castle Ruin", region: "Bavaria", country: "Germany", latitude: 47.612, longitude: 10.593, caption: "Eisenberg is one of two neighbouring hilltop ruins above Zell, reached by a signed uphill walk.", kind: ["castle", "culture", "hiking"], durationMinutes: 90, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.burgenregion.de/burgen/burgen-eisenberg-hohenfreyberg/", sourceLabel: "Allgäu-Außerfern castle region", difficulty: "moderate", imageTone: "culture" },
  { id: "expert-hohenfreyberg-ruin", name: "Hohenfreyberg Castle Ruin", region: "Bavaria", country: "Germany", latitude: 47.6138, longitude: 10.5877, caption: "Hohenfreyberg is the western ruin on the twin hilltop site and lies a short walk from Eisenberg Castle Ruin.", kind: ["castle", "culture", "hiking"], durationMinutes: 75, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.burgenregion.de/burgen/burgen-eisenberg-hohenfreyberg/", sourceLabel: "Allgäu-Außerfern castle region", difficulty: "moderate", imageTone: "culture" },
  { id: "expert-aschauerweiher", name: "Aschauerweiher", region: "Bavaria", country: "Germany", latitude: 47.65, longitude: 12.957, caption: "Aschauerweiher in Bischofswiesen is a natural bathing area in summer and a Nordic-sport centre in winter.", kind: ["water", "nature", "family", "winter"], durationMinutes: 120, seasons: all, peakSeasons: ["summer", "winter"], sourceUrl: "https://www.berchtesgaden.de/en/nature/aschauerweiher", sourceLabel: "Berchtesgadener Land tourism", crowd: "moderate", imageTone: "lake" },
  { id: "expert-kastensteinerwand", name: "Kastensteinerwand", region: "Bavaria", country: "Germany", latitude: 47.657, longitude: 12.954, caption: "A signed uphill route from Bischofswiesen reaches the Kastensteinerwand viewpoint above the valley.", kind: ["nature", "hiking"], durationMinutes: 120, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.berchtesgaden.de/en/touren/kastensteinerwand", sourceLabel: "Berchtesgadener Land tourism", operationalNote: "The approach includes a steep walking section; choose footwear and route for current conditions.", difficulty: "moderate", imageTone: "valley" },
  { id: "expert-hoeglwoerther-see", name: "Höglwörther See", region: "Bavaria", country: "Germany", latitude: 47.823, longitude: 12.91, caption: "Höglwörther See is a small foothill lake beside the former Augustinian monastery at Höglwörth.", kind: ["water", "culture", "nature", "family"], durationMinutes: 105, seasons: green, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.berchtesgaden.de/en/region/hoeglwoerther-see", sourceLabel: "Berchtesgadener Land tourism", imageTone: "lake" },
  { id: "expert-barmsee", name: "Barmsee", region: "Bavaria", country: "Germany", latitude: 47.501, longitude: 11.251, caption: "Barmsee near Krün has an easy circular route, mountain views and links toward Grubsee.", kind: ["water", "nature", "hiking", "family"], durationMinutes: 105, seasons: all, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.alpenwelt-karwendel.de/en/a-winter-hike-to-lake-barmsee-and-lake-grubsee", sourceLabel: "Alpenwelt Karwendel", crowd: "moderate", imageTone: "lake" },
  { id: "expert-grubsee", name: "Grubsee", region: "Bavaria", country: "Germany", latitude: 47.4937, longitude: 11.2476, caption: "Grubsee is a small lake south of Barmsee with a managed bathing area and walking links toward Krün.", kind: ["water", "nature", "family"], durationMinutes: 75, seasons: green, peakSeasons: ["summer"], sourceUrl: "https://www.zugspitz-region.de/poi/grubsee", sourceLabel: "Zugspitz Region", imageTone: "lake" },
  { id: "expert-kruen", name: "Krün", region: "Bavaria", country: "Germany", latitude: 47.5057, longitude: 11.2784, caption: "Krün is a village base for the Karwendel foothills, Buckelwiesen meadows and walking or cycling routes between nearby lakes.", kind: ["villages", "nature", "hiking", "family"], durationMinutes: 105, seasons: all, peakSeasons: ["summer", "winter"], sourceUrl: "https://www.alpenwelt-karwendel.de/en/kruen", sourceLabel: "Alpenwelt Karwendel", imageTone: "village" },
  { id: "expert-tinninger-see", name: "Tinninger See", region: "Bavaria", country: "Germany", latitude: 47.8244, longitude: 12.2051, caption: "Tinninger See is a moor lake near Riedering with a circular path, rest points and a managed bathing area.", kind: ["water", "nature", "family"], durationMinutes: 90, seasons: green, peakSeasons: ["summer"], sourceUrl: "https://www.chiemsee-alpenland.de/entdecken/alle-sehenswuerdigkeiten/tinningersee-f3cb46d576", sourceLabel: "Chiemsee-Alpenland tourism", imageTone: "lake" },
  { id: "expert-simsseemoos", name: "Simsseemoos", region: "Bavaria", country: "Germany", latitude: 47.869, longitude: 12.232, caption: "Simsseemoos is a protected wetland landscape beside Simssee, intended for observation from permitted paths.", kind: ["nature", "hiking"], durationMinutes: 90, seasons: green, peakSeasons: ["spring", "autumn"], sourceUrl: "https://www.chiemsee-alpenland.de/entdecken/natur/simssee", sourceLabel: "Chiemsee-Alpenland tourism", operationalNote: "Remain on permitted paths and respect seasonal habitat protections.", imageTone: "forest" },
  { id: "expert-riedering", name: "Riedering", region: "Bavaria", country: "Germany", latitude: 47.838, longitude: 12.207, caption: "Riedering is a rural municipality between Simssee and the Chiemgau foothills with local village and walking routes.", kind: ["villages", "nature", "family"], durationMinutes: 90, seasons: all, peakSeasons: ["summer", "autumn"], sourceUrl: "https://www.riedering.de/tourismus", sourceLabel: "Riedering municipality", imageTone: "village" },
];

const toExperience = (place: CuratedPlace): Experience => {
  const crowd = place.crowd ?? "low";
  const difficulty = place.difficulty ?? "easy";
  return {
    id: place.id,
    name: place.name,
    promise: place.caption,
    region: place.region,
    country: place.country,
    kind: place.kind,
    destinationType: "Tourism-expert contest scenario",
    tags: [...place.kind, ...place.seasons.map((season) => `season:${season}`)],
    catalogueSource: "team-expert",
    seasons: place.seasons,
    peakSeasons: place.peakSeasons,
    editorialSourceUrl: place.sourceUrl,
    editorialSourceLabel: place.sourceLabel,
    operationalNote: place.operationalNote,
    difficulty,
    latitude: place.latitude,
    longitude: place.longitude,
    travel: { walking: null, bicycle: null, public: null, car: null, mixed: null },
    durationMinutes: place.durationMinutes,
    crowd,
    crowdWindow: crowd === "moderate" ? "09:00–11:00" : "10:00–16:00",
    confidence: "Low",
    updated: "Tourism-expert contest scenario · 8 August 2026",
    validation: "Locally reviewed",
    imageTone: place.imageTone ?? "valley",
    summary: place.caption,
    reasons: ["Recommended in the GemGo team tourism-expert scenario", `Caption checked against ${place.sourceLabel}`, `Suitable seasons: ${place.seasons.join(", ")}`],
    tradeoffs: [place.operationalNote ?? "Check current access and opening conditions", "Road times in this contest scenario are team estimates, not live routing"],
    comparison: { original: "Overcrowded hotspot selected in the contest scenario", reachDifference: "Team-estimated from the previous stop", advantages: ["Expert-curated thematic fit", "Distributes the itinerary across nearby places", "Transparent access and season notes"] },
    itinerary: [{ time: "00:00", label: "Leave from the previous stop" }, { time: "+travel", label: `Arrive at ${place.name}` }, { time: "+15m", label: "Follow the signed local visit route" }, { time: `+${place.durationMinutes}m`, label: "Continue or return" }],
    mobility: ["Compare the current route before departure", "Walking, bicycle and public-transport visits earn mobility bonuses", place.operationalNote ?? "Confirm local access conditions"],
    localBenefit: `This contest scenario redirects time and potential spending from a hotspot toward ${place.name}.`,
    safety: ["Check official local conditions before departure", difficulty === "moderate" ? "Outdoor footwear and route awareness recommended" : "Use signed visitor routes", place.operationalNote ?? "Seasonal conditions may change"],
    points: BASE_VISIT_POINTS,
    crowdByHour: [{ time: "09:00", level: "low" }, { time: "12:00", level: crowd }, { time: "15:00", level: crowd }, { time: "17:00", level: "low" }],
  };
};

export const curatedScenarioExperiences = places.map(toExperience);

export const curatedScenarios: CuratedScenario[] = [
  { id: "courmayeur", hotspot: "Courmayeur", aliases: ["courmayeur"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-bosco-peuterey", travelNote: "Seasonal shuttle from Courmayeur", accessNote: "Public transport qualifies for the mobility bonus" },
    { id: "expert-big-bench-la-salle", travelNote: "About 28 min by car from Courmayeur" },
    { id: "expert-lenteney", travelNote: "About 18 min by car from the Big Bench" },
    { id: "expert-chatel-argent", travelNote: "About 13 min by car from Lenteney Waterfall" },
  ] },
  { id: "cogne", hotspot: "Cogne", aliases: ["cogne"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-lillaz-falls", travelNote: "About 6 min by car from Cogne" },
    { id: "catalogue-vda_013", travelNote: "About 30 min by car from Lillaz" },
    { id: "catalogue-vda_007", travelNote: "About 41 min by car from Pont d’Aël" },
  ] },
  { id: "aosta", hotspot: "Aosta", aliases: ["aosta"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "catalogue-vda_022", travelNote: "About 3 min by car from Aosta" },
    { id: "expert-etrubles", travelNote: "About 21 min by car from MegaMuseo" },
    { id: "catalogue-vda_009", travelNote: "About 26 min by car from Étroubles" },
    { id: "expert-doues-aqueduct", travelNote: "About 21 min by car from Ollomont" },
  ] },
  { id: "gressoney", hotspot: "Gressoney", aliases: ["gressoney", "gressoney-saint-jean"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-niel", travelNote: "About 23 min by car from Gressoney" },
    { id: "catalogue-vda_014", travelNote: "About 22 min by car from Niel" },
    { id: "expert-pont-saint-martin", travelNote: "About 14 min by car from Fontainemore" },
  ] },
  { id: "neuschwanstein", hotspot: "Neuschwanstein", aliases: ["neuschwanstein"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-speiden", travelNote: "About 25 min by car from Neuschwanstein" },
    { id: "expert-eisenberg-ruin", travelNote: "About 10 min by car from Speiden" },
    { id: "expert-hohenfreyberg-ruin", travelNote: "Very close to Eisenberg; continue on foot", accessNote: "Walking qualifies for the highest mobility bonus" },
  ] },
  { id: "koenigssee", hotspot: "Königssee", aliases: ["königssee", "konigssee", "koenigssee"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-aschauerweiher", travelNote: "About 20 min by car from Königssee" },
    { id: "expert-kastensteinerwand", travelNote: "About 5–10 min by car from Aschauerweiher, then continue on foot" },
    { id: "expert-hoeglwoerther-see", travelNote: "About 25 min by car from Kastensteinerwand" },
  ] },
  { id: "eibsee-zugspitze", hotspot: "Eibsee / Zugspitze", aliases: ["eibsee", "zugspitze"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-barmsee", travelNote: "About 30 min by car from Eibsee" },
    { id: "expert-grubsee", travelNote: "About 5 min by car from Barmsee" },
    { id: "expert-kruen", travelNote: "About 5 min by car from Grubsee" },
  ] },
  { id: "chiemsee", hotspot: "Chiemsee", aliases: ["chiemsee"], provenance: "GemGo team tourism-expert sequence for the contest prototype", alternatives: [
    { id: "expert-tinninger-see", travelNote: "About 25–30 min by car from Chiemsee" },
    { id: "expert-simsseemoos", travelNote: "About 10 min by car from Tinninger See" },
    { id: "expert-riedering", travelNote: "About 5–10 min by car from Simsseemoos" },
  ] },
];

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const curatedScenarioFor = (preferences: Pick<SearchPreferences, "origin" | "prompt">) => {
  const input = normalize(`${preferences.origin} ${preferences.prompt}`);
  return curatedScenarios.find((scenario) => scenario.aliases.some((alias) => input.includes(normalize(alias))));
};

export const curatedAlternativeFor = (scenario: CuratedScenario | undefined, experienceId: string) =>
  scenario?.alternatives.find((alternative) => alternative.id === experienceId);
