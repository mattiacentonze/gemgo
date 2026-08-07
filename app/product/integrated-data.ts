import destinationData from "../data/destinations.json";
import bavariaTransitData from "../data/gtfs-bavaria-regional-stops.json";
import type { CrowdLevel, Difficulty, Experience, ExperienceKind, ValidationLevel } from "./types";

type PublicDestination = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  destination_type: string;
  popularity_score: number;
  hidden_gem_score: number;
  sustainability_score: number;
  description: string;
  tags: string[];
};

const contains = (value: string, pattern: RegExp) => pattern.test(value.toLowerCase());

const kindsFor = (destination: PublicDestination): ExperienceKind[] => {
  const value = `${destination.destination_type} ${destination.tags.join(" ")}`;
  const kinds = new Set<ExperienceKind>();
  if (contains(value, /lake|reservoir|wetland|water|swim/)) kinds.add("water");
  if (contains(value, /route|trail|valley|nature|reserve|mountain|pass|viewpoint|hill|wildlife/)) kinds.add("nature");
  if (contains(value, /route|trail|mountain|pass|valley|hiking|walk/)) kinds.add("hiking");
  if (contains(value, /village|town/)) kinds.add("villages");
  if (contains(value, /castle|cultur|historic|archaeological|monastery|religious|fortified|heritage|museum/)) kinds.add("culture");
  if (contains(value, /wine|market|food|cuisine/)) kinds.add("food");
  if (contains(value, /family|easy|car-free|lake village|market town/)) kinds.add("family");
  if (contains(value, /village|town|cultur|castle|archaeological|train/)) kinds.add("accessible");
  if (contains(value, /ski|winter/)) kinds.add("winter");
  if (kinds.size === 0) kinds.add("nature");
  return [...kinds];
};

const difficultyFor = (destination: PublicDestination): Difficulty =>
  contains(`${destination.destination_type} ${destination.description}`, /mountain pass|shoulder trail|summit|steep|high-altitude|hidden valley/)
    ? "moderate"
    : "easy";

const crowdFor = (destination: PublicDestination): CrowdLevel => {
  if (destination.name === "Mittenwald") return "high";
  if (destination.popularity_score >= 0.45) return "high";
  if (destination.popularity_score >= 0.22) return "moderate";
  return "low";
};

const toneFor = (type: string): Experience["imageTone"] => {
  if (contains(type, /lake|reservoir|wetland/)) return "lake";
  if (contains(type, /castle|cultur|historic|archaeological|monastery|religious/)) return "culture";
  if (contains(type, /forest|reserve|nature/)) return "forest";
  if (contains(type, /village|town/)) return "village";
  return "valley";
};

const promiseFor = (destination: PublicDestination, kinds: ExperienceKind[]) => {
  if (kinds.includes("water")) return `A calmer Alpine water experience around ${destination.name}`;
  if (kinds.includes("culture")) return `Local heritage and an unhurried visit to ${destination.name}`;
  if (kinds.includes("villages")) return `A slower village experience in ${destination.name}`;
  if (kinds.includes("hiking")) return `A flexible outdoor route around ${destination.name}`;
  return `A quieter way to experience ${destination.name}`;
};

const demoComparison: Record<string, Experience["comparison"]> = {
  bav_020: { original: "Neuschwanstein Castle", reachDifference: "About 30 minutes by road", advantages: ["Comparable castle experience", "Lower estimated pressure", "Free hilltop access"] },
  bav_013: { original: "Mittenwald", reachDifference: "About 35 minutes by road", advantages: ["Quieter valley setting", "Working farms and local services", "Flexible walking"] },
  bav_014: { original: "Busy lakes near Munich", reachDifference: "Varies by starting point", advantages: ["Protected chain of lakes", "Cycling and wild swimming", "Lower estimated pressure"] },
  vda_005: { original: "Central Aosta and Pila", reachDifference: "About 28 minutes by road", advantages: ["Quieter valley setting", "Local food traditions", "Flexible trails"] },
  vda_002: { original: "Breuil-Cervinia", reachDifference: "About 35 minutes by road", advantages: ["Car-free village", "Cable-car access", "Lower traffic pressure"] },
  vda_013: { original: "Aosta historic centre", reachDifference: "About 20 minutes by road", advantages: ["Distinct Roman heritage", "Short focused visit", "Supports a smaller local area"] },
};

