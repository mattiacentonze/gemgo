import destinationData from "../data/destinations.json";
import { experiences as curatedExperiences } from "./data";
import type {
  CrowdLevel,
  Difficulty,
  Experience,
  ExperienceKind,
  ValidationLevel,
} from "./types";

type PublicDestination = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  destination_type: string;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const contains = (value: string, pattern: RegExp) => pattern.test(value.toLowerCase());

const kindsFor = (type: string): ExperienceKind[] => {
  const kinds = new Set<ExperienceKind>();
  if (contains(type, /lake|reservoir|wetland|water/)) kinds.add("water");
  if (contains(type, /route|trail|valley|nature|reserve|mountain|pass|viewpoint|hill/)) {
    kinds.add("nature");
  }
  if (contains(type, /route|trail|mountain|pass|valley/)) kinds.add("hiking");
  if (contains(type, /village|town/)) kinds.add("villages");
  if (contains(type, /castle|cultur|historic|archaeological|monastery|religious|fortified/)) {
    kinds.add("culture");
  }
  if (contains(type, /wine|market|village/)) kinds.add("food");
  if (contains(type, /car-free|lake village|market town/)) kinds.add("family");
  if (contains(type, /village|town|cultur|castle|archaeological/)) kinds.add("accessible");
  if (kinds.size === 0) kinds.add("nature");
  return [...kinds];
};

const difficultyFor = (type: string): Difficulty =>
  contains(type, /mountain pass|shoulder trail|scenic route|hidden valley|nature reserve/)
    ? "moderate"
    : "easy";

const crowdFor = (seed: number): CrowdLevel => {
  const value = seed % 10;
  if (value <= 4) return "low";
  if (value <= 8) return "moderate";
  return "high";
};

const crowdWindowFor = (seed: number) => {
  const starts = ["08:00", "09:30", "13:30", "14:30", "15:00"];
  const start = starts[seed % starts.length];
  const startHour = Number(start.slice(0, 2));
  return `${start}–${String(Math.min(19, startHour + 3)).padStart(2, "0")}:${start.slice(3)}`;
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

const summaryFor = (destination: PublicDestination, kinds: ExperienceKind[]) => {
  const focus = kinds.includes("culture")
    ? "heritage, local streets and independent services"
    : kinds.includes("water")
      ? "waterfront scenery, short walks and flexible stops"
      : kinds.includes("villages")
        ? "village life, local services and nearby landscape"
        : "landscape, outdoor time and a flexible route";
  return `${destination.name} is included in GemGo's existing public pilot catalogue. This data-based experience combines ${focus} and is presented as a lower-pressure alternative subject to local validation.`;
};

const adaptDestination = (destination: PublicDestination): Experience => {
  const seed = hashString(destination.id);
  const kinds = kindsFor(destination.destination_type);
  const difficulty = difficultyFor(destination.destination_type);
  const durationMinutes = 75 + (seed % 7) * 20;
  const crowd = crowdFor(seed);
  const crowdWindow = crowdWindowFor(seed);
  const points = 45 + (seed % 6) * 5;
  const travelBase = 18 + (seed % 38);
  const validation: ValidationLevel = "Data-based suggestion";

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
    travel: {
      walking: travelBase < 25 ? travelBase * 3 : null,
      bicycle: travelBase * 2,
      public: travelBase + 18,
      car: travelBase,
      mixed: travelBase + 12,
    },
    durationMinutes,
    crowd,
    crowdWindow,
    confidence: "Low",
    updated: "Catalogue estimate",
    validation,
    imageTone: toneFor(destination.destination_type),
    summary: summaryFor(destination, kinds),
    reasons: [
      "Part of the existing GemGo pilot catalogue",
      "Compatible with a flexible Alpine visit",
      crowd === "low" ? "Lower estimated pressure" : "An off-peak window is available",
    ],
    tradeoffs: [
      "Operational details require local confirmation",
      "Crowd conditions are estimated, not live occupancy",
    ],
    comparison: {
      original: "A nearby major Alpine hotspot",
      reachDifference: "Travel difference depends on the selected origin",
      advantages: [
        "Potentially lower visitor pressure",
        "Opportunity to distribute local spending",
        "More flexible visit timing",
      ],
    },
    itinerary: [
      { time: "00:00", label: `Leave from your selected starting point` },
      { time: "+travel", label: `Arrive at ${destination.name}` },
      { time: "+30m", label: `Begin the recommended ${destination.destination_type.toLowerCase()} experience` },
      { time: `+${Math.max(60, durationMinutes - 30)}m`, label: "Optional local stop and return" },
    ],
    mobility: [
      "Road travel can be recalculated from the selected origin",
      "Public transport availability requires provider confirmation",
      "Parking and seasonal access are not yet confirmed",
    ],
    localBenefit: `A visit to ${destination.name} can distribute time and spending beyond the main tourism corridors of ${destination.region}.`,
    safety: [
      "Check official local conditions before departure",
      difficulty === "moderate" ? "Outdoor footwear and route awareness recommended" : "Generally suitable for a flexible visit",
      "Seasonal restrictions may apply",
    ],
    points,
    crowdByHour: [
      { time: "09:00", level: seed % 3 === 0 ? "low" : "moderate" },
      { time: "12:00", level: crowd === "high" ? "high" : "moderate" },
      { time: "15:00", level: crowd === "low" ? "low" : "moderate" },
      { time: "17:00", level: "low" },
    ],
  };
};

const publicDestinations = (destinationData as { destinations: PublicDestination[] }).destinations;
const curatedNames = new Set(curatedExperiences.map((experience) => experience.name.toLocaleLowerCase()));
const catalogueExperiences = publicDestinations
  .filter((destination) => !curatedNames.has(destination.name.toLocaleLowerCase()))
  .map(adaptDestination);

export const allExperiences: Experience[] = [...curatedExperiences, ...catalogueExperiences];

export const catalogueSummary = publicDestinations.reduce<Record<string, number>>((summary, destination) => {
  summary[destination.region] = (summary[destination.region] ?? 0) + 1;
  return summary;
}, {});

export const totalCatalogueEntries = allExperiences.length;
