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
  | "winter";
export type Difficulty = "easy" | "moderate" | "challenging";
export type CrowdLevel = "low" | "moderate" | "high";
export type ValidationLevel = "Data-based suggestion" | "Locally reviewed" | "Verified Gem";

export type Experience = {
  id: string;
  name: string;
  promise: string;
  region: string;
  country: string;
  kind: ExperienceKind[];
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
  maxTravelMinutes: number;
  transport: TransportMode;
  availableTime: "short" | "half" | "full" | "multi";
  availableFrom: string;
  availableTo: string;
  kinds: ExperienceKind[];
  difficulty: Difficulty;
  needs: string[];
};

export type TripState = {
  experienceId: string;
  plannedDeparture: string;
  acceptedGemDrop: boolean;
  verified: boolean;
};