export const demoAlternativeIds = {
  bavaria: ["catalogue-bav_020", "catalogue-bav_013", "catalogue-bav_014"],
  aosta: ["catalogue-vda_005", "catalogue-vda_002", "catalogue-vda_013"],
} as const;

const adaptDestination = (destination: PublicDestination): Experience => {
  const kinds = kindsFor(destination);
  const difficulty = difficultyFor(destination);
  const crowd = crowdFor(destination);
  const durationMinutes = difficulty === "moderate" ? 180 : kinds.includes("culture") ? 105 : 135;
  const points = Math.round(35 + destination.hidden_gem_score * 20 + destination.sustainability_score * 20);
  const validation: ValidationLevel = "Data-based suggestion";
  const comparison = demoComparison[destination.id] ?? {
    original: "A better-known nearby Alpine destination",
    reachDifference: "Calculated from your selected starting point",
    advantages: ["Potentially lower visitor pressure", "Opportunity to distribute local spending", "A more flexible visit"],
  };

  return {
    id: `catalogue-${destination.id}`,
    name: destination.name,
    promise: promiseFor(destination, kinds),
    region: destination.region,
    country: destination.country,
    kind: kinds,
    difficulty,
    latitude: destination.latitude,
    longitude: destination.longitude,
    travel: { walking: null, bicycle: null, public: null, car: null, mixed: null },
    durationMinutes,
    crowd,
    crowdWindow: crowd === "high" ? "08:00–10:00" : crowd === "moderate" ? "09:00–12:00" : "10:00–16:00",
    confidence: "Low",
    updated: "Official team dataset · 7 June 2026",
    validation,
    imageTone: toneFor(destination.destination_type),
    summary: destination.description,
    reasons: [
      `Official ${destination.region} pilot entry`,
      `Hidden-gem score ${Math.round(destination.hidden_gem_score * 100)} / 100`,
      `Sustainability score ${Math.round(destination.sustainability_score * 100)} / 100`,
    ],
    tradeoffs: ["Operational details require local confirmation", "Crowd levels are prototype estimates, not live occupancy"],
    comparison,
    itinerary: [
      { time: "00:00", label: "Leave from your selected starting point" },
      { time: "+travel", label: `Arrive at ${destination.name}` },
      { time: "+30m", label: `Begin the ${destination.destination_type.toLowerCase()} experience` },
      { time: `+${durationMinutes}m`, label: "Optional local stop and return" },
    ],
    mobility: ["Road travel is recalculated from your origin", "Public transport requires a verified provider route", "Check seasonal access before departure"],
    localBenefit: `A visit to ${destination.name} can distribute time and spending beyond the main tourism corridors of ${destination.region}.`,
    safety: ["Check official local conditions before departure", difficulty === "moderate" ? "Outdoor footwear and route awareness recommended" : "Generally suitable for a flexible visit", "Seasonal restrictions may apply"],
    points,
    crowdByHour: [
      { time: "09:00", level: crowd === "high" ? "moderate" : "low" },
      { time: "12:00", level: crowd },
      { time: "15:00", level: crowd === "low" ? "low" : "moderate" },
      { time: "17:00", level: "low" },
    ],
  };
};

const publicDestinations = (destinationData as { destinations: PublicDestination[] }).destinations;
export const allExperiences: Experience[] = publicDestinations.map(adaptDestination);

export const catalogueSummary = publicDestinations.reduce<Record<string, number>>((summary, destination) => {
  summary[destination.region] = (summary[destination.region] ?? 0) + 1;
  return summary;
}, {});

export const totalCatalogueEntries = allExperiences.length;

type TransitStop = { id: string; name: string; lat: number; lon: number };

export const nearestGtfsStop = (experience: Experience) => {
  if (experience.country !== "Germany") return null;
  let nearest: (TransitStop & { distanceKm: number }) | null = null;
  for (const stop of (bavariaTransitData as { stops: TransitStop[] }).stops) {
    const latitude = (stop.lat - experience.latitude) * 111;
    const longitude = (stop.lon - experience.longitude) * 111 * Math.cos((experience.latitude * Math.PI) / 180);
    const distanceKm = Math.hypot(latitude, longitude);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { ...stop, distanceKm };
  }
  return nearest;
};

export const gtfsMetadata = (bavariaTransitData as { meta: Record<string, string> }).meta;
