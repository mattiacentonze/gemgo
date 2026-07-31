export const locales = ["en", "it", "de", "fr", "sl"] as const;
export type Locale = (typeof locales)[number];

export const localeCodes: Record<Locale, string> = {
  en: "en-GB",
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
  sl: "sl-SI",
};

export const transportCodes = [
  "walking",
  "cycling",
  "e_bike",
  "driving",
  "public_transport",
] as const;
export type TransportCode = (typeof transportCodes)[number];

export const interestCodes = [
  "lakes",
  "quiet",
  "culture",
  "views",
  "nature",
  "cycling",
  "swimming",
  "hiking",
  "sunset",
  "picnic",
  "castles",
  "water",
  "local_places",
] as const;
export type InterestCode = (typeof interestCodes)[number];

export const primaryInterestCodes = [
  "lakes",
  "quiet",
  "culture",
  "views",
  "nature",
] as const satisfies readonly InterestCode[];

export const regionCodes = [
  "all",
  "fussen_allgau",
  "bavaria",
  "aosta",
] as const;
export type RegionCode = (typeof regionCodes)[number];

export const difficultyCodes = ["easy", "moderate"] as const;
export type DifficultyCode = (typeof difficultyCodes)[number];

export const crowdCodes = ["low", "moderate", "busy"] as const;
export type CrowdCode = (typeof crowdCodes)[number];

export const placeKindCodes = [
  "lake",
  "nature",
  "culture",
  "viewpoint",
  "route",
  "mountain",
  "local_place",
] as const;
export type PlaceKindCode = (typeof placeKindCodes)[number];

export type Destination = {
  id: string;
  name: string;
  kind: PlaceKindCode;
  sourceKind?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  visitMinutes: number;
  popularity: number;
  difficulty: DifficultyCode;
  tags: InterestCode[];
  region: Exclude<RegionCode, "all">;
};

const legacyInterests: Record<string, InterestCode> = {
  lakes: "lakes",
  lake: "lakes",
  "quiet places": "quiet",
  quiet: "quiet",
  culture: "culture",
  views: "views",
  view: "views",
  nature: "nature",
  cycling: "cycling",
  bike: "cycling",
  swimming: "swimming",
  hiking: "hiking",
  sunset: "sunset",
  picnic: "picnic",
  castles: "castles",
  castle: "castles",
  water: "water",
  "local places": "local_places",
};

export const canonicalInterest = (value: unknown): InterestCode | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replaceAll("-", "_");
  if ((interestCodes as readonly string[]).includes(normalized)) {
    return normalized as InterestCode;
  }
  return legacyInterests[value.trim().toLowerCase()] ?? null;
};

export const canonicalTransport = (value: unknown): TransportCode => {
  if (typeof value !== "string") return "public_transport";
  const normalized = value.trim().toLowerCase().replaceAll("-", "_");
  const legacy: Record<string, TransportCode> = {
    public: "public_transport",
    transit: "public_transport",
    walking: "walking",
    cycling: "cycling",
    e_bike: "e_bike",
    ebike: "e_bike",
    driving: "driving",
  };
  return legacy[normalized] ?? "public_transport";
};

export const canonicalRegion = (value: unknown): RegionCode => {
  if (typeof value !== "string") return "all";
  const normalized = value.trim().toLowerCase();
  if (normalized === "bavaria" || normalized === "bayern") return "bavaria";
  if (
    normalized === "valle d’aosta" ||
    normalized === "valle d'aosta" ||
    normalized === "aosta"
  ) {
    return "aosta";
  }
  if (
    normalized === "füssen / allgäu" ||
    normalized === "fussen / allgau" ||
    normalized === "fussen_allgau"
  ) {
    return "fussen_allgau";
  }
  return (regionCodes as readonly string[]).includes(normalized)
    ? (normalized as RegionCode)
    : "all";
};

export const canonicalDifficulty = (value: unknown): DifficultyCode =>
  typeof value === "string" && value.toLowerCase() === "moderate"
    ? "moderate"
    : "easy";

export const canonicalCrowd = (value: unknown): CrowdCode => {
  if (typeof value !== "string") return "moderate";
  const normalized = value.toLowerCase();
  if (normalized === "low") return "low";
  if (normalized === "busy") return "busy";
  return "moderate";
};

export const inferPlaceKind = (value: string): PlaceKindCode => {
  const kind = value.toLowerCase();
  if (/lake|reservoir|water|wetland/.test(kind)) return "lake";
  if (/castle|cultural|historic|archaeological|heritage|monastery/.test(kind)) {
    return "culture";
  }
  if (/view|panorama|scenic/.test(kind)) return "viewpoint";
  if (/route|trail|path|walk/.test(kind)) return "route";
  if (/mountain|pass|hill|peak/.test(kind)) return "mountain";
  if (/nature|valley|forest|reserve|park/.test(kind)) return "nature";
  return "local_place";
};

export const publicTagsForKind = (value: string): InterestCode[] => {
  const kind = inferPlaceKind(value);
  const map: Record<PlaceKindCode, InterestCode[]> = {
    lake: ["lakes", "nature"],
    nature: ["nature", "quiet"],
    culture: ["culture"],
    viewpoint: ["views", "nature"],
    route: ["hiking", "nature"],
    mountain: ["views", "nature"],
    local_place: ["local_places"],
  };
  return map[kind];
};
