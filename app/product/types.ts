export type AppSection = "explore" | "trip" | "rewards" | "about";
export type ExploreStage = "brief" | "results" | "experience";
export type TransportMode = "walking" | "bicycle" | "public" | "car" | "mixed";
export type ExperienceKind =
  | "hiking"
  | "nature"
  | "villages"
  | "culture"
  | "water"
  | "food"
  | "family"
  | "accessible"
  | "winter"
  | "castle"
  | "museum";
export type Difficulty = "easy" | "moderate" | "challenging";
export type CrowdLevel = "low" | "moderate" | "high";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type ValidationLevel = "Data-based suggestion" | "Locally reviewed" | "Verified Gem";

export type Experience = {
  id: string;
  name: string;
  promise: string;
  region: string;
  country: string;
  kind: ExperienceKind[];
  destinationType?: string;
  tags?: string[];
  catalogueSource?: "official-team" | "alpify" | "team-expert";
  seasons?: Season[];
  peakSeasons?: Season[];
  editorialSourceUrl?: string;
  editorialSourceLabel?: string;
  operationalNote?: string;
  difficulty: Difficulty;
  latitude: number;
  longitude: number;
  travel: Record<TransportMode, number | null>;
  durationMinutes: number;
  crowd: CrowdLevel;
  crowdWindow: string;
  confidence: "Low" | "Medium" | "High";
  updated: string;
  validation: ValidationLevel;
  imageTone: "lake" | "valley" | "village" | "forest" | "culture" | "winter";
  summary: string;
  reasons: string[];
  tradeoffs: string[];
  comparison: {
    original: string;
    reachDifference: string;
    advantages: string[];
  };
  itinerary: Array<{ time: string; label: string }>;
  mobility: string[];
  localBenefit: string;
  partner?: string;
  safety: string[];
  points: number;
  crowdByHour: Array<{ time: string; level: CrowdLevel }>;
};

export type SearchPreferences = {
  prompt: string;
  origin: string;
  region: "Bavaria" | "Valle d’Aosta" | null;
  maxTravelMinutes: number;
  originMode?: "far" | "gps" | "place";
  transport: TransportMode;
  availableTime: "short" | "half" | "full" | "multi";
  availableFrom: string;
  availableTo: string;
  startsAt?: string;
  endsAt?: string;
  kinds: ExperienceKind[];
  requiredKinds: ExperienceKind[];
  avoidCrowds: boolean;
  difficulty: Difficulty;
  needs: string[];
};

export type TripState = {
  experienceId: string;
  experienceIds?: string[];
  plannedDeparture: string;
  maxLegMinutes?: number;
  legTransport?: TransportMode;
  acceptedGemDrop: boolean;
  verified: boolean;
  verifiedExperienceIds?: string[];
  verificationRecords?: Array<{
    experienceId: string;
    verifiedAt: string;
    status: "demo" | "verified";
    source: "gps" | "qr" | "manual-demo" | "activity-demo";
    provider?: "strava" | "garmin" | "apple-health" | "health-connect";
    actualTransport?: TransportMode;
    awardedPoints: number;
  }>;
};
