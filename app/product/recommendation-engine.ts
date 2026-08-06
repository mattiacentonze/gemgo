import { parsePrompt } from "../lib/prompt-parser.mjs";
import type {
  Experience,
  ExperienceKind,
  SearchPreferences,
  TransportMode,
} from "./types";

export type OriginPoint = { label: string; lat: number; lng: number };
export type WeatherContext = {
  temperature?: number;
  precipitationProbability?: number;
  weatherCode?: number;
  source: "live" | "unavailable";
};

export type RankedExperience = {
  experience: Experience;
  score: number;
  label: "Best match" | "Quietest choice" | "Most local impact";
  travelMinutes: number | null;
  reasons: string[];
};

const interestMap: Record<string, ExperienceKind[]> = {
  lakes: ["water", "nature"],
  quiet: ["nature", "villages"],
  culture: ["culture", "villages"],
  views: ["nature", "hiking"],
  nature: ["nature", "hiking"],
};

const legacyTransportToMode: Record<string, TransportMode> = {
  walking: "walking",
  cycling: "bicycle",
  e_bike: "bicycle",
  driving: "car",
  public_transport: "public",
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = <T,>(items: T[]) => [...new Set(items)];

const parseAvailableWindow = (prompt: string) => {
  const normalized = normalize(prompt);
  if (/\b(half day|mezza giornata|halber tag|demi journee|pol dneva)\b/.test(normalized)) {
    return "half" as const;
  }
  if (/\b(full day|whole day|giornata intera|ganzer tag|journee entiere|cel dan)\b/.test(normalized)) {
    return "full" as const;
  }
  if (/\b(multiple days|piu giorni|mehrere tage|plusieurs jours|vec dni)\b/.test(normalized)) {
    return "multi" as const;
  }
  const hours = normalized.match(/\b(\d{1,2})\s*(hours?|hrs?|ore|stunden?|heures?|ur)\b/);
  if (hours) return Number(hours[1]) <= 2 ? ("short" as const) : Number(hours[1]) <= 5 ? ("half" as const) : ("full" as const);
  return undefined;
};

const parseTimeWindow = (prompt: string) => {
  const matches = [...prompt.matchAll(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\b/g)]
    .map((match) => `${String(Number(match[1])).padStart(2, "0")}:${match[2] ?? "00"}`)
    .slice(0, 2);
  return { from: matches[0], to: matches[1] };
};

const parseNeeds = (prompt: string) => {
  const text = normalize(prompt);
  const needs: string[] = [];
  if (/\b(children|kids|family|bambini|famiglia|kinder|familie|enfants|famille|otroci|druzina)\b/.test(text)) needs.push("Children");
  if (/\b(dog|dogs|cane|cani|hund|hunde|chien|chiens|pes|psom)\b/.test(text)) needs.push("Dog");
  if (/\b(wheelchair|reduced mobility|mobilita ridotta|rollstuhl|mobilite reduite|invalidski vozicek)\b/.test(text)) needs.push("Reduced mobility");
  if (/\b(stroller|passeggino|kinderwagen|poussette|vozicek)\b/.test(text)) needs.push("Stroller");
  if (/\b(no exposed paths|senza sentieri esposti|keine ausgesetzten wege|sans passages exposes|brez izpostavljenih poti)\b/.test(text)) needs.push("No exposed paths");
  if (/\b(indoor|al coperto|innen|interieur|notranj)\b/.test(text)) needs.push("Indoor alternative");
  if (/\b(low cost|cheap|economico|kostengunstig|pas cher|poceni)\b/.test(text)) needs.push("Low-cost");
  return needs;
};

const parseOrigin = (prompt: string) => {
  const patterns = [
    /(?:staying|based|starting|leaving)\s+(?:in|near|from)\s+([\p{L}\s.'’-]{2,45}?)(?:,|\.|\bi have\b|\bwith\b|$)/iu,
    /(?:sono|parto|alloggio)\s+(?:a|da|vicino a)\s+([\p{L}\s.'’-]{2,45}?)(?:,|\.|\bho\b|$)/iu,
    /(?:ich bin|start in|start aus)\s+([\p{L}\s.'’-]{2,45}?)(?:,|\.|\bich habe\b|$)/iu,
    /(?:je suis|depart de|près de)\s+([\p{L}\s.'’-]{2,45}?)(?:,|\.|\bj ai\b|$)/iu,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

export const applyPromptToPreferences = (
  prompt: string,
  current: SearchPreferences,
): SearchPreferences => {
  const parsed = parsePrompt(prompt);
  const kinds = unique(
    parsed.interests.flatMap((interest: string) => interestMap[interest] ?? []),
  );
  const parsedWindow = parseAvailableWindow(prompt);
  const timeWindow = parseTimeWindow(prompt);
  const origin = parseOrigin(prompt);
  return {
    ...current,
    prompt,
    origin: origin ?? current.origin,
    transport: parsed.transport ? legacyTransportToMode[parsed.transport] ?? current.transport : current.transport,
    availableTime: parsedWindow ?? (parsed.days && parsed.days > 1 ? "multi" : current.availableTime),
    availableFrom: timeWindow.from ?? current.availableFrom,
    availableTo: timeWindow.to ?? current.availableTo,
    kinds: kinds.length > 0 ? kinds : current.kinds,
    difficulty:
      parsed.difficulty === "moderate"
        ? "moderate"
        : parsed.difficulty === "easy"
          ? "easy"
          : current.difficulty,
    needs: unique([...current.needs, ...parseNeeds(prompt)]),
  };
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineKm = (from: OriginPoint, experience: Experience) => {
  const earthRadius = 6371;
  const latitudeDelta = toRadians(experience.latitude - from.lat);
  const longitudeDelta = toRadians(experience.longitude - from.lng);
  const startLatitude = toRadians(from.lat);
  const endLatitude = toRadians(experience.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const estimateTravelMinutes = (
  origin: OriginPoint | null,
  experience: Experience,
  transport: TransportMode,
) => {
  if (!origin) return experience.travel[transport] ?? null;
  const distance = haversineKm(origin, experience);
  const speeds: Record<TransportMode, number> = {
    walking: 4.5,
    bicycle: 15,
    public: 28,
    car: 52,
    mixed: 24,
  };
  const accessMinutes: Record<TransportMode, number> = {
    walking: 0,
    bicycle: 5,
    public: 22,
    car: 8,
    mixed: 16,
  };
  return Math.round((distance / speeds[transport]) * 60 + accessMinutes[transport]);
};

const availableMinutes = (preferences: SearchPreferences) => {
  const presets: Record<SearchPreferences["availableTime"], number> = {
    short: 120,
    half: 300,
    full: 600,
    multi: 1440,
  };
  if (preferences.availableFrom && preferences.availableTo) {
    const [fromHour, fromMinute] = preferences.availableFrom.split(":").map(Number);
    const [toHour, toMinute] = preferences.availableTo.split(":").map(Number);
    const difference = toHour * 60 + toMinute - (fromHour * 60 + fromMinute);
    if (difference > 0) return difference;
  }
  return presets[preferences.availableTime];
};

const needFit = (experience: Experience, need: string) => {
  if (need === "Children") return experience.kind.includes("family") || experience.difficulty === "easy";
  if (need === "Dog") return experience.kind.some((kind) => kind === "nature" || kind === "hiking" || kind === "villages");
  if (need === "Reduced mobility") return experience.kind.includes("accessible") && experience.difficulty === "easy";
  if (need === "Stroller") return experience.kind.includes("accessible") && experience.difficulty === "easy";
  if (need === "No exposed paths") return experience.difficulty === "easy";
  if (need === "Indoor alternative") return experience.kind.includes("culture");
  if (need === "Low-cost") return !experience.partner || experience.kind.includes("nature");
  return true;
};

const scoreExperience = (
  experience: Experience,
  preferences: SearchPreferences,
  origin: OriginPoint | null,
  weather: WeatherContext,
  routeTimes: Record<string, number>,
) => {
  const travelMinutes = routeTimes[experience.id] ?? estimateTravelMinutes(origin, experience, preferences.transport);
  const selectedKinds = preferences.kinds.length > 0 ? preferences.kinds : ["nature"];
  const kindMatches = experience.kind.filter((kind) => selectedKinds.includes(kind)).length;
  const totalWindow = availableMinutes(preferences);
  const totalRequired = experience.durationMinutes + (travelMinutes ?? 0) * 2;
  const allNeedsFit = preferences.needs.every((need) => needFit(experience, need));

  let score = kindMatches * 20;
  if (experience.difficulty === preferences.difficulty) score += 14;
  else if (preferences.difficulty === "easy" && experience.difficulty === "challenging") score -= 28;
  if (travelMinutes !== null && travelMinutes <= preferences.maxTravelMinutes) score += 22;
  else if (travelMinutes !== null) score -= Math.min(35, travelMinutes - preferences.maxTravelMinutes);
  if (totalRequired <= totalWindow) score += 18;
  else score -= Math.min(30, Math.round((totalRequired - totalWindow) / 10));
  if (experience.crowd === "low") score += 18;
  if (experience.crowd === "moderate") score += 6;
  if (experience.crowd === "high") score -= 14;
  if (allNeedsFit) score += preferences.needs.length * 8;
  else score -= 35;
  if ((weather.precipitationProbability ?? 0) >= 50) {
    if (experience.kind.includes("culture")) score += 12;
    if (experience.kind.includes("hiking") && !experience.kind.includes("culture")) score -= 10;
  }
  if (experience.validation === "Verified Gem") score += 8;
  if (experience.validation === "Locally reviewed") score += 5;
  if (experience.partner) score += 4;

  return { score, travelMinutes, allNeedsFit, totalRequired, totalWindow };
};

const reasonsFor = (
  experience: Experience,
  preferences: SearchPreferences,
  travelMinutes: number | null,
  weather: WeatherContext,
) => {
  const reasons: string[] = [];
  const matchedKinds = experience.kind.filter((kind) => preferences.kinds.includes(kind));
  if (matchedKinds.length > 0) reasons.push(`Matches your ${matchedKinds.slice(0, 2).join(" and ")} interests`);
  if (travelMinutes !== null && travelMinutes <= preferences.maxTravelMinutes) reasons.push(`Reachable in about ${travelMinutes} minutes`);
  if (experience.crowd === "low") reasons.push(`Lower estimated crowd during ${experience.crowdWindow}`);
  else reasons.push(`A lower-pressure arrival window is available`);
  if ((weather.precipitationProbability ?? 0) >= 50 && experience.kind.includes("culture")) reasons.push("More resilient to expected rain");
  if (preferences.needs.length > 0 && preferences.needs.every((need) => needFit(experience, need))) reasons.push("Compatible with your specific needs");
  return unique([...reasons, ...experience.reasons]).slice(0, 4);
};

export const rankExperiences = (
  experiences: Experience[],
  preferences: SearchPreferences,
  options: {
    origin: OriginPoint | null;
    weather: WeatherContext;
    routeTimes?: Record<string, number>;
  },
): RankedExperience[] => {
  const routeTimes = options.routeTimes ?? {};
  const scored = experiences
    .map((experience) => {
      const result = scoreExperience(experience, preferences, options.origin, options.weather, routeTimes);
      return {
        experience,
        score: result.score,
        travelMinutes: result.travelMinutes,
        allNeedsFit: result.allNeedsFit,
        reasons: reasonsFor(experience, preferences, result.travelMinutes, options.weather),
      };
    })
    .filter((item) => item.allNeedsFit)
    .sort((first, second) => second.score - first.score);

  const source = scored.length >= 3 ? scored : experiences
    .map((experience) => {
      const result = scoreExperience(experience, preferences, options.origin, options.weather, routeTimes);
      return {
        experience,
        score: result.score,
        travelMinutes: result.travelMinutes,
        allNeedsFit: result.allNeedsFit,
        reasons: reasonsFor(experience, preferences, result.travelMinutes, options.weather),
      };
    })
    .sort((first, second) => second.score - first.score);

  const best = source[0];
  const quietest = source
    .filter((item) => item.experience.id !== best?.experience.id)
    .sort((first, second) => {
      const crowdOrder = { low: 0, moderate: 1, high: 2 };
      return crowdOrder[first.experience.crowd] - crowdOrder[second.experience.crowd] || second.score - first.score;
    })[0];
  const excludedIds = new Set([best?.experience.id, quietest?.experience.id]);
  const localImpact = source
    .filter((item) => !excludedIds.has(item.experience.id))
    .sort((first, second) => {
      const impact = (item: typeof first) =>
        (item.experience.partner ? 12 : 0) +
        (item.experience.validation === "Verified Gem" ? 8 : item.experience.validation === "Locally reviewed" ? 5 : 0) +
        item.score * 0.2;
      return impact(second) - impact(first);
    })[0];

  return [
    best && { ...best, label: "Best match" as const },
    quietest && { ...quietest, label: "Quietest choice" as const },
    localImpact && { ...localImpact, label: "Most local impact" as const },
  ].filter((item): item is RankedExperience => Boolean(item));
};
