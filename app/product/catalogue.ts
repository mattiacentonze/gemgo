import alpifyData from "../data/alpify-locations.json";
import destinationData from "../data/destinations.json";
import { catalogueEditorial } from "./catalogue-editorial";
import { curatedScenarioExperiences } from "./curated-alternatives";
import { BASE_VISIT_POINTS } from "./gempoints";
import type {
  CrowdLevel,
  Difficulty,
  Experience,
  ExperienceKind,
  ValidationLevel,
} from "./types";

type CatalogueSource = "official-team" | "alpify";

export const pilotRegions = ["Bavaria", "Valle d’Aosta"] as const;
export type PilotRegion = (typeof pilotRegions)[number];

export const catalogueMetadata = {
  scope: "Hackathon prototype catalogue",
  officialTeam: {
    acquiredAt: "2026-06-07",
    source: "GemGo team-curated pilot dataset",
    usage:
      "Prototype use; operational details require local verification before production",
  },
  alpify: {
    acquiredAt: "2026-08-07",
    source: "Alpify hackathon repository dataset",
    usage: "Hackathon demo data; deduplicated against the team catalogue",
  },
  eusAlp: {
    memberRegions: 48,
    pilotRegions,
    source: "https://alpine-region.eu/about/territories",
  },
} as const;

export type PublicDestination = {
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
  source?: CatalogueSource;
  sourceOrNotes?: string;
};

type AlpifyLocation = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  crowdingLevel: "Low" | "Medium" | "High";
  basePoints: number;
  bikeWalkBonus: number;
  estimatedVisitTimeMin: number;
  familyFriendly: boolean;
  accessNotes: string;
  sourceOrNotes: string;
};

const contains = (value: string, pattern: RegExp) =>
  pattern.test(value.toLowerCase());

const normalizePlaceName = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(castle|ruin|path|trail|the|of)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const identityAliases: Record<string, string> = {
  partnachklamm: "partnachklamm shoulder trails",
};

const excludedAlpifyIds = new Set(["ruin-ehrenberg"]);

const canonicalRegion = (region: string): PilotRegion | null => {
  if (region === "Bavaria") return "Bavaria";
  if (region === "Valle d'Aosta" || region === "Valle d’Aosta") {
    return "Valle d’Aosta";
  }
  return null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceKm = (first: PublicDestination, second: PublicDestination) => {
  const earthRadiusKm = 6371;
  const lat = toRadians(second.latitude - first.latitude);
  const lng = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(lng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const tokenSimilarity = (first: string, second: string) => {
  const firstTokens = new Set(normalizePlaceName(first).split(" ").filter(Boolean));
  const secondTokens = new Set(normalizePlaceName(second).split(" ").filter(Boolean));
  const union = new Set([...firstTokens, ...secondTokens]);
  if (union.size === 0) return 0;
  const shared = [...firstTokens].filter((token) => secondTokens.has(token));
  return shared.length / union.size;
};

const samePlace = (first: PublicDestination, second: PublicDestination) => {
  const firstName = normalizePlaceName(first.name);
  const secondName = normalizePlaceName(second.name);
  const canonicalFirst = identityAliases[firstName] ?? firstName;
  const canonicalSecond = identityAliases[secondName] ?? secondName;
  if (canonicalFirst === canonicalSecond) return true;
  return distanceKm(first, second) <= 0.8 && tokenSimilarity(first.name, second.name) >= 0.5;
};

const popularityFor = (level: AlpifyLocation["crowdingLevel"]) =>
  level === "High" ? 0.68 : level === "Medium" ? 0.34 : 0.12;

const adaptAlpifyLocation = (location: AlpifyLocation): PublicDestination => {
  return {
    id: `alpify-${location.id}`,
    name: location.name,
    region: "Bavaria",
    country: "Germany",
    latitude: location.lat,
    longitude: location.lng,
    destination_type: location.category,
    popularity_score: popularityFor(location.crowdingLevel),
    hidden_gem_score: Math.min(1, Math.max(0, location.basePoints / 10)),
    sustainability_score: Math.min(
      1,
      Math.max(0.2, (location.bikeWalkBonus + (location.familyFriendly ? 1 : 0)) / 5),
    ),
    description: location.description,
    tags: [
      location.category,
      location.crowdingLevel,
      location.familyFriendly ? "family" : "outdoor",
      location.accessNotes,
    ],
    source: "alpify",
    sourceOrNotes: location.sourceOrNotes,
  };
};

export const mergeAlpineCatalogues = (
  official: PublicDestination[],
  alpify: PublicDestination[],
) => {
  const merged: PublicDestination[] = official.map((destination) => ({
    ...destination,
    source: "official-team" as const,
  }));
  const duplicateIds: string[] = [];
  for (const candidate of alpify) {
    if (merged.some((existing) => samePlace(existing, candidate))) {
      duplicateIds.push(candidate.id);
      continue;
    }
    merged.push(candidate);
  }
  return { merged, duplicateIds };
};

const officialDestinations = (
  destinationData as { destinations: PublicDestination[] }
).destinations.flatMap((destination) => {
  const region = canonicalRegion(destination.region);
  return region ? [{ ...destination, region }] : [];
});
const alpifySource = alpifyData as AlpifyLocation[];
const alpifyDestinations = alpifySource
  .filter((location) => !excludedAlpifyIds.has(location.id))
  .map(adaptAlpifyLocation);
const catalogueMerge = mergeAlpineCatalogues(
  officialDestinations,
  alpifyDestinations,
);

export const officialCatalogueEntries = officialDestinations.length;
export const alpifySourceEntries = alpifySource.length;
export const alpifyExcludedEntries =
  alpifySourceEntries - alpifyDestinations.length;
export const excludedAlpifyLocationIds = [...excludedAlpifyIds];
export const alpifyDuplicateEntries = catalogueMerge.duplicateIds.length;
export const alpifyAddedEntries =
  alpifyDestinations.length - alpifyDuplicateEntries;
export const duplicateAlpifyIds = catalogueMerge.duplicateIds;

const kindsFor = (destination: PublicDestination): ExperienceKind[] => {
  const value = `${destination.destination_type} ${destination.tags.join(" ")}`;
  const kinds = new Set<ExperienceKind>();
  if (contains(value, /lake|reservoir|wetland|water|swim/)) kinds.add("water");
  if (
    contains(
      value,
      /route|trail|valley|nature|reserve|mountain|pass|viewpoint|hill|wildlife|waterfall|gorge/,
    )
  )
    kinds.add("nature");
  if (
    contains(
      value,
      /route|trail|mountain|pass|valley|hiking|walk|waterfall|gorge/,
    )
  )
    kinds.add("hiking");
  if (contains(value, /village|town/)) kinds.add("villages");
  if (
    contains(
      value,
      /castle|cultur|historic|archaeological|monastery|religious|fortified|heritage|museum|ruin/,
    )
  )
    kinds.add("culture");
  if (contains(value, /castle|castello|château|schloss|burg|fortress|fortified|ruin/))
    kinds.add("castle");
  if (contains(value, /museum|museo|musée|heritage centre|visitor centre/))
    kinds.add("museum");
  if (contains(value, /wine|market|food|cuisine/)) kinds.add("food");
  if (contains(value, /family|easy|car-free|lake village|market town/))
    kinds.add("family");
  if (
    contains(
      value,
      /village|town|cultur|castle|archaeological|train|cable car|accessible/,
    )
  )
    kinds.add("accessible");
  if (contains(value, /ski|winter/)) kinds.add("winter");
  if (kinds.size === 0) kinds.add("nature");
  return [...kinds];
};

const difficultyFor = (destination: PublicDestination): Difficulty =>
  contains(
    `${destination.destination_type} ${destination.description} ${destination.tags.join(" ")}`,
    /mountain pass|shoulder trail|summit|steep|high-altitude|hidden valley|fitness required|uneven terrain/,
  )
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
  if (contains(type, /castle|cultur|historic|archaeological|monastery|religious|ruin/))
    return "culture";
  if (contains(type, /forest|reserve|nature|waterfall|gorge/)) return "forest";
  if (contains(type, /village|town/)) return "village";
  return "valley";
};

const demoComparison: Record<string, Experience["comparison"]> = {
  bav_020: {
    original: "Neuschwanstein Castle",
    reachDifference: "About 30 minutes by road",
    advantages: [
      "Comparable castle experience",
      "Lower estimated pressure",
      "Free hilltop access",
    ],
  },
  bav_013: {
    original: "Mittenwald",
    reachDifference: "About 35 minutes by road",
    advantages: [
      "Quieter valley setting",
      "Working farms and local services",
      "Flexible walking",
    ],
  },
  bav_014: {
    original: "Busy lakes near Munich",
    reachDifference: "Varies by starting point",
    advantages: [
      "Protected chain of lakes",
      "Cycling and wild swimming",
      "Lower estimated pressure",
    ],
  },
  vda_005: {
    original: "Central Aosta and Pila",
    reachDifference: "About 28 minutes by road",
    advantages: [
      "Quieter valley setting",
      "Local food traditions",
      "Flexible trails",
    ],
  },
  vda_002: {
    original: "Breuil-Cervinia",
    reachDifference: "About 35 minutes by road",
    advantages: [
      "Car-free village",
      "Cable-car access",
      "Lower traffic pressure",
    ],
  },
  vda_013: {
    original: "Aosta historic centre",
    reachDifference: "About 20 minutes by road",
    advantages: [
      "Distinct Roman heritage",
      "Short focused visit",
      "Supports a smaller local area",
    ],
  },
};

export const demoAlternativeIds = {
  bavaria: ["catalogue-bav_020", "catalogue-bav_013", "catalogue-bav_014"],
  aosta: ["catalogue-vda_005", "catalogue-vda_002", "catalogue-vda_013"],
} as const;

const adaptDestination = (destination: PublicDestination): Experience => {
  const editorial = catalogueEditorial[destination.id];
  if (!editorial) {
    throw new Error(`Missing editorial catalogue entry for ${destination.id}`);
  }
  const displayName = editorial.name ?? destination.name;
  const kinds = kindsFor(destination);
  const difficulty = difficultyFor(destination);
  const crowd = crowdFor(destination);
  const durationMinutes =
    difficulty === "moderate" ? 180 : kinds.includes("culture") ? 105 : 135;
  const points = BASE_VISIT_POINTS;
  const validation: ValidationLevel = "Data-based suggestion";
  const comparison = demoComparison[destination.id] ?? {
    original: "A better-known nearby Alpine destination",
    reachDifference: "Calculated from your selected starting point",
    advantages: [
      "Potentially lower visitor pressure",
      "Opportunity to distribute local spending",
      "A more flexible visit",
    ],
  };
  const isAlpify = destination.source === "alpify";

  return {
    id: `catalogue-${destination.id}`,
    name: displayName,
    promise: editorial.caption,
    region: destination.region,
    country: destination.country,
    kind: kinds,
    destinationType: destination.destination_type,
    tags: [...destination.tags, ...editorial.seasons.map((season) => `season:${season}`)],
    catalogueSource: destination.source ?? "official-team",
    seasons: editorial.seasons,
    peakSeasons: editorial.peakSeasons,
    editorialSourceUrl: editorial.sourceUrl,
    editorialSourceLabel: editorial.sourceLabel,
    operationalNote: editorial.operationalNote,
    difficulty,
    latitude: destination.latitude,
    longitude: destination.longitude,
    travel: {
      walking: null,
      bicycle: null,
      public: null,
      car: null,
      mixed: null,
    },
    durationMinutes,
    crowd,
    crowdWindow:
      crowd === "high"
        ? "08:00–10:00"
        : crowd === "moderate"
          ? "09:00–12:00"
          : "10:00–16:00",
    confidence: "Low",
    updated: `${isAlpify ? "Alpify prototype entry" : "GemGo team entry"} · editorial check 8 August 2026`,
    validation,
    imageTone: toneFor(destination.destination_type),
    summary: editorial.caption,
    reasons: [
      isAlpify
        ? `Curated Alpify entry for ${destination.region}`
        : `Official ${destination.region} pilot entry`,
      `Factual caption checked against ${editorial.sourceLabel}`,
      `Suitable seasons: ${editorial.seasons.join(", ")}`,
    ],
    tradeoffs: [
      editorial.operationalNote ?? "Operational details require local confirmation",
      "Crowd levels are prototype estimates, not live occupancy",
    ],
    comparison,
    itinerary: [
      { time: "00:00", label: "Leave from your selected starting point" },
      { time: "+travel", label: `Arrive at ${displayName}` },
      {
        time: "+30m",
        label: `Begin the ${destination.destination_type.toLowerCase()} experience`,
      },
      { time: `+${durationMinutes}m`, label: "Optional local stop and return" },
    ],
    mobility: [
      "Road travel is recalculated from your origin",
      "Public transport requires a verified provider route",
      "Check seasonal access before departure",
    ],
    localBenefit: `A visit to ${displayName} can distribute time and spending beyond the main tourism corridors of ${destination.region}.`,
    safety: [
      "Check official local conditions before departure",
      difficulty === "moderate"
        ? "Outdoor footwear and route awareness recommended"
        : "Generally suitable for a flexible visit",
      "Seasonal restrictions may apply",
    ],
    points,
    crowdByHour: [
      { time: "09:00", level: crowd === "high" ? "moderate" : "low" },
      { time: "12:00", level: crowd },
      { time: "15:00", level: crowd === "low" ? "low" : "moderate" },
      { time: "17:00", level: "low" },
    ],
  };
};

export const catalogueDestinations = catalogueMerge.merged;
export const catalogueExperiences: Experience[] = catalogueDestinations.map(
  adaptDestination,
);
export const allExperiences: Experience[] = [...catalogueExperiences, ...curatedScenarioExperiences];

export const catalogueSummary = catalogueDestinations.reduce<
  Record<string, number>
>((summary, destination) => {
  summary[destination.region] = (summary[destination.region] ?? 0) + 1;
  return summary;
}, {});

export const totalCatalogueEntries = catalogueExperiences.length;
export const totalCuratedScenarioEntries = curatedScenarioExperiences.length;
export const totalMappedPrototypeLocations = allExperiences.length;
