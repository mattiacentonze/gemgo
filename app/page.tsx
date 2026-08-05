"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  BellOff,
  BookmarkPlus,
  Camera,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  CloudSun,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Gem,
  Globe2,
  History,
  Info,
  Linkedin,
  LoaderCircle,
  LogIn,
  MapPin,
  Navigation,
  Pencil,
  Route,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  UserPlus,
  UserRoundCheck,
  Volume2,
  VolumeX,
  WalletCards,
  X,
} from "lucide-react";
import alpineData from "./data/destinations.json";
import DestinationMap from "./components/DestinationMap";
import DestinationPhoto from "./components/DestinationPhoto";
import GemContributionForm from "./components/GemContributionForm";
import LiquidMobileNav from "./components/LiquidMobileNav";
import {
  accommodations,
  officialDestinationUrl,
  team,
} from "./content";
import {
  canonicalCrowd,
  canonicalInterest,
  canonicalRegion,
  canonicalTransport,
  inferPlaceKind,
  localeCodes,
  locales,
  primaryInterestCodes,
  publicTagsForKind,
  regionCodes,
  transportCodes,
  type CrowdCode,
  type Destination,
  type DifficultyCode,
  type InterestCode,
  type Locale,
  type RegionCode,
  type TransportCode,
} from "./domain";
import {
  languageOptions,
  msg,
  plural,
  promptSuggestions,
} from "./i18n/catalogs.mjs";
import {
  isValidParseResult,
  parsePrompt,
} from "./lib/prompt-parser.mjs";
import { inferDestinationRegion } from "./lib/destination-region";
import { formatDuration, regionOrigins, validStartDate } from "./lib/travel.mjs";
import { geocodePlace } from "./lib/geo.mjs";

type Transport = TransportCode;
type Difficulty = DifficultyCode;
type Region = RegionCode;
type PromptParseResult = ReturnType<typeof parsePrompt>;

type WeatherDay = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
};

type Stop = Destination & {
  crowd: CrowdCode;
  crowdScore: number;
  suggestedTime: string;
  travelMinutes: number;
};

type PlanDay = {
  date: string;
  stops: Stop[];
  weather?: WeatherDay;
  distanceKm: number;
};

type AppPage =
  | "home"
  | "saved"
  | "gemdrop"
  | "points"
  | "gemdeals"
  | "notifications";


type GemNotification = {
  id: string;
  type: string;
  params?: Record<string, string | number>;
  bodyType?: string;
  bodyParams?: Record<string, string | number>;
  title?: string;
  body?: string;
  createdAt: string;
  read: boolean;
};

type PointEvent = {
  id: string;
  amount: number;
  reasonType: string;
  reasonParams?: Record<string, string | number>;
  reason?: string;
  createdAt: string;
  balanceAfter: number;
  status: "local" | "verified";
};

type PlanUndo = {
  previousPlan: PlanDay[];
};

type SavedPlan = {
  id: string;
  customName?: string;
  copyNumber?: number;
  name?: string;
  createdAt: string;
  updatedAt: string;
  region: Region;
  transport: Transport;
  interests: InterestCode[];
  plan: PlanDay[];
};

type ActionToast = {
  id: string;
  message: string;
  tone: "success" | "info" | "error";
  undo?: () => void;
};

type LocalizedState = {
  key: string;
  params?: Record<string, string | number>;
};

type CrowdDiversion = {
  avoided: Destination;
  alternative: Destination;
};

type DealCategory = "bar" | "restaurant" | "experience" | "activity";

const fussenDestinations = [
  {
    id: "hopfensee",
    name: "Hopfensee",
    kind: "lake" as const,
    lat: 47.6072,
    lng: 10.6728,
    distanceKm: 10,
    visitMinutes: 100,
    popularity: 3,
    difficulty: "easy" as const,
    tags: ["lakes", "quiet", "cycling", "sunset"] as InterestCode[],
  },
  {
    id: "weissensee",
    name: "Weißensee",
    kind: "lake" as const,
    lat: 47.5755,
    lng: 10.6243,
    distanceKm: 7,
    visitMinutes: 90,
    popularity: 2,
    difficulty: "easy" as const,
    tags: ["lakes", "quiet", "swimming", "nature"] as InterestCode[],
  },
  {
    id: "alatsee",
    name: "Alatsee",
    kind: "lake" as const,
    lat: 47.5529,
    lng: 10.6367,
    distanceKm: 8,
    visitMinutes: 80,
    popularity: 3,
    difficulty: "moderate" as const,
    tags: ["lakes", "quiet", "hiking", "nature"] as InterestCode[],
  },
  {
    id: "forggensee",
    name: "Forggensee",
    kind: "viewpoint" as const,
    lat: 47.6057,
    lng: 10.731,
    distanceKm: 13,
    visitMinutes: 110,
    popularity: 3,
    difficulty: "easy" as const,
    tags: ["lakes", "cycling", "picnic", "nature"] as InterestCode[],
  },
  {
    id: "neuschwanstein",
    name: "Neuschwanstein",
    kind: "culture" as const,
    lat: 47.5576,
    lng: 10.7498,
    distanceKm: 6,
    visitMinutes: 120,
    popularity: 5,
    difficulty: "moderate" as const,
    tags: ["culture", "views", "castles"] as InterestCode[],
  },
  {
    id: "lechfall",
    name: "Lechfall",
    kind: "nature" as const,
    lat: 47.5666,
    lng: 10.6895,
    distanceKm: 2,
    visitMinutes: 55,
    popularity: 4,
    difficulty: "easy" as const,
    tags: ["water", "hiking", "nature", "views"] as InterestCode[],
  },
  {
    id: "kalvarienberg",
    name: "Kalvarienberg",
    kind: "viewpoint" as const,
    lat: 47.5654,
    lng: 10.7004,
    distanceKm: 3,
    visitMinutes: 70,
    popularity: 2,
    difficulty: "moderate" as const,
    tags: ["views", "quiet", "hiking", "nature"] as InterestCode[],
  },
  {
    id: "faulenbacher-tal",
    name: "Faulenbacher Valley",
    kind: "route" as const,
    lat: 47.5605,
    lng: 10.6827,
    distanceKm: 4,
    visitMinutes: 90,
    popularity: 2,
    difficulty: "easy" as const,
    tags: ["quiet", "hiking", "nature", "lakes"] as InterestCode[],
  },
];

type AlpineSource = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  destination_type: string;
};

const sourceDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const publicDemoPopularity = (place: AlpineSource) => {
  const idNumber = Number(place.id.match(/\d+/)?.[0] ?? 1);
  const kind = place.destination_type.toLowerCase();
  const base = 2 + (idNumber % 3);
  return Math.min(5, base + (/castle|fortified/.test(kind) ? 1 : 0));
};

const alpineDestinations: Destination[] = (
  alpineData.destinations as AlpineSource[]
).map((place) => ({
  id: place.id,
  name: place.name,
  kind: inferPlaceKind(place.destination_type),
  sourceKind: place.destination_type,
  lat: place.latitude,
  lng: place.longitude,
  distanceKm: Math.max(
    2,
    Math.round(
      sourceDistanceKm(
        place.region === "Bavaria" ? 47.57 : 45.74,
        place.region === "Bavaria" ? 10.7 : 7.32,
        place.latitude,
        place.longitude,
      ),
    ),
  ),
  visitMinutes: 90,
  popularity: publicDemoPopularity(place),
  difficulty:
    /mountain|trail|pass|hill|valley/i.test(place.destination_type)
      ? "moderate"
      : "easy",
  tags: publicTagsForKind(place.destination_type),
  region: place.region === "Bavaria" ? "bavaria" : "aosta",
}));

const destinations: Destination[] = [
  ...fussenDestinations.map((place) => ({
    ...place,
    region: "fussen_allgau" as const,
  })),
  ...alpineDestinations,
];

const parseTripPrompt = (input: string, now?: Date): PromptParseResult => {
  const parsed = parsePrompt(input, now ? { now } : undefined);
  const inferredRegion = inferDestinationRegion(input, destinations);
  return inferredRegion && !parsed.region
    ? {
        ...parsed,
        region: inferredRegion,
        confidence: Math.max(parsed.confidence, 0.5),
      }
    : parsed;
};

const migratePlan = (value: unknown): PlanDay[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((day) => day && typeof day === "object")
    .map((rawDay) => {
      const day = rawDay as Partial<PlanDay> & { stops?: unknown[] };
      const stops = Array.isArray(day.stops)
        ? day.stops.flatMap((rawStop) => {
            if (!rawStop || typeof rawStop !== "object") return [];
            const legacy = rawStop as Partial<Stop> & { id?: unknown };
            const canonical = destinations.find(
              (destination) => destination.id === legacy.id,
            );
            if (!canonical) return [];
            return [
              {
                ...canonical,
                crowd: canonicalCrowd(legacy.crowd),
                crowdScore:
                  typeof legacy.crowdScore === "number"
                    ? legacy.crowdScore
                    : canonical.popularity,
                suggestedTime:
                  typeof legacy.suggestedTime === "string"
                    ? legacy.suggestedTime
                    : "09:00",
                travelMinutes:
                  typeof legacy.travelMinutes === "number"
                    ? legacy.travelMinutes
                    : 15,
              } satisfies Stop,
            ];
          })
        : [];
      return {
        date: typeof day.date === "string" ? day.date : today(),
        stops,
        weather: day.weather,
        distanceKm:
          typeof day.distanceKm === "number" ? day.distanceKm : 0,
      };
    });
};

const migratePointEvent = (value: unknown): PointEvent | null => {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Partial<PointEvent>;
  if (
    typeof legacy.id !== "string" ||
    typeof legacy.amount !== "number" ||
    typeof legacy.createdAt !== "string"
  ) {
    return null;
  }
  let reasonType = legacy.reasonType;
  let reasonParams = legacy.reasonParams;
  const reason = typeof legacy.reason === "string" ? legacy.reason : "";
  const placeMatch = reason.match(
    /(?:for|at|to)\s+(.+?)(?:\.|$)/i,
  );
  if (!reasonType) {
    if (/balance imported/i.test(reason)) reasonType = "event.imported";
    else if (/crowd report/i.test(reason)) reasonType = "event.crowdReport";
    else if (/demo check-in/i.test(reason)) reasonType = "event.demoCheckin";
    else if (/GPS check-in/i.test(reason)) reasonType = "event.gpsCheckin";
    else if (/visit photo/i.test(reason)) reasonType = "event.visitPhoto";
    else reasonType = "event.imported";
    if (placeMatch) reasonParams = { place: placeMatch[1] };
  }
  return {
    id: legacy.id,
    amount: legacy.amount,
    reasonType,
    reasonParams,
    createdAt: legacy.createdAt,
    balanceAfter:
      typeof legacy.balanceAfter === "number" ? legacy.balanceAfter : 0,
    status: legacy.status === "verified" ? "verified" : "local",
  };
};

const migrateNotification = (value: unknown): GemNotification | null => {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Partial<GemNotification>;
  if (typeof legacy.id !== "string" || typeof legacy.createdAt !== "string") {
    return null;
  }
  let type = legacy.type;
  let params = legacy.params;
  let bodyType = legacy.bodyType;
  let bodyParams = legacy.bodyParams;
  const title = typeof legacy.title === "string" ? legacy.title : "";
  const body = typeof legacy.body === "string" ? legacy.body : "";
  if (!type) {
    const earned = title.match(/You earned (\d+) GemXP/i);
    const used = title.match(/(\d+) GemXP used/i);
    if (earned) {
      type = "notifications.earned";
      params = { count: Number(earned[1]) };
    } else if (used) {
      type = "notifications.used";
      params = { count: Number(used[1]) };
    } else {
      type = "notifications.onTitle";
    }
  }
  if (!bodyType) {
    const migratedReason = migratePointEvent({
      id: legacy.id,
      amount: 0,
      reason: body,
      createdAt: legacy.createdAt,
      balanceAfter: 0,
      status: "local",
    });
    bodyType = migratedReason?.reasonType ?? "notifications.onBody";
    bodyParams = migratedReason?.reasonParams;
  }
  return {
    id: legacy.id,
    type,
    params,
    bodyType,
    bodyParams,
    createdAt: legacy.createdAt,
    read: Boolean(legacy.read),
  };
};

const interestOptions = primaryInterestCodes;

const speedByMode: Record<Transport, number> = {
  walking: 4.5,
  cycling: 15,
  e_bike: 19,
  driving: 35,
  public_transport: 18,
};

const gemDeals = [
  {
    name: "Hotel Hechten",
    region: "fussen_allgau" as const,
    category: "deals.category.bikeHotel",
    offer: "deals.offer.lateCheckout",
    subcategory: "bar" as const,
    creditCost: 25,
    url: "https://www.hotel-hechten.com/en/active/cycling-fussen-bavaria.html",
  },
  {
    name: "AMERON Neuschwanstein",
    region: "fussen_allgau" as const,
    category: "deals.category.stayCycle",
    offer: "deals.offer.rental",
    subcategory: "activity" as const,
    creditCost: 35,
    url: "https://www.ameroncollection.com/en/neuschwanstein-alpsee-resort-spa/discover-the-allgaeu-alps/cycling",
  },
  {
    name: "DIE GAMS",
    region: "bavaria" as const,
    category: "deals.category.ebikeStay",
    offer: "deals.offer.charging",
    subcategory: "activity" as const,
    creditCost: 20,
    url: "https://die-gams.info/en/aktiv/",
  },
  {
    name: "Hotel Comtes de Challant",
    region: "aosta" as const,
    category: "deals.category.bikeHotel",
    offer: "deals.offer.rate",
    subcategory: "restaurant" as const,
    creditCost: 30,
    url: "https://www.hotelcomtesdechallant.com/en/offers/discover-the-aosta-valley-by-e-bike",
  },
  {
    name: "Eco Wellness Notre Maison",
    region: "aosta" as const,
    category: "deals.category.ecoStay",
    offer: "deals.offer.breakfast",
    subcategory: "experience" as const,
    creditCost: 25,
    url: "https://ecobnb.com/IT-ao/hotel/eco-wellness-notre-maison/c0rl9",
  },
  {
    name: "Crabun Hotel",
    region: "aosta" as const,
    category: "deals.category.bikeHotel",
    offer: "deals.offer.storage",
    subcategory: "bar" as const,
    creditCost: 20,
    url: "https://www.crabunhotel.it/en/bike-hotel",
  },
];

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const today = () => isoDate(new Date());

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const addDays = (dateString: string, offset: number) => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return isoDate(date);
};

const formatDate = (date: string, locale = "en-GB") =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));

const automaticPlanName = (
  locale: Locale,
  region: Region,
  date: string,
) =>
  `${msg(locale, `data.region.${region}`)} · ${new Intl.DateTimeFormat(
    localeCodes[locale],
    { day: "numeric", month: "short" },
  ).format(new Date(`${date}T12:00:00`))}`;

const isLegacyAutomaticPlanName = (
  name: string,
  region: Region,
  date: string,
) =>
  locales.some(
    (candidate) =>
      name === automaticPlanName(candidate, region, date) ||
      name ===
        `${msg(candidate, `data.region.${region}`)} · ${formatDate(
          date,
          localeCodes[candidate],
        )}`,
  );

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function getCrowd(
  destination: Destination,
  date: string,
  stopIndex: number,
  avoidCrowds: boolean,
  weather?: WeatherDay,
) {
  const day = new Date(`${date}T12:00:00`).getDay();
  const weekend = day === 0 || day === 6;
  let score = destination.popularity + (weekend ? 1 : 0);
  if ((weather?.rain ?? 0) > 55) score -= 1;
  if (avoidCrowds && stopIndex === 0) score -= 1;
  score = Math.max(1, Math.min(7, score));
  const crowd: CrowdCode =
    score <= 2 ? "low" : score <= 4 ? "moderate" : "busy";
  const suggestedTime =
    destination.popularity >= 4 || avoidCrowds
      ? stopIndex === 0
        ? "08:15"
        : "16:30"
      : stopIndex === 0
        ? "09:30"
        : "14:30";
  return { crowd, crowdScore: score, suggestedTime } as const;
}

function scoreDestination(
  destination: Destination,
  interests: InterestCode[],
  difficulty: Difficulty,
  avoidCrowds: boolean,
  transport: Transport,
) {
  let score = 0;
  interests.forEach((interest) => {
    if (destination.tags.includes(interest)) score += 4;
  });
  if (difficulty === "easy" && destination.difficulty === "easy") score += 3;
  if (avoidCrowds) score += 6 - destination.popularity;
  if (transport === "walking") score -= destination.distanceKm * 0.3;
  if (transport === "cycling" || transport === "e_bike") {
    if (destination.tags.includes("cycling")) score += 2;
    score -= destination.distanceKm * 0.05;
  }
  return score;
}

export default function Home() {
  const pathname = usePathname();
  const [appPage, setAppPage] = useState<AppPage>("home");
  const [prompt, setPrompt] = useState("");
  const [days, setDays] = useState(3);
  const [transport, setTransport] = useState<Transport>("e_bike");
  const [interests, setInterests] = useState<InterestCode[]>(["lakes", "views"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [avoidCrowds, setAvoidCrowds] = useState(true);
  const [region, setRegion] = useState<Region>("aosta");
  const [startDate, setStartDate] = useState(today);
  const [controlsOverridePrompt, setControlsOverridePrompt] = useState(false);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [selected, setSelected] = useState<Destination>(
    destinations.find((destination) => destination.region === "aosta") ?? destinations[0],
  );
  const [mapMode, setMapMode] = useState<"map" | "list">("map");
  const [showCrowdLayer, setShowCrowdLayer] = useState(false);
  const [showAccommodations, setShowAccommodations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [weatherSource, setWeatherSource] = useState<"live" | "unavailable">(
    "unavailable",
  );
  const [xp, setXp] = useState(0);
  const [checkInMessage, setCheckInMessage] = useState<LocalizedState>({
    key: "points.checkinInitial",
  });
  const [checkInKind, setCheckInKind] = useState<"none" | "verified" | "demo">(
    "none",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [shareLabel, setShareLabel] = useState("global.share");
  const [crowdReport, setCrowdReport] = useState(4);
  const [dropMessage, setDropMessage] = useState<LocalizedState>({
    key: "gemdrop.initial",
  });
  const [dealRegion, setDealRegion] = useState<Region>("all");
  const [dealCategory, setDealCategory] = useState<DealCategory | "all">("all");
  const [unlockedDeal, setUnlockedDeal] = useState<string | null>(null);
  const [activeGemDrop, setActiveGemDrop] = useState<Destination | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mockLocationId, setMockLocationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<GemNotification[]>([]);
  const [pointHistory, setPointHistory] = useState<PointEvent[]>([]);
  const [planSaved, setPlanSaved] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [activeSavedPlanId, setActiveSavedPlanId] = useState<string | null>(null);
  const [hidePlanned, setHidePlanned] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(100);
  const [originQuery, setOriginQuery] = useState("");
  const [travelOrigin, setTravelOrigin] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [originStatus, setOriginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [routeModes, setRouteModes] = useState<Transport[]>([]);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [privacyAction, setPrivacyAction] = useState<string | null>(null);
  const [planUndo, setPlanUndo] = useState<PlanUndo | null>(null);
  const [planNotice, setPlanNotice] = useState<LocalizedState | null>(null);
  const [crowdDiversion, setCrowdDiversion] = useState<CrowdDiversion | null>(null);
  const [whyPlanOpen, setWhyPlanOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");
  const [storageReady, setStorageReady] = useState(false);
  const [accountPrompt, setAccountPrompt] = useState<
    "hidden" | "prompt" | "details"
  >("hidden");
  const [toast, setToast] = useState<ActionToast | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const [desktopIndicator, setDesktopIndicator] = useState({ left: 0, width: 0 });
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const t = (key: string, params?: Record<string, string | number>) =>
    msg(locale, key, params);
  const transportLabel = (value: Transport) =>
    t(`data.transport.${value}`);
  const interestLabel = (value: InterestCode) =>
    t(`data.interest.${value}`);
  const regionLabel = (value: Region) => t(`data.region.${value}`);
  const crowdLabel = (value: CrowdCode) => t(`data.crowd.${value}`);
  const kindLabel = (destination: Destination) =>
    t(`data.kind.${destination.kind}`);
  const destinationDescription = (destination: Destination) =>
    t("data.description", {
      name: destination.name,
      kind: kindLabel(destination).toLocaleLowerCase(locale),
      region: regionLabel(destination.region),
    });
  const currentPromptParse = useMemo(
    () => parseTripPrompt(prompt, new Date()),
    [prompt],
  );
  const promptRecognized =
    currentPromptParse.days !== undefined ||
    currentPromptParse.startDate !== undefined ||
    currentPromptParse.region !== undefined ||
    currentPromptParse.transport !== undefined ||
    currentPromptParse.interests.length > 0 ||
    currentPromptParse.excludedInterests.length > 0 ||
    currentPromptParse.excludedTransports.length > 0 ||
    currentPromptParse.difficulty !== undefined ||
    currentPromptParse.avoidCrowds !== undefined;

  useEffect(() => {
    const restoreStoredPoints = window.setTimeout(() => {
      const stored = window.localStorage.getItem("gemgo-xp");
      if (stored) setXp(Number(stored) || 0);
      const storedLocation = window.localStorage.getItem("gemgo-demo-location");
      if (storedLocation && destinations.some((item) => item.id === storedLocation)) {
        setMockLocationId(storedLocation);
      }
      setSoundEnabled(window.localStorage.getItem("gemgo-sound") !== "off");
      const storedLocale = window.localStorage.getItem("gemgo-locale");
      if (storedLocale && locales.includes(storedLocale as Locale)) {
        setLocale(storedLocale as Locale);
      }
      const storedNotifications = window.localStorage.getItem("gemgo-notifications");
      if (storedNotifications) {
        try {
          const migrated = (JSON.parse(storedNotifications) as unknown[])
            .map(migrateNotification)
            .filter((item): item is GemNotification => Boolean(item));
          setNotifications(migrated);
          window.localStorage.setItem(
            "gemgo-notifications",
            JSON.stringify(migrated),
          );
        } catch {
          window.localStorage.removeItem("gemgo-notifications");
        }
      }
      const storedHistory = window.localStorage.getItem("gemgo-point-history");
      if (storedHistory) {
        try {
          const migrated = (JSON.parse(storedHistory) as unknown[])
            .map(migratePointEvent)
            .filter((item): item is PointEvent => Boolean(item));
          setPointHistory(migrated);
          window.localStorage.setItem(
            "gemgo-point-history",
            JSON.stringify(migrated),
          );
        } catch {
          window.localStorage.removeItem("gemgo-point-history");
        }
      } else if (stored && Number(stored) > 0) {
        const openingEvent: PointEvent = {
          id: createId(),
          amount: Number(stored),
          reasonType: "event.imported",
          createdAt: new Date().toISOString(),
          balanceAfter: Number(stored),
          status: "local",
        };
        setPointHistory([openingEvent]);
        window.localStorage.setItem("gemgo-point-history", JSON.stringify([openingEvent]));
      }
      const storedPlan = window.localStorage.getItem("gemgo-saved-plan");
      const storedSavedPlans = window.localStorage.getItem("gemgo-saved-plans");
      let restoredSavedPlans: SavedPlan[] = [];
      if (storedSavedPlans) {
        try {
          const parsedSavedPlans = JSON.parse(storedSavedPlans) as SavedPlan[];
          if (Array.isArray(parsedSavedPlans)) {
            restoredSavedPlans = parsedSavedPlans.flatMap((item) => {
              if (
                !item ||
                typeof item.id !== "string"
              ) {
                return [];
              }
              const migratedRegion = canonicalRegion(item.region);
              const migratedPlan = migratePlan(item.plan);
              const legacyName =
                typeof item.name === "string" ? item.name.trim() : "";
              const customName =
                typeof item.customName === "string" && item.customName.trim()
                  ? item.customName.trim()
                  : legacyName &&
                      migratedPlan[0]?.date &&
                      !isLegacyAutomaticPlanName(
                        legacyName,
                        migratedRegion,
                        migratedPlan[0].date,
                      )
                    ? legacyName
                    : undefined;
              return [{
                ...item,
                name: undefined,
                customName,
                copyNumber:
                  typeof item.copyNumber === "number" && item.copyNumber > 0
                    ? Math.floor(item.copyNumber)
                    : undefined,
                region: migratedRegion,
                transport: canonicalTransport(item.transport),
                interests: (Array.isArray(item.interests) ? item.interests : [])
                  .map(canonicalInterest)
                  .filter((interest): interest is InterestCode => Boolean(interest)),
                plan: migratedPlan,
              }];
            });
            window.localStorage.setItem(
              "gemgo-saved-plans",
              JSON.stringify(restoredSavedPlans),
            );
          }
        } catch {
          window.localStorage.removeItem("gemgo-saved-plans");
        }
      }
      if (storedPlan) {
        try {
          const restoredPlan = migratePlan(JSON.parse(storedPlan));
          if (Array.isArray(restoredPlan) && restoredPlan.length > 0) {
            setPlan(restoredPlan);
            setPlanSaved(true);
            const alreadyMigrated = restoredSavedPlans.some(
              (item) => JSON.stringify(item.plan) === JSON.stringify(restoredPlan),
            );
            if (!alreadyMigrated) {
              const now = new Date().toISOString();
              const migrated: SavedPlan = {
                id: createId(),
                createdAt: now,
                updatedAt: now,
                region:
                  restoredPlan[0]?.stops[0]?.region ?? "all",
                transport: "e_bike",
                interests: [],
                plan: restoredPlan,
              };
              restoredSavedPlans = [migrated, ...restoredSavedPlans];
              setActiveSavedPlanId(migrated.id);
              window.localStorage.setItem(
                "gemgo-saved-plans",
                JSON.stringify(restoredSavedPlans),
              );
            } else {
              setActiveSavedPlanId(
                restoredSavedPlans.find(
                  (item) =>
                    JSON.stringify(item.plan) === JSON.stringify(restoredPlan),
                )?.id ?? null,
              );
            }
          }
        } catch {
          window.localStorage.removeItem("gemgo-saved-plan");
        }
      }
      setSavedPlans(restoredSavedPlans);
      setStorageReady(true);
      setNotificationPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
      const path = window.location.pathname.replace(/\/+$/, "");
      setAppPage(
        path === "/saved"
          ? "saved"
          : path === "/gemdrop"
          ? "gemdrop"
          : path === "/points"
            ? "points"
            : path === "/gemdeals"
              ? "gemdeals"
              : path === "/notifications"
                ? "notifications"
                : "home",
      );
    }, 0);
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, "");
      setAppPage(
        path === "/saved"
          ? "saved"
          : path === "/gemdrop"
          ? "gemdrop"
          : path === "/points"
            ? "points"
            : path === "/gemdeals"
              ? "gemdeals"
              : path === "/notifications"
                ? "notifications"
                : "home",
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(restoreStoredPoints);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!storageReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem("gemgo-locale", locale);
  }, [locale, storageReady]);

  useEffect(() => {
    const updateIndicator = (
      nav: HTMLElement | null,
      setter: (value: { left: number; width: number }) => void,
    ) => {
      if (!nav) return;
      const active = nav.querySelector<HTMLElement>(
        `[data-page="${appPage}"]`,
      );
      if (!active) {
        setter({ left: 0, width: 0 });
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const width = itemRect.width;
      setter({
        left: itemRect.left - navRect.left + (itemRect.width - width) / 2,
        width,
      });
    };
    const update = () => {
      updateIndicator(desktopNavRef.current, setDesktopIndicator);
    };
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, [appPage, locale]);

  const persistNotifications = (items: GemNotification[]) => {
    setNotifications(items);
    window.localStorage.setItem("gemgo-notifications", JSON.stringify(items));
  };

  const playActionSound = (tone: ActionToast["tone"]) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const gain = context.createGain();
      const now = context.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      gain.connect(context.destination);

      const frequencies =
        tone === "success" ? [660, 880] : tone === "error" ? [330, 245] : [520];
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.045);
        oscillator.connect(gain);
        oscillator.start(now + index * 0.045);
        oscillator.stop(now + 0.19);
      });
      window.setTimeout(() => context.close().catch(() => {}), 260);
    } catch {
      // Audio feedback is optional and must never block an action.
    }
  };

  const showToast = (
    message: string,
    tone: ActionToast["tone"] = "info",
    undo?: () => void,
  ) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: createId(), message, tone, undo });
    playActionSound(tone);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2000);
  };

  const maybeShowAccountPrompt = (now: number) => {
    const nextAllowed = Number(
      window.localStorage.getItem("gemgo-account-prompt-next") ?? "0",
    );
    const impressions = Number(
      window.localStorage.getItem("gemgo-account-prompt-count") ?? "0",
    );
    if (now < nextAllowed || impressions >= 2) return;
    window.localStorage.setItem(
      "gemgo-account-prompt-count",
      String(impressions + 1),
    );
    window.setTimeout(() => setAccountPrompt("prompt"), 380);
  };

  const snoozeAccountPrompt = () => {
    window.localStorage.setItem(
      "gemgo-account-prompt-next",
      String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    setAccountPrompt("hidden");
  };

  const setSoundPreference = (enabled: boolean) => {
    setSoundEnabled(enabled);
    window.localStorage.setItem("gemgo-sound", enabled ? "on" : "off");
    if (enabled) {
      window.setTimeout(() => {
        try {
          const AudioContextClass =
            window.AudioContext ??
            (
              window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;
          if (!AudioContextClass) return;
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 720;
          gain.gain.setValueAtTime(0.025, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.13,
          );
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.13);
          window.setTimeout(() => context.close().catch(() => {}), 180);
        } catch {}
      }, 0);
    }
  };

  const notify = (
    type: string,
    params: Record<string, string | number> | undefined,
    bodyType: string,
    bodyParams?: Record<string, string | number>,
  ) => {
    const item: GemNotification = {
      id: createId(),
      type,
      params,
      bodyType,
      bodyParams,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((current) => {
      const next = [item, ...current].slice(0, 100);
      window.localStorage.setItem("gemgo-notifications", JSON.stringify(next));
      return next;
    });
    if ("Notification" in window && Notification.permission === "granted") {
      const title = t(type, params);
      const body = t(bodyType, bodyParams);
      const options = {
        body,
        icon: "/assets/gemgo-logo.png",
        badge: "/favicon.svg",
        tag: item.id,
      };
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) =>
          registration.showNotification(title, options),
        );
      } else {
        new Notification(title, options);
      }
    }
  };

  const addPoints = (
    amount: number,
    reasonType: string,
    reasonParams?: Record<string, string | number>,
  ) => {
    const actionTime = new Date().getTime();
    setXp((current) => {
      const nextBalance = Math.max(0, current + amount);
      window.localStorage.setItem("gemgo-xp", String(nextBalance));
      const entry: PointEvent = {
        id: createId(),
        amount,
        reasonType,
        reasonParams,
        createdAt: new Date().toISOString(),
        balanceAfter: nextBalance,
        status: "local",
      };
      setPointHistory((history) => {
        const nextHistory = [entry, ...history].slice(0, 200);
        window.localStorage.setItem("gemgo-point-history", JSON.stringify(nextHistory));
        return nextHistory;
      });
      if (current < 100 && nextBalance >= 100) {
        window.setTimeout(() => maybeShowAccountPrompt(actionTime), 420);
      }
      return nextBalance;
    });
    notify(
      amount >= 0 ? "notifications.earned" : "notifications.used",
      { count: Math.abs(amount) },
      reasonType,
      reasonParams,
    );
    showToast(
      amount >= 0 ? `+${amount} GemXP` : `${amount} GemXP`,
      amount >= 0 ? "success" : "info",
    );
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      notify(
        "notifications.onTitle",
        undefined,
        "notifications.onBody",
      );
    }
  };

  const navigate = (page: AppPage) => {
    const href = page === "home" ? "/app" : page === "points" ? "/points" : `/${page}`;
    window.history.pushState({}, "", href);
    setAppPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mockLocation = mockLocationId
    ? destinations.find((item) => item.id === mockLocationId) ?? null
    : null;

  const setDemoLocation = (id: string | null) => {
    setMockLocationId(id);
    setCheckInKind("none");
    if (id) {
      window.localStorage.setItem("gemgo-demo-location", id);
      const destination = destinations.find((item) => item.id === id);
      if (destination) {
        setSelected(destination);
        showToast(
          t("settings.locationSet", { place: destination.name }),
          "success",
        );
      }
    } else {
      window.localStorage.removeItem("gemgo-demo-location");
      showToast(t("settings.locationRestored"), "info");
    }
  };

  const isAtSelectedPlace = mockLocationId === selected.id;
  const plannedDestinationIds = useMemo(
    () =>
      new Set(
        plan.flatMap((day) => day.stops.map((destination) => destination.id)),
      ),
    [plan],
  );
  const routeStops = useMemo(
    () => plan.flatMap((day) => day.stops),
    [plan],
  );
  const effectiveRouteModes = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, routeStops.length - 1) },
        (_, index) => routeModes[index] ?? transport,
      ),
    [routeModes, routeStops.length, transport],
  );

  const visibleDestinations = useMemo(() => {
    const scoped =
      region === "all"
        ? destinations
        : destinations.filter((destination) => destination.region === region);
    const withinRadius = scoped.filter((destination) =>
      travelOrigin
        ? haversineKm(travelOrigin.lat, travelOrigin.lng, destination.lat, destination.lng) <= maxDistanceKm
        : destination.distanceKm <= maxDistanceKm,
    );
    const ordered = !mockLocation
      ? withinRadius
      : [...withinRadius].sort(
      (a, b) =>
        haversineKm(mockLocation.lat, mockLocation.lng, a.lat, a.lng) -
        haversineKm(mockLocation.lat, mockLocation.lng, b.lat, b.lng),
      );
    return hidePlanned
      ? ordered.filter((destination) => !plannedDestinationIds.has(destination.id))
      : ordered;
  }, [hidePlanned, maxDistanceKm, mockLocation, plannedDestinationIds, region, travelOrigin]);

  const visibleAccommodations = useMemo(() => {
    const regionCenters = {
      bavaria: { lat: 47.57, lng: 10.7 },
      fussen_allgau: { lat: 47.57, lng: 10.7 },
      aosta: { lat: 45.74, lng: 7.32 },
    } as const;

    return accommodations.filter((stay) => {
      if (region !== "all" && stay.region !== region) return false;
      const center = travelOrigin ?? regionCenters[stay.region];
      return haversineKm(center.lat, center.lng, stay.lat, stay.lng) <= maxDistanceKm;
    });
  }, [maxDistanceKm, region, travelOrigin]);

  const searchOrigin = async () => {
    if (!originQuery.trim()) return;
    setOriginStatus("loading");
    try {
      const result = await geocodePlace(originQuery);
      if (!result) throw new Error("not-found");
      setTravelOrigin(result);
      setOriginQuery(result.label);
      setOriginStatus("idle");
    } catch {
      setOriginStatus("error");
    }
  };

  const useGpsOrigin = () => {
    setOriginStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setTravelOrigin({ label: t("planner.currentLocation"), lat: coords.latitude, lng: coords.longitude });
        setOriginQuery(t("planner.currentLocation"));
        setOriginStatus("idle");
      },
      () => setOriginStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const nearbyAccommodations = useMemo(
    () =>
      accommodations
        .filter((stay) => stay.region === selected.region)
        .map((stay) => ({
          ...stay,
          distanceKm: haversineKm(selected.lat, selected.lng, stay.lat, stay.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3),
    [selected],
  );

  const visibleDeals = useMemo(
    () =>
      gemDeals.filter(
        (deal) =>
          (dealRegion === "all" || deal.region === dealRegion) &&
          (dealCategory === "all" || deal.subcategory === dealCategory),
      ),
    [dealCategory, dealRegion],
  );

  const nearbyLabel = mockLocation ? t("map.nearYou") : t("map.areaPlaces");
  const crowdForExplore = (destination: Destination) =>
    getCrowd(destination, startDate, 1, true).crowd;

  const gemDropAlternative = useMemo(() => {
    const currentPlace = mockLocation ?? selected;
    return destinations
      .filter(
        (destination) =>
          destination.id !== currentPlace.id &&
          destination.region === currentPlace.region &&
          destination.popularity < currentPlace.popularity,
      )
      .sort(
        (a, b) =>
          haversineKm(currentPlace.lat, currentPlace.lng, a.lat, a.lng) -
          haversineKm(currentPlace.lat, currentPlace.lng, b.lat, b.lng),
      )[0];
  }, [mockLocation, selected]);

  const reportCrowd = () => {
    if (!mockLocation) return;
    const reportKey = `gemgo-crowd-${mockLocation.id}-${today()}`;
    if (!window.localStorage.getItem(reportKey)) {
      window.localStorage.setItem(reportKey, String(crowdReport));
      addPoints(10, "event.crowdReport", { place: mockLocation.name });
    }
    setDropMessage({
      key: "gemdrop.saved",
      params: { place: mockLocation.name },
    });
    showToast(
      gemDropAlternative
        ? t("gemdrop.alternative", { place: gemDropAlternative.name })
        : t("gemdrop.noAlternative"),
      "success",
    );
  };

  const completeGemDropActivity = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeGemDrop) return;
    window.localStorage.setItem(
      `gemgo-activity-${activeGemDrop.id}-${today()}`,
      JSON.stringify({ completedAt: new Date().toISOString(), photoName: file.name }),
    );
    setActiveGemDrop(null);
    showToast(t("gemdrop.activityComplete"), "success");
    event.target.value = "";
  };

  const rewardGemContribution = ({
    id,
    name,
    reward,
  }: {
    id: string;
    name: string;
    reward: number;
  }) => {
    const rewardKey = `gemgo-gem-contribution-reward-${id}`;
    if (window.localStorage.getItem(rewardKey)) return;
    window.localStorage.setItem(rewardKey, "awarded");
    addPoints(reward, "event.newGem", { place: name });
    showToast(t("contribute.rewarded", { name }), "success");
  };

  const previewDeal = (dealName: string) => {
    setUnlockedDeal(dealName);
    showToast(t("deals.opened", { name: dealName }), "info");
  };

  const routeLink = (destination: Destination) => {
    const travelmode =
      transport === "walking"
        ? "walking"
        : transport === "cycling" || transport === "e_bike"
          ? "bicycling"
          : transport === "driving"
            ? "driving"
            : "transit";
    const origin = mockLocation
      ? `${mockLocation.lat},${mockLocation.lng}`
      : regionOrigins[destination.region].mapsQuery;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination.lat},${destination.lng}&travelmode=${travelmode}`;
  };

  const fetchWeather = async (requestedRegion: Region): Promise<WeatherDay[]> => {
    try {
      const coordinates =
        requestedRegion === "aosta"
          ? "latitude=45.74&longitude=7.32"
          : requestedRegion === "bavaria"
            ? "latitude=47.7&longitude=11.2"
            : "latitude=47.57&longitude=10.70";
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${coordinates}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`,
      );
      if (!response.ok) throw new Error("Weather service unavailable");
      const data = await response.json();
      const result = data.daily.time.map((date: string, index: number) => ({
        date,
        code: data.daily.weather_code[index],
        max: Math.round(data.daily.temperature_2m_max[index]),
        min: Math.round(data.daily.temperature_2m_min[index]),
        rain: Math.round(data.daily.precipitation_probability_max[index]),
      }));
      setWeatherSource("live");
      return result;
    } catch {
      setWeatherSource("unavailable");
      return [];
    }
  };

  const buildPlan = async (event?: FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    const parsed: PromptParseResult = controlsOverridePrompt
      ? {
          days,
          transport,
          interests,
          excludedInterests: [],
          excludedTransports: [],
          difficulty,
          avoidCrowds,
          region: region === "all" ? undefined : region,
          confidence: 1,
          ambiguous: [],
        }
      : parseTripPrompt(prompt);
    if (!isValidParseResult(parsed)) {
      showToast(t("planner.ambiguous"), "error");
      setLoading(false);
      return;
    }
    const nextDays = Math.max(1, Math.min(7, parsed.days ?? days));
    const nextTransport =
      parsed.transport && !parsed.excludedTransports.includes(parsed.transport)
        ? parsed.transport
        : transport;
    const nextInterests = Array.from(
      new Set([
        ...(parsed.interests.length > 0 ? parsed.interests : interests),
      ]),
    ).filter((interest) => !parsed.excludedInterests.includes(interest));
    const nextDifficulty = parsed.difficulty ?? difficulty;
    const nextAvoidCrowds = parsed.avoidCrowds ?? avoidCrowds;
    const nextRegion = parsed.region ?? region;
    const planStartDate = validStartDate(parsed.startDate ?? startDate, today());
    setDays(nextDays);
    setTransport(nextTransport);
    setInterests(nextInterests);
    setDifficulty(nextDifficulty);
    setAvoidCrowds(nextAvoidCrowds);
    setRegion(nextRegion);
    setStartDate(planStartDate);

    const weather = await fetchWeather(nextRegion);
    const regionEligible =
      nextRegion === "all"
        ? destinations
        : destinations.filter((destination) => destination.region === nextRegion);
    const eligible = regionEligible.filter(
      (destination) => destination.distanceKm <= maxDistanceKm,
    );
    const ranked = [...eligible].sort(
      (a, b) =>
        scoreDestination(
          b,
          nextInterests,
          nextDifficulty,
          nextAvoidCrowds,
          nextTransport,
        ) -
        scoreDestination(
          a,
          nextInterests,
          nextDifficulty,
          nextAvoidCrowds,
          nextTransport,
        ),
    );
    const usedDestinationIds = new Set<string>();
    const newPlan: PlanDay[] = Array.from({ length: nextDays }, (_, dayIndex) => {
      const date = addDays(planStartDate, dayIndex);
      const dayWeather = weather.find((item) => item.date === date);
      const dayStops: Stop[] = [];
      for (const destination of ranked) {
        if (usedDestinationIds.has(destination.id)) continue;
        const crowd = getCrowd(
          destination,
          date,
          dayStops.length,
          nextAvoidCrowds,
          dayWeather,
        );
        if (crowd.crowd === "busy") continue;
        const originDistance = mockLocation
          ? haversineKm(
              mockLocation.lat,
              mockLocation.lng,
              destination.lat,
              destination.lng,
            )
          : destination.distanceKm;
        const travelMinutes = Math.max(
          8,
          Math.round((originDistance / speedByMode[nextTransport]) * 60),
        );
        dayStops.push({ ...destination, ...crowd, travelMinutes });
        usedDestinationIds.add(destination.id);
        if (dayStops.length === 2) break;
      }
      return {
        date,
        weather: dayWeather,
        stops: dayStops,
        distanceKm: Math.round(
          dayStops.reduce((total, stop) => total + stop.distanceKm, 0) * 1.35,
        ),
      };
    });
    const firstDayWeather = weather.find((item) => item.date === planStartDate);
    const avoided = ranked.find(
      (destination) =>
        getCrowd(
          destination,
          planStartDate,
          0,
          nextAvoidCrowds,
          firstDayWeather,
        ).crowd === "busy",
    );
    const alternative = avoided
      ? newPlan
          .flatMap((day) => day.stops)
          .find((destination) => destination.popularity < avoided.popularity)
      : undefined;
    setCrowdDiversion(
      avoided && alternative ? { avoided, alternative } : null,
    );
    setPlan(newPlan);
    setPlanSaved(false);
    setActiveSavedPlanId(null);
    setPlanUndo(null);
    setPlanNotice({ key: "plan.busyExcluded" });
    if (newPlan[0]?.stops[0]) setSelected(newPlan[0].stops[0]);
    setLoading(false);
    window.setTimeout(() => {
      document.getElementById("trip-plan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const toggleInterest = (interest: InterestCode) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const updatePrompt = (value: string) => {
    setPrompt(value);
    setControlsOverridePrompt(false);
    const parsed = parseTripPrompt(value);
    if (parsed.days !== undefined) setDays(parsed.days);
    if (parsed.transport !== undefined) setTransport(parsed.transport);
    if (parsed.interests.length > 0 || parsed.excludedInterests.length > 0) {
      setInterests((current) =>
        Array.from(
          new Set([
            ...(parsed.interests.length > 0 ? parsed.interests : current),
          ]),
        ).filter((interest) => !parsed.excludedInterests.includes(interest)),
      );
    }
    if (parsed.difficulty !== undefined) setDifficulty(parsed.difficulty);
    if (parsed.avoidCrowds !== undefined) {
      setAvoidCrowds(parsed.avoidCrowds);
    }
    if (parsed.region !== undefined) setRegion(parsed.region);
    if (parsed.startDate) setStartDate(parsed.startDate);
  };

  const persistSavedPlans = (items: SavedPlan[]) => {
    setSavedPlans(items);
    window.localStorage.setItem("gemgo-saved-plans", JSON.stringify(items));
  };

  const savedPlanName = (saved: SavedPlan) => {
    const startDate = saved.plan[0]?.date;
    const baseName =
      saved.customName ||
      (startDate
        ? automaticPlanName(locale, saved.region, startDate)
        : regionLabel(saved.region));
    return saved.copyNumber
      ? `${baseName} · ${t("plan.copySuffix")} ${saved.copyNumber}`
      : baseName;
  };

  const savePlan = () => {
    if (plan.length === 0) return;
    const now = new Date().toISOString();
    let savedId = activeSavedPlanId;
    let nextPlans: SavedPlan[];
    if (activeSavedPlanId) {
      nextPlans = savedPlans.map((item) =>
        item.id === activeSavedPlanId
          ? {
              ...item,
              updatedAt: now,
              region,
              transport,
              interests,
              plan,
            }
          : item,
      );
    } else {
      const saved: SavedPlan = {
        id: createId(),
        createdAt: now,
        updatedAt: now,
        region,
        transport,
        interests,
        plan,
      };
      savedId = saved.id;
      nextPlans = [saved, ...savedPlans];
    }
    persistSavedPlans(nextPlans);
    setActiveSavedPlanId(savedId);
    window.localStorage.setItem("gemgo-saved-plan", JSON.stringify(plan));
    setPlanSaved(true);
    setPlanNotice({ key: "plan.savedDevice" });
    showToast(t("plan.savedDevice"), "success");
    maybeShowAccountPrompt(new Date().getTime());
  };

  const openSavedPlan = (saved: SavedPlan) => {
    setPlan(saved.plan);
    setRegion(saved.region);
    setTransport(saved.transport);
    setInterests(saved.interests);
    setActiveSavedPlanId(saved.id);
    setPlanSaved(true);
    window.localStorage.setItem("gemgo-saved-plan", JSON.stringify(saved.plan));
    navigate("home");
    window.setTimeout(() => {
      document.getElementById("trip-plan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 90);
    showToast(t("plan.opened", { name: savedPlanName(saved) }), "success");
  };

  const duplicateSavedPlan = (saved: SavedPlan) => {
    const now = new Date().toISOString();
    const duplicate: SavedPlan = {
      ...saved,
      id: createId(),
      name: undefined,
      copyNumber: (saved.copyNumber ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    };
    persistSavedPlans([duplicate, ...savedPlans]);
    showToast(t("plan.duplicated", { name: savedPlanName(saved) }), "success", () => {
      persistSavedPlans(savedPlans);
    });
  };

  const deleteSavedPlan = (saved: SavedPlan) => {
    const previous = savedPlans;
    const next = savedPlans.filter((item) => item.id !== saved.id);
    persistSavedPlans(next);
    if (activeSavedPlanId === saved.id) {
      setActiveSavedPlanId(null);
      setPlanSaved(false);
    }
    showToast(t("plan.deleted", { name: savedPlanName(saved) }), "info", () => {
      persistSavedPlans(previous);
      setActiveSavedPlanId(saved.id);
      setPlanSaved(true);
    });
  };

  const renameSavedPlan = (id: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    persistSavedPlans(
      savedPlans.map((item) =>
        item.id === id
          ? {
              ...item,
              name: undefined,
              customName: cleanName,
              copyNumber: undefined,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const addDestinationToPlan = (destination: Destination) => {
    if (plan.some((day) => day.stops.some((stop) => stop.id === destination.id))) {
      setPlanNotice({
        key: "plan.already",
        params: { name: destination.name },
      });
      return;
    }
    const previousPlan = plan;
    const date = plan[0]?.date ?? startDate;
    const crowd = getCrowd(destination, date, 0, true);
    const stop: Stop = {
      ...destination,
      ...crowd,
      suggestedTime: crowd.crowd === "busy" ? "08:00" : crowd.suggestedTime,
      travelMinutes: Math.max(
        8,
        Math.round((destination.distanceKm / speedByMode[transport]) * 60),
      ),
    };
    const nextPlan =
      plan.length === 0
        ? [
            {
              date,
              stops: [stop],
              distanceKm: Math.round(destination.distanceKm * 1.35),
            },
          ]
        : plan.map((day, index) => {
            const targetIndex = plan.reduce(
              (shortest, current, currentIndex) =>
                current.stops.length < plan[shortest].stops.length
                  ? currentIndex
                  : shortest,
              0,
            );
            if (index !== targetIndex) return day;
            const stops = [...day.stops, stop];
            return {
              ...day,
              stops,
              distanceKm: Math.round(
                stops.reduce((total, item) => total + item.distanceKm, 0) * 1.35,
              ),
            };
          });
    setPlan(nextPlan);
    setPlanSaved(false);
    setPlanUndo({
      previousPlan,
    });
    setPlanNotice({
      key: "plan.added",
      params: { name: destination.name },
    });
    setJustAddedId(destination.id);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setJustAddedId(null);
      highlightTimerRef.current = null;
    }, 950);
    showToast(t("plan.added", { name: destination.name }), "success", () => {
      setPlan(previousPlan);
      setPlanSaved(false);
      setPlanUndo(null);
      setPlanNotice({ key: "plan.changeUndone" });
      setJustAddedId(null);
    });
    window.setTimeout(() => {
      document.getElementById("trip-plan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 70);
  };

  const undoPlanChange = () => {
    if (!planUndo) return;
    setPlan(planUndo.previousPlan);
    setPlanSaved(false);
    setPlanNotice({ key: "plan.changeUndone" });
    setPlanUndo(null);
    showToast(t("plan.changeUndone"), "info");
  };

  const verifyLocation = () => {
    if (isAtSelectedPlace) {
      const key = `gemgo-checkin-${selected.id}`;
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, "demo-verified");
        addPoints(5, "event.demoCheckin", { place: selected.name });
      }
      setCheckInKind("demo");
      setCheckInMessage({
        key: "points.demoVerified",
        params: { place: selected.name },
      });
      return;
    }
    if (!navigator.geolocation) {
      setCheckInMessage({ key: "points.geoUnsupported" });
      return;
    }
    if (window.localStorage.getItem("gemgo-location-consent") !== "yes") {
      setLocationConsentOpen(true);
      return;
    }
    setCheckInMessage({ key: "points.checking" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = haversineKm(
          position.coords.latitude,
          position.coords.longitude,
          selected.lat,
          selected.lng,
        );
        if (distance <= 0.5) {
          const key = `gemgo-checkin-${selected.id}`;
          if (!window.localStorage.getItem(key)) {
            window.localStorage.setItem(key, "verified");
            addPoints(60, "event.gpsCheckin", { place: selected.name });
          }
          setCheckInKind("verified");
          setCheckInMessage({
            key: "points.gpsVerified",
            params: { place: selected.name },
          });
        } else {
          setCheckInKind("none");
          setCheckInMessage({
            key: "points.tooFar",
            params: {
              distance: new Intl.NumberFormat(localeCodes[locale], {
                maximumFractionDigits: distance < 10 ? 1 : 0,
              }).format(distance),
              place: selected.name,
            },
          });
        }
      },
      () => {
        setCheckInMessage({ key: "points.locationUnavailable" });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
    if (checkInKind !== "none" && (checkInKind === "verified" || isAtSelectedPlace)) {
      const key = `gemgo-photo-${selected.id}-${file.size}`;
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, "added");
        addPoints(
          checkInKind === "verified" ? 5 : 2,
          "event.visitPhoto",
          { place: selected.name },
        );
      }
      setCheckInMessage(
        checkInKind === "verified"
          ? { key: "points.photoVerified" }
          : {
              key: "points.photoDemo",
              params: { place: selected.name },
            },
      );
    } else {
      setCheckInMessage({ key: "points.photoLocal" });
    }
  };

  const shareSite = async () => {
    const shareData = {
      title: "GemGo MVP",
      text: t("global.shareText"),
      url: window.location.href,
    };
    try {
      const canShare = "share" in navigator;
      if (canShare) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setShareLabel(canShare ? "global.shared" : "global.linkCopied");
      showToast(
        canShare ? t("global.shared") : t("global.linkCopied"),
        "success",
      );
      window.setTimeout(() => setShareLabel("global.share"), 1800);
    } catch {
      setShareLabel("global.share");
    }
  };

  const exportLocalData = () => {
    const data = Object.fromEntries(
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("gemgo-"))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key)]),
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gemgo-local-data-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setPrivacyAction(t("privacy.exported"));
  };

  const deleteLocalData = () => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("gemgo-"))
      .forEach((key) => window.localStorage.removeItem(key));
    setXp(0);
    setPlan([]);
    setSavedPlans([]);
    setNotifications([]);
    setPointHistory([]);
    setMockLocationId(null);
    setPlanSaved(false);
    setPrivacyAction(t("privacy.deleted"));
  };

  const publicHeader = (
    <header className="public-header">
      <Link className="brand" href="/" aria-label={t("global.home")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/assets/gemgo-logo-green.svg?v=2" alt="" aria-hidden="true" />
        <span>GemGo</span>
      </Link>
      <nav aria-label={t("nav.public")}>
        <Link href="/about">{t("nav.about")}</Link>
        <Link href="/privacy">{t("nav.privacy")}</Link>
      </nav>
      <label className="public-language">
        <span className="sr-only">{t("settings.language")}</span>
        <Globe2 aria-hidden="true" size={17} />
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          {languageOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
    </header>
  );

  if (pathname === "/") {
    return (
      <main className="public-page welcome-page">
        {publicHeader}
        <section className="welcome-hero">
          <div>
            <p className="eyebrow">{t("welcome.eyebrow")}</p>
            <h1>{t("welcome.title")}</h1>
            <p>{t("welcome.body")}</p>
            <div className="welcome-actions">
              <Link className="primary-button" href="/app">
                {t("welcome.try")}
                <ArrowRight aria-hidden="true" size={19} />
              </Link>
              <Link className="outline-button" href="/about">{t("welcome.story")}</Link>
            </div>
          </div>
          <div className="welcome-card" aria-label={t("welcome.previewAria")}>
            <span className="welcome-map-dot dot-one">1</span>
            <span className="welcome-map-dot dot-two">2</span>
            <span className="welcome-map-dot dot-three">3</span>
            <svg viewBox="0 0 500 360" role="img" aria-label={t("welcome.previewAria")}>
              <path d="M22 292C118 219 113 107 221 127s110 128 249 35" fill="none" stroke="#35a66f" strokeWidth="12" strokeLinecap="round" />
              <path d="M47 56c93 39 143-20 233 17s112 20 185-30" fill="none" stroke="#7cb9b2" strokeWidth="20" strokeLinecap="round" opacity=".45" />
            </svg>
            <div className="welcome-trip-card">
              <small>{t("welcome.sampleEyebrow")}</small>
              <strong>{t("welcome.sampleTitle")}</strong>
              <span>{t("welcome.sampleMeta")}</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (pathname === "/about") {
    return (
      <main className="public-page about-page">
        {publicHeader}
        <section className="public-intro">
          <p className="eyebrow">{t("about.eyebrow")}</p>
          <h1>{t("about.title")}</h1>
          <p>{t("about.body")}</p>
        </section>
        <section className="origin-story">
          <div className="origin-badge"><Sparkles aria-hidden="true" size={24} /></div>
          <div>
            <h2>{t("about.originTitle")}</h2>
            <p>{t("about.originBody")}</p>
            <div className="origin-links">
              <a href="https://new.regione.vda.it/europa/linea-diretta/europe-direct/notizie-appuntamenti-ed/2026/due-studenti-dell-univda-premiati-all-eusalp-alpine-ai-hackathon-con-un-app-per-il-turismo-sostenibile-2" target="_blank" rel="noreferrer">
                {t("about.winSource")} <ExternalLink aria-hidden="true" size={15} />
              </a>
              <a href="https://alpine-region.eu/alpine-youth/pitch-your-project/contest-rules" target="_blank" rel="noreferrer">
                {t("about.contestSource")} <ExternalLink aria-hidden="true" size={15} />
              </a>
            </div>
          </div>
        </section>
        <section className="team-section">
          <div className="section-heading">
            <div><p className="eyebrow">{t("about.teamEyebrow")}</p><h2>{t("about.teamTitle")}</h2></div>
          </div>
          <div className="team-grid">
            {team.map((member) => (
              <article key={member.name} className="team-card">
                {member.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.photo} alt={member.name} loading="lazy" />
                ) : (
                  <div className="team-initials" aria-label={member.name}>
                    {member.name.split(" ").map((part) => part[0]).join("")}
                  </div>
                )}
                <div>
                  <span>{member.role}</span>
                  <h3>{member.name}</h3>
                  <p>{member.bio}</p>
                  <a href={member.linkedin} target="_blank" rel="noreferrer" aria-label={`${member.name} · LinkedIn`}>
                    <Linkedin aria-hidden="true" size={18} /> LinkedIn
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <div className="public-cta"><Link className="primary-button" href="/app">{t("welcome.try")}<ArrowRight aria-hidden="true" size={18} /></Link></div>
      </main>
    );
  }

  if (pathname === "/privacy") {
    return (
      <main className="public-page privacy-page">
        {publicHeader}
        <section className="public-intro">
          <p className="eyebrow">{t("privacy.eyebrow")}</p>
          <h1>{t("privacy.title")}</h1>
          <p>{t("privacy.body")}</p>
          <span className="privacy-updated">{t("privacy.updated")}</span>
        </section>
        <section className="privacy-grid">
          <article><ShieldCheck aria-hidden="true" size={24} /><h2>{t("privacy.localTitle")}</h2><p>{t("privacy.localBody")}</p></article>
          <article><MapPin aria-hidden="true" size={24} /><h2>{t("privacy.locationTitle")}</h2><p>{t("privacy.locationBody")}</p></article>
          <article><Globe2 aria-hidden="true" size={24} /><h2>{t("privacy.servicesTitle")}</h2><p>{t("privacy.servicesBody")}</p></article>
          <article><History aria-hidden="true" size={24} /><h2>{t("privacy.retentionTitle")}</h2><p>{t("privacy.retentionBody")}</p></article>
          <article><Gem aria-hidden="true" size={24} /><h2>{t("privacy.contributionTitle")}</h2><p>{t("privacy.contributionBody")}</p></article>
        </section>
        <section className="privacy-controls">
          <div><p className="eyebrow">{t("privacy.controlsEyebrow")}</p><h2>{t("privacy.controlsTitle")}</h2><p>{t("privacy.controlsBody")}</p></div>
          <div className="privacy-actions">
            <button className="outline-button" onClick={exportLocalData}><Download aria-hidden="true" size={17} />{t("privacy.export")}</button>
            <button className="danger-button" onClick={deleteLocalData}><Trash2 aria-hidden="true" size={17} />{t("privacy.delete")}</button>
          </div>
          {privacyAction && <p className="privacy-action" role="status">{privacyAction}</p>}
        </section>
        <section className="privacy-before-accounts">
          <h2>{t("privacy.futureTitle")}</h2>
          <p>{t("privacy.futureBody")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-page page-${appPage}`}>
      <header className="site-header">
        <Link className="brand" href="/app" onClick={(event) => { event.preventDefault(); navigate("home"); }} aria-label={t("global.home")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/assets/gemgo-logo-green.svg?v=2" alt="" aria-hidden="true" />
          <span>GemGo</span>
        </Link>
        <nav aria-label={t("nav.main")} ref={desktopNavRef}>
          <span
            className="nav-flow-indicator"
            aria-hidden="true"
            style={{
              left: desktopIndicator.left,
              width: desktopIndicator.width,
              opacity: desktopIndicator.width ? 1 : 0,
            }}
          />
          <Link data-page="home" className={appPage === "home" ? "active" : ""} href="/" onClick={(event) => { event.preventDefault(); navigate("home"); }}>{t("nav.explore")}</Link>
          <Link data-page="saved" className={appPage === "saved" ? "active" : ""} href="/saved" onClick={(event) => { event.preventDefault(); navigate("saved"); }}>{t("nav.saved")}</Link>
          <Link data-page="gemdrop" className={appPage === "gemdrop" ? "active" : ""} href="/gemdrop" onClick={(event) => { event.preventDefault(); navigate("gemdrop"); }}>{t("nav.gemdrop")}</Link>
          <Link data-page="points" className={appPage === "points" ? "active" : ""} href="/points" onClick={(event) => { event.preventDefault(); navigate("points"); }}>Gem{t("nav.points")}</Link>
          <Link data-page="gemdeals" className={appPage === "gemdeals" ? "active" : ""} href="/gemdeals" onClick={(event) => { event.preventDefault(); navigate("gemdeals"); }}>Gem{t("nav.deals")}</Link>
        </nav>
        <div className="header-actions">
          <button className="xp-pill" aria-label={t("global.pointsLabel", { count: xp })} onClick={() => navigate("points")}>
            <Gem aria-hidden="true" size={17} strokeWidth={2.4} />
            {xp} XP
          </button>
          <button
            className="notification-button"
            aria-label={t("global.notificationsLabel", { count: notifications.filter((item) => !item.read).length })}
            onClick={() => navigate("notifications")}
          >
            <Bell aria-hidden="true" size={20} strokeWidth={2.2} />
            {notifications.some((item) => !item.read) && (
              <span>{notifications.filter((item) => !item.read).length}</span>
            )}
          </button>
          <button className="outline-button compact" onClick={shareSite}>
            {t(shareLabel)}
          </button>
          <button
            className="settings-button"
            aria-label={t("global.openSettings")}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings aria-hidden="true" size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {toast && (
        <div
          className={`action-toast toast-${toast.tone}`}
          role="status"
          aria-live="polite"
          key={toast.id}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 aria-hidden="true" size={17} />
          ) : (
            <Info aria-hidden="true" size={17} />
          )}
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                if (toastTimerRef.current) {
                  window.clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = null;
                }
                setToast(null);
              }}
            >
              <Undo2 aria-hidden="true" size={14} />
              {t("global.undo")}
            </button>
          )}
        </div>
      )}

      <section className="hero home-only" id="top">
        <div className="planner-panel">
          <p className="eyebrow">{t("planner.eyebrow")}</p>
          <h1>{t("planner.title")}</h1>
          <p className="hero-copy">
            {t("planner.body")}
          </p>

          <div className={howOpen ? "how-preview open" : "how-preview"}>
            <button
              type="button"
              className="how-preview-toggle"
              aria-expanded={howOpen}
              onClick={() => setHowOpen((value) => !value)}
            >
              <span>
                <Info aria-hidden="true" size={18} />
                {t("planner.how")}
              </span>
              {howOpen ? (
                <ChevronUp aria-hidden="true" size={18} />
              ) : (
                <ChevronDown aria-hidden="true" size={18} />
              )}
            </button>
            {howOpen && (
              <div className="how-preview-steps">
                <span><Search aria-hidden="true" size={16} />{t("planner.stepDescribe")}</span>
                <span><CloudSun aria-hidden="true" size={16} />{t("planner.stepCompare")}</span>
                <span><Route aria-hidden="true" size={16} />{t("planner.stepPlan")}</span>
              </div>
            )}
          </div>

          <form onSubmit={buildPlan} className="planner-form">
            <label htmlFor="trip-prompt">{t("planner.promptLabel")}</label>
            <div className="prompt-row">
              <textarea
                id="trip-prompt"
                value={prompt}
                placeholder={promptSuggestions[locale][0]}
                onChange={(event) => updatePrompt(event.target.value)}
                rows={3}
                aria-describedby="prompt-hint"
              />
              <button
                type="submit"
                className="prompt-submit"
                aria-label={t("planner.promptAria")}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="spin" aria-hidden="true" size={22} />
                ) : (
                  <Send aria-hidden="true" size={21} />
                )}
              </button>
            </div>
            <span id="prompt-hint" className="sr-only">
              {t("planner.promptHelp")}
            </span>
          </form>

          <div className="prompt-suggestions" aria-label={t("planner.tryRequest")}>
            {promptSuggestions[locale].map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => updatePrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="interpretation">
            <strong>
              {t(prompt ? "planner.interpreted" : "planner.preferences")}
            </strong>
            {prompt && !promptRecognized ? (
              <small>{t("planner.notUnderstood")}</small>
            ) : currentPromptParse.ambiguous.length > 0 ? (
              <small>{t("planner.ambiguous")}</small>
            ) : null}
            <div className="interpretation-chips">
              <button
                type="button"
                onClick={() => {
                  setDays((value) => (value >= 7 ? 1 : value + 1));
                  setControlsOverridePrompt(true);
                }}
              >
                <CalendarDays aria-hidden="true" size={14} />
                {days} {plural(locale, days, "global.day", "global.days")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const index = transportCodes.indexOf(transport);
                  setTransport(transportCodes[(index + 1) % transportCodes.length]);
                  setControlsOverridePrompt(true);
                }}
              >
                <Navigation aria-hidden="true" size={14} />
                {transportLabel(transport)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const index = regionCodes.indexOf(region);
                  const nextRegion = regionCodes[(index + 1) % regionCodes.length];
                  setRegion(nextRegion);
                  const nextSelected = destinations.find(
                    (destination) =>
                      (nextRegion === "all" || destination.region === nextRegion) &&
                      destination.distanceKm <= maxDistanceKm,
                  );
                  if (nextSelected) setSelected(nextSelected);
                  setControlsOverridePrompt(true);
                }}
              >
                <MapPin aria-hidden="true" size={14} />
                {regionLabel(region)}
              </button>
              <button
                type="button"
                aria-pressed={avoidCrowds}
                onClick={() => {
                  setAvoidCrowds((value) => !value);
                  setControlsOverridePrompt(true);
                }}
              >
                <UserRoundCheck aria-hidden="true" size={14} />
                {t("planner.crowdDefault")}
              </button>
              {interests.map((interest) => (
                <button
                  type="button"
                  key={`interpreted-${interest}`}
                  aria-label={t("planner.removeInterest", {
                    value: interestLabel(interest),
                  })}
                  onClick={() => {
                    toggleInterest(interest);
                    setControlsOverridePrompt(true);
                  }}
                >
                  {interestLabel(interest)}
                  <X aria-hidden="true" size={13} />
                </button>
              ))}
            </div>
          </div>

          <div className="quick-settings" aria-label={t("planner.settings")}>
            <label>
              <span>{t("planner.days")}</span>
              <select
                value={days}
                onChange={(event) => {
                  setDays(Number(event.target.value));
                  setControlsOverridePrompt(true);
                }}
              >
                {Array.from({ length: 7 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} {plural(locale, count, "global.day", "global.days")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("planner.area")}</span>
              <select
                value={region}
                onChange={(event) => {
                  const nextRegion = event.target.value as Region;
                  setRegion(nextRegion);
                  const nextSelected = destinations.find(
                    (destination) =>
                      (nextRegion === "all" || destination.region === nextRegion) &&
                      destination.distanceKm <= maxDistanceKm,
                  );
                  if (nextSelected) setSelected(nextSelected);
                  setControlsOverridePrompt(true);
                }}
              >
                {regionCodes.map((value) => (
                  <option key={value} value={value}>{regionLabel(value)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("planner.transport")}</span>
              <select
                value={transport}
                onChange={(event) => {
                  setTransport(event.target.value as Transport);
                  setControlsOverridePrompt(true);
                }}
              >
                {transportCodes.map((value) => (
                  <option key={value} value={value}>
                    {transportLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("planner.start")}</span>
              <input
                type="date"
                min={today()}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setControlsOverridePrompt(true);
                }}
              />
            </label>
            <label className="radius-setting">
              <span>{t("planner.origin")}</span>
              <div className="origin-control">
                <input value={originQuery} onChange={(event) => setOriginQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchOrigin(); } }} placeholder={t("planner.originPlaceholder")} />
                <button type="button" onClick={() => void searchOrigin()} disabled={originStatus === "loading"}>{t("planner.searchOrigin")}</button>
                <button type="button" onClick={useGpsOrigin} disabled={originStatus === "loading"}><Navigation aria-hidden="true" size={15} /> {t("planner.useGps")}</button>
              </div>
              {travelOrigin && <small>{t("planner.originActive", { place: travelOrigin.label })}</small>}
              {originStatus === "error" && <small role="alert">{t("planner.originError")}</small>}
            </label>
            <label className="radius-setting">
              <span>{t("planner.radius")}</span>
              <input type="range" min="5" max="300" step="5"
                value={maxDistanceKm}
                onChange={(event) => {
                  const nextRadius = Number(event.target.value);
                  setMaxDistanceKm(nextRadius);
                  if (
                    selected.distanceKm > nextRadius ||
                    (region !== "all" && selected.region !== region)
                  ) {
                    const nextSelected = destinations.find(
                      (destination) =>
                        (region === "all" || destination.region === region) &&
                        destination.distanceKm <= nextRadius,
                    );
                    if (nextSelected) setSelected(nextSelected);
                  }
                  setControlsOverridePrompt(true);
                }}
              />
              <output>{t("planner.radiusValue", { count: maxDistanceKm })}</output>
              <small>{t("planner.radiusHelp")}</small>
            </label>
          </div>

          <div className="interest-chips" aria-label={t("planner.interests")}>
            {interestOptions.map((interest) => (
              <button
                type="button"
                key={interest}
                className={interests.includes(interest) ? "chip active" : "chip"}
                aria-pressed={interests.includes(interest)}
                onClick={() => {
                  toggleInterest(interest);
                  setControlsOverridePrompt(true);
                }}
              >
                {interestLabel(interest)}
              </button>
            ))}
            <span className="chip active baseline-chip">
              {t("planner.crowdDefault")}
              <Check aria-hidden="true" size={15} />
            </span>
          </div>

          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => buildPlan()}
              disabled={loading}
            >
              {loading ? t("planner.building") : t("planner.build")}
              <ArrowRight aria-hidden="true" size={19} />
            </button>
            <a href="#explore" className="text-link">
              {t("planner.explore")}
            </a>
          </div>
          <p className="trust-note">
            {t("planner.noSignup")}
          </p>
        </div>

        <div
          className="map-panel"
          id="destination-map"
          aria-label={t("map.destinationMap")}
        >
          <div className="map-switch" role="group" aria-label={t("map.view")}>
            <button
              className={mapMode === "map" ? "active" : ""}
              onClick={() => setMapMode("map")}
            >
              {t("map.map")}
            </button>
            <button
              className={mapMode === "list" ? "active" : ""}
              onClick={() => setMapMode("list")}
            >
              {t("map.list")}
            </button>
            <button
              className={showCrowdLayer ? "active crowd-toggle" : "crowd-toggle"}
              aria-pressed={showCrowdLayer}
              onClick={() => {
                const next = !showCrowdLayer;
                setShowCrowdLayer(next);
                showToast(
                  next ? t("map.crowdEnabled") : t("map.crowdHidden"),
                  "info",
                );
              }}
            >
              {t("map.crowds")}
            </button>
          </div>
          {mapMode === "map" ? (
            <DestinationMap
              destinations={visibleDestinations}
              selected={selected}
              onSelect={setSelected}
              showCrowdLayer={showCrowdLayer}
              routeLink={routeLink}
              locale={locale}
              routeStops={routeStops}
              routeModes={effectiveRouteModes}
              routeOrigin={travelOrigin}
              accommodations={visibleAccommodations}
              showAccommodations={showAccommodations}
              onToggleAccommodations={() =>
                setShowAccommodations((value) => !value)
              }
            />
          ) : (
            <div className="map-list">
              <p className="eyebrow">{nearbyLabel}</p>
              <p className="map-list-context">
                {mockLocation
                  ? t("map.ordered", { place: mockLocation.name })
                  : region === "all"
                    ? t("map.showingAll")
                    : t("map.showingRegion", { region: regionLabel(region) })}
              </p>
              {visibleDestinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => {
                    setSelected(destination);
                    setMapMode("map");
                  }}
                >
                  <span>
                    <strong>{destination.name}</strong>
                    <small>{kindLabel(destination)}</small>
                  </span>
                  <span className="inline-icon">
                    {mockLocation
                      ? `${haversineKm(
                          mockLocation.lat,
                          mockLocation.lng,
                          destination.lat,
                          destination.lng,
                        ).toFixed(1)} km`
                      : destination.region}
                    <ArrowRight aria-hidden="true" size={15} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <a
            className="map-credit"
            href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=14/${selected.lat}/${selected.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("map.osm")}
            <ExternalLink aria-hidden="true" size={12} />
          </a>
        </div>
      </section>

      <section className="plan-section home-only" id="trip-plan" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("plan.eyebrow")}</p>
            <h2>
              {plan.length
                ? t("plan.summary", {
                    count: plan.length,
                    days: plural(locale, plan.length, "global.day", "global.days"),
                  })
                : t("plan.empty")}
            </h2>
          </div>
          {plan.length > 0 && (
            <div className="plan-tools">
              <div className="source-badges">
                <span className={weatherSource === "live" ? "live" : ""}>
                  {weatherSource === "live" && (
                    <Circle aria-hidden="true" size={8} fill="currentColor" />
                  )}
                  {weatherSource === "live"
                    ? t("plan.liveWeather")
                    : t("plan.weatherUnavailable")}
                </span>
                <span>
                  <Sparkles aria-hidden="true" size={14} />
                  {t("plan.crowdPredicted")}
                </span>
              </div>
              <div className="plan-actions">
                <button
                  type="button"
                  className="outline-button compact"
                  aria-expanded={whyPlanOpen}
                  onClick={() => setWhyPlanOpen((value) => !value)}
                >
                  <Info aria-hidden="true" size={16} />
                  {t("plan.why")}
                </button>
                <button
                  type="button"
                  className={planSaved ? "save-plan-button saved" : "save-plan-button"}
                  onClick={savePlan}
                >
                  {planSaved ? (
                    <CheckCircle2 aria-hidden="true" size={16} />
                  ) : (
                    <Save aria-hidden="true" size={16} />
                  )}
                  {planSaved ? t("plan.saved") : t("plan.save")}
                </button>
                <button
                  type="button"
                  className="outline-button compact"
                  onClick={() => navigate("saved")}
                >
                  <FolderOpen aria-hidden="true" size={16} />
                  {t("nav.saved")}
                </button>
              </div>
            </div>
          )}
        </div>

        {plan.length > 0 && whyPlanOpen && (
          <div className="why-plan-panel">
            <div>
              <Sparkles aria-hidden="true" size={19} />
              <strong>{t("plan.preferenceTitle")}</strong>
              <span>
                {interests.length
                  ? t("plan.preferenceValue", {
                      values: interests
                        .map(interestLabel)
                        .join(", ")
                        .toLocaleLowerCase(locale),
                    })
                  : t("plan.preferenceBalanced")}
              </span>
            </div>
            <div>
              <UserRoundCheck aria-hidden="true" size={19} />
              <strong>{t("plan.busyTitle")}</strong>
              <span>{t("plan.busyBody")}</span>
            </div>
            <div>
              <CloudSun aria-hidden="true" size={19} />
              <strong>{t("plan.conditionsTitle")}</strong>
              <span>
                {weatherSource === "live"
                  ? t("plan.conditionsLive")
                  : t("plan.conditionsOffline")}
              </span>
            </div>
            <div>
              <Navigation aria-hidden="true" size={19} />
              <strong>{t("plan.routeTitle")}</strong>
              <span>{t("plan.routeBody", { transport: transportLabel(transport) })}</span>
            </div>
          </div>
        )}

        {crowdDiversion && (
          <aside className="crowd-diversion-banner" aria-label={t("plan.diversionAria")}>
            <span><UserRoundCheck aria-hidden="true" size={21} /></span>
            <div>
              <strong>{t("plan.diversionTitle", { place: crowdDiversion.avoided.name })}</strong>
              <p>
                {t("plan.diversionBody", {
                  avoided: crowdDiversion.avoided.name,
                  alternative: crowdDiversion.alternative.name,
                })}
              </p>
            </div>
          </aside>
        )}

        {planNotice && (
          <div className="plan-notice" role="status">
            <CheckCircle2 aria-hidden="true" size={17} />
            <span>{t(planNotice.key, planNotice.params)}</span>
            {planUndo && (
              <button type="button" onClick={undoPlanChange}>
                <Undo2 aria-hidden="true" size={15} />
                {t("global.undo")}
              </button>
            )}
          </div>
        )}

        {plan.length > 0 ? (
          <div className="plan-grid">
            {plan.map((day, index) => (
              <article
                className={
                  justAddedId &&
                  day.stops.some((stop) => stop.id === justAddedId)
                    ? "day-card just-updated"
                    : "day-card"
                }
                key={`${day.date}-${index}`}
              >
                <div className="day-header">
                  <div>
                    <span>{t("plan.dayNumber", { count: index + 1 })}</span>
                    <h3>{formatDate(day.date, localeCodes[locale])}</h3>
                  </div>
                  <div className="weather">
                    <strong>
                      {t(
                        day.weather?.code === undefined
                          ? "weather.unavailable"
                          : day.weather.code === 0
                            ? "weather.clear"
                            : day.weather.code <= 3
                              ? "weather.partlyCloudy"
                              : day.weather.code <= 57
                                ? "weather.misty"
                                : day.weather.code <= 67
                                  ? "weather.rain"
                                  : day.weather.code <= 77
                                    ? "weather.snow"
                                    : day.weather.code <= 82
                                      ? "weather.showers"
                                      : "weather.storm",
                      )}
                    </strong>
                    <span>
                      {day.weather
                        ? t("weather.range", {
                            min: day.weather.min,
                            max: day.weather.max,
                            rain: day.weather.rain,
                          })
                        : t("weather.noForecast")}
                    </span>
                  </div>
                </div>
                <ol>
                  {day.stops.map((stop, stopIndex) => {
                    const flatIndex =
                      plan
                        .slice(0, index)
                        .reduce((total, previousDay) => total + previousDay.stops.length, 0) +
                      stopIndex;
                    const legIndex = flatIndex - 1;
                    const legMode = legIndex >= 0 ? effectiveRouteModes[legIndex] ?? transport : transport;
                    const previousStop = flatIndex > 0 ? routeStops[flatIndex - 1] : null;
                    const travelMinutes = previousStop
                      ? Math.max(
                          8,
                          Math.round(
                            (haversineKm(previousStop.lat, previousStop.lng, stop.lat, stop.lng) /
                              speedByMode[legMode]) *
                              60,
                          ),
                        )
                      : stop.travelMinutes;
                    const travelOriginLabel = previousStop?.name ?? travelOrigin?.label ?? mockLocation?.name ?? t(
                      "plan.areaCentre",
                      { region: regionLabel(stop.region) },
                    );
                    return <li key={stop.id}>
                      {legIndex >= 0 && (
                        <label className={`leg-selector leg-${legMode}`}>
                          <span>{t("plan.leg", { from: previousStop?.name ?? "", to: stop.name })}</span>
                          <select
                            value={legMode}
                            onChange={(event) => {
                              const nextMode = event.target.value as Transport;
                              setRouteModes(() =>
                                effectiveRouteModes.map((mode, modeIndex) =>
                                  modeIndex === legIndex ? nextMode : mode,
                                ),
                              );
                            }}
                            aria-label={t("plan.legTransport", { from: previousStop?.name ?? "", to: stop.name })}
                          >
                            {transportCodes.map((mode) => (
                              <option key={mode} value={mode}>{transportLabel(mode)}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button
                        className="stop-button"
                        onClick={() => {
                          setSelected(stop);
                          document
                            .querySelector(".map-panel")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span className="stop-time">{stop.suggestedTime}</span>
                        <span className="stop-copy">
                          <strong>{stop.name}</strong>
                          <small>
                            {t("plan.travelVisitFrom", {
                              travel: formatDuration(travelMinutes, locale),
                              transport: transportLabel(legMode).toLocaleLowerCase(locale),
                            origin: travelOriginLabel,
                              visit: stop.visitMinutes,
                            })}
                          </small>
                        </span>
                        <span className={`crowd crowd-${stop.crowd.toLowerCase()}`}>
                          {crowdLabel(stop.crowd)}
                        </span>
                      </button>
                    </li>
                  })}
                </ol>
                <div className="day-footer">
                  <span>{t("plan.totalDistance", { distance: day.distanceKm })}</span>
                  <span>{t("plan.estimateNote")}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-plan">
            <span aria-hidden="true">
              <ArrowRight size={22} />
            </span>
            <p>
              {t("plan.emptyExample")}
            </p>
          </div>
        )}
      </section>

      <section className="explore-section home-only" id="explore">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("explore.eyebrow")}</p>
            <h2>{t("explore.title")}</h2>
          </div>
          <div className="explore-heading-tools">
            <p>
              {t("explore.intro", { count: destinations.length })}
            </p>
            {plannedDestinationIds.size > 0 && (
              <button
                className={hidePlanned ? "planned-filter active" : "planned-filter"}
                aria-pressed={hidePlanned}
                onClick={() => setHidePlanned((value) => !value)}
              >
                {hidePlanned ? (
                  <FolderOpen aria-hidden="true" size={15} />
                ) : (
                  <Check aria-hidden="true" size={15} />
                )}
                {hidePlanned
                  ? t("explore.showPlanned")
                  : t("explore.hidePlanned")}
                <span>{plannedDestinationIds.size}</span>
              </button>
            )}
          </div>
        </div>
        {visibleDestinations.length === 0 ? (
          <div className="empty-explore-filter">
            <CheckCircle2 aria-hidden="true" size={26} />
            <p>{t("explore.allPlanned")}</p>
            <button onClick={() => setHidePlanned(false)}>{t("explore.showPlanned")}</button>
          </div>
        ) : <div className="destination-grid">
          {visibleDestinations.map((destination) => (
            <article
              key={destination.id}
              className={`${selected.id === destination.id ? "destination-card selected" : "destination-card"}${plannedDestinationIds.has(destination.id) ? " in-plan" : ""}`}
            >
              <div className="destination-index">
                {String(visibleDestinations.indexOf(destination) + 1).padStart(2, "0")}
              </div>
              <DestinationPhoto
                name={destination.name}
                region={regionLabel(destination.region)}
                compact
              />
              <span>{kindLabel(destination)}</span>
              <small>{regionLabel(destination.region)}</small>
              <h3>{destination.name}</h3>
              <div className={`explore-crowd crowd-${crowdForExplore(destination).toLowerCase()}`}>
                <span>{crowdLabel(crowdForExplore(destination))}</span>
                <small>
                  {t("explore.estimate", {
                    date: formatDate(startDate, localeCodes[locale]),
                  })}
                </small>
              </div>
              <p>{destinationDescription(destination)}</p>
              <div className="destination-facts">
                <small><Clock3 aria-hidden="true" size={13} />{t("explore.hoursVariable")}</small>
                <small><WalletCards aria-hidden="true" size={13} />{t("explore.priceVariable")}</small>
                <a href={officialDestinationUrl(destination)} target="_blank" rel="noreferrer">
                  {t("explore.officialInfo")} <ExternalLink aria-hidden="true" size={13} />
                </a>
              </div>
              <div className="destination-tags">
                {Array.from(new Set(destination.tags))
                  .slice(0, 3)
                  .map((tag) => (
                    <small key={`${destination.id}-${tag}`}>{interestLabel(tag)}</small>
                  ))}
              </div>
              <div className="destination-actions">
                <button
                  className={
                    plannedDestinationIds.has(destination.id)
                      ? "already-planned"
                      : ""
                  }
                  disabled={plannedDestinationIds.has(destination.id)}
                  onClick={() => addDestinationToPlan(destination)}
                >
                  {plannedDestinationIds.has(destination.id) ? (
                    <CheckCircle2 aria-hidden="true" size={15} />
                  ) : (
                    <BookmarkPlus aria-hidden="true" size={15} />
                  )}
                  {plannedDestinationIds.has(destination.id)
                    ? t("explore.inPlan")
                    : t("explore.add")}
                </button>
                <button
                  onClick={() => {
                    setSelected(destination);
                    document
                      .querySelector(".map-panel")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {t("explore.viewMap")}
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>}
      </section>

      <section className="stays-section home-only" id="stays">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("stays.eyebrow")}</p>
            <h2>{t("stays.title", { place: selected.name })}</h2>
          </div>
          <p>{t("stays.intro")}</p>
        </div>
        <div className="stays-grid">
          {nearbyAccommodations.map((stay) => (
            <article className="stay-card" key={stay.id}>
              <DestinationPhoto name={stay.photoQuery} region={stay.area} compact />
              <div className="stay-card-body">
                <small>{stay.area} · {t("stays.distance", { distance: stay.distanceKm.toFixed(1) })}</small>
                <h3>{stay.name}</h3>
                <div className="stay-meta">
                  <span><Star aria-hidden="true" size={15} fill="currentColor" />{stay.rating}/10 · {t("stays.reviews", { count: stay.reviewCount })}</span>
                  <span>{stay.priceBand} · {t("stays.indicativePrice")}</span>
                </div>
                <p>{t("stays.checked", { date: new Intl.DateTimeFormat(localeCodes[locale], { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${stay.checkedAt}T12:00:00`)) })}</p>
                <a className="primary-button small" href={stay.bookingUrl} target="_blank" rel="noreferrer">
                  {t("stays.openBooking")} <ExternalLink aria-hidden="true" size={15} />
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className="stays-disclosure">{t("stays.disclosure")}</p>
      </section>

      <section className="how-section home-only" id="how">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("how.eyebrow")}</p>
            <h2>{t("how.title")}</h2>
          </div>
        </div>
        <div className="how-grid">
          <article>
            <span>01</span>
            <h3>{t("how.oneTitle")}</h3>
            <p>{t("how.oneBody")}</p>
          </article>
          <article>
            <span>02</span>
            <h3>{t("how.twoTitle")}</h3>
            <p>{t("how.twoBody")}</p>
          </article>
          <article>
            <span>03</span>
            <h3>{t("how.threeTitle")}</h3>
            <p>{t("how.threeBody")}</p>
          </article>
          <article>
            <span>04</span>
            <h3>{t("how.fourTitle")}</h3>
            <p>{t("how.fourBody")}</p>
          </article>
        </div>
      </section>

      <section
        className="saved-plans-section page-section saved-only"
        aria-labelledby="saved-plans-title"
      >
        <div className="saved-plans-heading">
          <div>
            <p className="eyebrow">{t("saved.eyebrow")}</p>
            <h1 id="saved-plans-title">{t("saved.title")}</h1>
            <p>{t("saved.intro")}</p>
          </div>
          <button className="primary-button small" onClick={() => navigate("home")}>
            <Search aria-hidden="true" size={16} />
            {t("nav.explore")}
          </button>
        </div>
        {savedPlans.length === 0 ? (
          <div className="empty-saved-plans">
            <FolderOpen aria-hidden="true" size={32} />
            <h2>{t("saved.emptyTitle")}</h2>
            <p>{t("saved.emptyBody")}</p>
            <button className="primary-button small" onClick={() => navigate("home")}>
              <ArrowRight aria-hidden="true" size={16} />
              {t("nav.explore")}
            </button>
          </div>
        ) : (
          <div className="saved-plans-grid">
            {savedPlans.map((saved) => {
              const stopCount = saved.plan.reduce(
                (total, day) => total + day.stops.length,
                0,
              );
              const start = saved.plan[0]?.date;
              const end = saved.plan.at(-1)?.date;
              return (
                <article
                  key={saved.id}
                  className={
                    activeSavedPlanId === saved.id
                      ? "saved-plan-card current"
                      : "saved-plan-card"
                  }
                >
                  <div className="saved-plan-topline">
                    <span>{regionLabel(saved.region)}</span>
                    {activeSavedPlanId === saved.id && (
                      <small>
                        <CheckCircle2 aria-hidden="true" size={13} />
                        {t("plan.saved")}
                      </small>
                    )}
                  </div>
                  <label className="saved-plan-name">
                    <Pencil aria-hidden="true" size={15} />
                    <span className="sr-only">{t("saved.rename")}</span>
                    <input
                      key={`${saved.id}-${locale}-${saved.customName ?? "auto"}-${saved.copyNumber ?? 0}`}
                      defaultValue={savedPlanName(saved)}
                      maxLength={64}
                      onBlur={(event) =>
                        renameSavedPlan(saved.id, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </label>
                  <div className="saved-plan-meta">
                    <span>
                      <CalendarDays aria-hidden="true" size={15} />
                      {start
                        ? new Intl.DateTimeFormat(localeCodes[locale], {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(`${start}T12:00:00`))
                        : "—"}
                      {end && end !== start
                        ? ` – ${new Intl.DateTimeFormat(localeCodes[locale], {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(`${end}T12:00:00`))}`
                        : ""}
                    </span>
                    <span>
                      <Route aria-hidden="true" size={15} />
                      {saved.plan.length} {plural(locale, saved.plan.length, "global.day", "global.days")} ·{" "}
                      {stopCount} {plural(locale, stopCount, "global.place", "global.places")}
                    </span>
                  </div>
                  <div className="saved-plan-tags">
                    <span>{transportLabel(saved.transport)}</span>
                    {saved.interests.slice(0, 2).map((interest) => (
                      <span key={`${saved.id}-${interest}`}>{interestLabel(interest)}</span>
                    ))}
                  </div>
                  <div className="saved-plan-actions">
                    <button
                      className="saved-plan-open"
                      onClick={() => openSavedPlan(saved)}
                    >
                      <FolderOpen aria-hidden="true" size={15} />
                      {t("saved.open")}
                    </button>
                    <button onClick={() => duplicateSavedPlan(saved)}>
                      <Copy aria-hidden="true" size={15} />
                      {t("saved.duplicate")}
                    </button>
                    <button
                      className="destructive"
                      onClick={() => deleteSavedPlan(saved)}
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      {t("saved.delete")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="feature-section gemdrop-section page-section gemdrop-only" id="gemdrop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("gemdrop.eyebrow")}</p>
            <h2>{t("gemdrop.title")}</h2>
          </div>
          <p>
            {t("gemdrop.intro")}
          </p>
        </div>
        {activeGemDrop && (
          <aside className="activity-banner" role="status">
            <span className="activity-banner-icon"><MapPin aria-hidden="true" size={22} /></span>
            <div>
              <small>{t("gemdrop.activityEyebrow")}</small>
              <strong>{t("gemdrop.activityTitle", { place: activeGemDrop.name })}</strong>
              <p>{t("gemdrop.activityBody")}</p>
            </div>
            <label className="activity-photo-button">
              <Camera aria-hidden="true" size={18} />
              {t("gemdrop.arrivalPhoto")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label={t("gemdrop.arrivalPhoto")}
                onChange={completeGemDropActivity}
              />
            </label>
          </aside>
        )}
        <div className="feature-grid">
          {mockLocation && <article className="drop-control-card">
            <div className="location-status matched">
              <span>{t("gemdrop.current")}</span>
              <strong>{mockLocation.name}</strong>
              <small>{t("gemdrop.alreadyHere")}</small>
            </div>
            <label className="crowd-slider">
              <span>{t("gemdrop.crowdQuestion", { value: crowdReport })}</span>
              <input
                type="range"
                min={1}
                max={5}
                value={crowdReport}
                onChange={(event) => setCrowdReport(Number(event.target.value))}
              />
            </label>
            <button className="primary-button small" onClick={reportCrowd}>
              {t("gemdrop.rate")}
            </button>
            <p className="checkin-message">
              {t(dropMessage.key, dropMessage.params)}{" "}
              {dropMessage.key === "gemdrop.saved" &&
                (gemDropAlternative
                  ? t("gemdrop.alternative", { place: gemDropAlternative.name })
                  : t("gemdrop.noAlternative"))}
            </p>
          </article>}

          <article className="drop-result-card">
            <span className="drop-badge">{t("gemdrop.suggested")}</span>
            {gemDropAlternative ? (
              <>
                <small>{regionLabel(gemDropAlternative.region)}</small>
                <h3>{gemDropAlternative.name}</h3>
                <p>{destinationDescription(gemDropAlternative)}</p>
                <div className="drop-stats">
                  <span>
                    {t("global.kmAway", {
                      distance: haversineKm(
                        (mockLocation ?? selected).lat,
                        (mockLocation ?? selected).lng,
                        gemDropAlternative.lat,
                        gemDropAlternative.lng,
                      ).toFixed(1),
                    })}
                  </span>
                  <span>{t("gemdrop.lower")}</span>
                </div>
                <div className="drop-actions">
                  <button
                    className="primary-button small"
                    onClick={() => {
                      setSelected(gemDropAlternative);
                      setActiveGemDrop(gemDropAlternative);
                    }}
                  >
                    {t("gemdrop.startActivity")}
                  </button>
                  <button
                    className="outline-button"
                    onClick={() => setSelected(gemDropAlternative)}
                  >
                    {t("gemdrop.showMap")}
                  </button>
                </div>
              </>
            ) : (
              <p>{t("gemdrop.chooseAnother")}</p>
            )}
          </article>
        </div>
      </section>

      <section className="gems-section page-section points-only" id="gems">
        <div className="gems-copy">
          <p className="eyebrow">{t("points.eyebrow")}</p>
          <h2>{t("points.title")}</h2>
          <p>{t("points.intro")}</p>
          <div className="balance-grid">
            <article className="balance-card xp-balance">
              <Gem aria-hidden="true" size={20} />
              <span>{t("points.progress")}</span>
              <strong>{xp} GemXP</strong>
              <small>{t("points.progressHelp")}</small>
            </article>
            <article className="balance-card credit-balance">
              <WalletCards aria-hidden="true" size={20} />
              <span>{t("points.rewardBalance")}</span>
              <strong>0 GemCredits</strong>
              <small>{t("points.rewardHelp")}</small>
            </article>
          </div>
          <div className="conversion-flow" aria-label={t("points.flowAria")}>
            <div><span>1</span><strong>{t("points.earn")}</strong><small>{t("points.noRegistration")}</small></div>
            <ArrowRight aria-hidden="true" size={16} />
            <div><span>2</span><strong>{t("points.verify")}</strong><small>{t("points.whenRewards")}</small></div>
            <ArrowRight aria-hidden="true" size={16} />
            <div><span>3</span><strong>{t("points.getCredits")}</strong><small>{t("points.redeem")}</small></div>
          </div>
          <div className="earn-list">
            <span><strong>+60</strong> {t("points.earnedVisit")}</span>
            <span><strong>+20</strong> {t("points.earnedOffPeak")}</span>
            <span><strong>+10</strong> {t("points.earnedTravel")}</span>
            <span><strong>+15</strong> {t("points.earnedPartner")}</span>
            <span><strong>+5</strong> {t("points.earnedPhoto")}</span>
            <span><strong>+70</strong> {t("points.earnedGem")}</span>
          </div>
        </div>
        <div className="checkin-card">
          <div className="checkin-place">
            <span>{t("points.selected")}</span>
            <strong>{selected.name}</strong>
            <button
              onClick={() => navigate("home")}
            >
              {t("global.change")}
            </button>
          </div>
          <div className="checkin-actions">
            <button className="primary-button small" onClick={verifyLocation}>
              {isAtSelectedPlace ? t("points.verifyDemo") : t("points.verifyGps")}
            </button>
            <button className="outline-button" onClick={() => setSettingsOpen(true)}>
              <Settings aria-hidden="true" size={16} />
              {t("points.demoLocation")}
            </button>
          </div>
          <p className={`checkin-message ${checkInKind}`}>
            {t(checkInMessage.key, checkInMessage.params)}
          </p>
          <label className="photo-upload">
            <span>{t("points.attachPhoto")}</span>
            <small>{t("points.photoHelp")}</small>
            <input
              type="file"
              accept="image/*"
              aria-label={t("points.choosePhoto")}
              onChange={handlePhoto}
            />
          </label>
          {photoUrl && (
            <div className="photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={t("points.photoAlt", { name: photoName })} />
              <span>{photoName}</span>
            </div>
          )}
        </div>
        <div className="points-history">
          <div className="points-history-heading">
            <div>
              <History aria-hidden="true" size={20} />
              <div>
                <h3>{t("points.history")}</h3>
                <p>{t("points.historyIntro")}</p>
              </div>
            </div>
            <span>
              {pointHistory.length}{" "}
              {plural(locale, pointHistory.length, "global.entry", "global.entries")}
            </span>
          </div>
          {pointHistory.length === 0 ? (
            <div className="empty-history">
              <Clock3 aria-hidden="true" size={26} />
              <p>{t("points.historyEmpty")}</p>
            </div>
          ) : (
            <ol>
              {pointHistory.map((entry) => (
                <li key={entry.id}>
                  <span className={entry.amount >= 0 ? "point-amount positive" : "point-amount negative"}>
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount} XP
                  </span>
                  <span className="point-reason">
                    <strong>{t(entry.reasonType, entry.reasonParams)}</strong>
                    <time>
                      {new Intl.DateTimeFormat(localeCodes[locale], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </span>
                  <span className="point-balance">
                    {t("points.balance", { count: entry.balanceAfter })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <GemContributionForm locale={locale} onAccepted={rewardGemContribution} />
      </section>

      <section className="feature-section deals-section page-section deals-only" id="deals">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("deals.eyebrow")}</p>
            <h2>{t("deals.title")}</h2>
          </div>
          <p>
            {t("deals.intro")}
          </p>
        </div>
        <div className="deal-filters" aria-label={t("deals.filterAria")}>
          {regionCodes.map(
            (item) => (
              <button
                key={item}
                className={dealRegion === item ? "chip active" : "chip"}
                onClick={() => setDealRegion(item)}
              >
                {regionLabel(item)}
              </button>
            ),
          )}
        </div>
        <div className="deal-filters deal-category-filters" aria-label={t("deals.categoryFilterAria")}>
          {(["all", "bar", "restaurant", "experience", "activity"] as const).map((item) => (
            <button
              key={item}
              className={dealCategory === item ? "chip active" : "chip"}
              onClick={() => setDealCategory(item)}
            >
              {t(`deals.subcategory.${item}`)}
            </button>
          ))}
        </div>
        <div className="deals-grid">
          {visibleDeals.length === 0 && <p className="deals-empty">{t("deals.empty")}</p>}
          {visibleDeals.map((deal) => (
              <article className="deal-card" key={deal.name}>
                <span>{regionLabel(deal.region)}</span>
                <small>{t(`deals.subcategory.${deal.subcategory}`)} · {t(deal.category)}</small>
                <h3>{deal.name}</h3>
                <p>
                  {unlockedDeal === deal.name
                    ? t(deal.offer)
                    : t("deals.future", { count: deal.creditCost })}
                </p>
                <div className="deal-actions">
                  <button onClick={() => previewDeal(deal.name)}>
                    {unlockedDeal === deal.name
                      ? t("deals.shown")
                      : t("deals.preview")}
                  </button>
                  <a href={deal.url} target="_blank" rel="noreferrer">
                    {t("deals.realBusiness")}
                    <ExternalLink aria-hidden="true" size={13} />
                  </a>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section className="notifications-section page-section notifications-only" aria-labelledby="notifications-title">
        <div className="notifications-heading">
          <div>
            <p className="eyebrow">{t("notifications.eyebrow")}</p>
            <h1 id="notifications-title">{t("notifications.title")}</h1>
            <p>{t("notifications.intro")}</p>
          </div>
          <div className="notification-actions">
            {notificationPermission !== "granted" && (
              <button className="primary-button small" onClick={requestNotifications}>
                {t("notifications.enable")}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                className="outline-button"
                onClick={() =>
                  persistNotifications(notifications.map((item) => ({ ...item, read: true })))
                }
              >
                {t("notifications.markAll")}
              </button>
            )}
          </div>
        </div>
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <BellOff aria-hidden="true" size={38} />
              <h2>{t("notifications.emptyTitle")}</h2>
              <p>{t("notifications.emptyBody")}</p>
            </div>
          ) : (
            notifications.map((item) => (
              <article className={item.read ? "" : "unread"} key={item.id}>
                <button
                  className="notification-copy"
                  onClick={() =>
                    persistNotifications(
                      notifications.map((current) =>
                        current.id === item.id ? { ...current, read: true } : current,
                      ),
                    )
                  }
                >
                  <span className="notification-gem">
                    <Bell aria-hidden="true" size={20} />
                  </span>
                  <span>
                    <strong>{t(item.type, item.params)}</strong>
                    <small>{t(item.bodyType ?? "notifications.onBody", item.bodyParams)}</small>
                    <time>
                      {new Intl.DateTimeFormat(localeCodes[locale], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.createdAt))}
                    </time>
                  </span>
                </button>
                <button
                  className="read-toggle"
                  onClick={() =>
                    persistNotifications(
                      notifications.map((current) =>
                        current.id === item.id ? { ...current, read: !current.read } : current,
                      ),
                    )
                  }
                >
                  {t("notifications.markAs", {
                    state: item.read
                      ? t("notifications.unread")
                      : t("notifications.read"),
                  })}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      {accountPrompt !== "hidden" && (
        <aside
          className={
            accountPrompt === "details"
              ? "account-prompt account-details"
              : "account-prompt"
          }
          aria-live="polite"
          aria-label={t("account.title")}
        >
          <button
            className="account-prompt-close"
            aria-label={t("global.close")}
            onClick={snoozeAccountPrompt}
          >
            <X aria-hidden="true" size={17} />
          </button>
          <span className="account-prompt-icon">
            {accountPrompt === "details" ? (
              <UserPlus aria-hidden="true" size={21} />
            ) : (
              <LogIn aria-hidden="true" size={21} />
            )}
          </span>
          {accountPrompt === "prompt" ? (
            <>
              <strong>{t("account.title")}</strong>
              <p>{t("account.body")}</p>
              <div>
                <button onClick={() => setAccountPrompt("details")}>
                  {t("account.cta")}
                </button>
                <button onClick={snoozeAccountPrompt}>{t("account.notNow")}</button>
              </div>
            </>
          ) : (
            <>
              <small>{t("account.coming")}</small>
              <strong>{t("account.title")}</strong>
              <p>{t("account.details")}</p>
              <ul>
                <li><Check aria-hidden="true" size={14} />{t("account.one")}</li>
                <li><Check aria-hidden="true" size={14} />{t("account.two")}</li>
                <li><Check aria-hidden="true" size={14} />{t("account.three")}</li>
              </ul>
              <button className="account-details-done" onClick={snoozeAccountPrompt}>
                {t("account.notNow")}
              </button>
            </>
          )}
        </aside>
      )}

      <LiquidMobileNav
        activePage={appPage}
        ariaLabel={t("nav.sections")}
        onNavigate={navigate}
        items={[
          { page: "home", href: "/app", label: t("nav.explore"), icon: <Search size={19} /> },
          { page: "saved", href: "/saved", label: t("nav.saved"), icon: <FolderOpen size={19} /> },
          { page: "gemdrop", href: "/gemdrop", label: t("nav.gemdrop"), icon: <MapPin size={19} /> },
          { page: "points", href: "/points", label: t("nav.points"), icon: <Gem size={19} /> },
          { page: "gemdeals", href: "/gemdeals", label: t("nav.deals"), icon: <BadgePercent size={19} /> },
        ]}
      />

      <footer>
        <Link
          className="brand footer-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("home");
          }}
          aria-label={t("global.home")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/assets/gemgo-logo-green.svg?v=2" alt="" aria-hidden="true" />
          <span>GemGo</span>
        </Link>
        <p>{t("global.publicMvp")}</p>
        <div className="footer-links">
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/privacy">{t("nav.privacy")}</Link>
        </div>
        <button onClick={shareSite}>
          {t(shareLabel)}
          <Share2 aria-hidden="true" size={16} />
        </button>
      </footer>
      {locationConsentOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={() => setLocationConsentOpen(false)}>
          <section className="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="location-consent-title" onMouseDown={(event) => event.stopPropagation()}>
            <ShieldCheck aria-hidden="true" size={28} />
            <h2 id="location-consent-title">{t("privacy.locationConsentTitle")}</h2>
            <p>{t("privacy.locationConsentBody")}</p>
            <div className="consent-actions">
              <button className="outline-button" onClick={() => setLocationConsentOpen(false)}>{t("account.notNow")}</button>
              <button
                className="primary-button small"
                onClick={() => {
                  window.localStorage.setItem("gemgo-location-consent", "yes");
                  setLocationConsentOpen(false);
                  window.setTimeout(verifyLocation, 0);
                }}
              >
                {t("privacy.allowOnce")}
              </button>
            </div>
          </section>
        </div>
      )}
      {settingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section
            className="settings-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="settings-heading">
              <div><p className="eyebrow">{t("settings.eyebrow")}</p><h2 id="settings-title">{t("settings.title")}</h2></div>
              <button aria-label={t("global.close")} onClick={() => setSettingsOpen(false)}>
                <X aria-hidden="true" size={21} />
              </button>
            </div>
            <p>
              {t("settings.intro")}
            </p>
            <label>
              <span>{t("settings.simulated")}</span>
              <select
                value={mockLocationId ?? ""}
                onChange={(event) => setDemoLocation(event.target.value || null)}
              >
                <option value="">{t("settings.realGps")}</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} · {regionLabel(destination.region)}
                  </option>
                ))}
              </select>
            </label>
            <label className="language-setting">
              <span>
                <Globe2 aria-hidden="true" size={18} />
                {t("settings.language")}
              </span>
              <small>{t("settings.languageHelp")}</small>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                {languageOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="sound-setting">
              <span className="sound-setting-icon">
                {soundEnabled ? (
                  <Volume2 aria-hidden="true" size={20} />
                ) : (
                  <VolumeX aria-hidden="true" size={20} />
                )}
              </span>
              <span>
                <strong>{t("settings.sound")}</strong>
                <small>{t("settings.soundHelp")}</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                className={soundEnabled ? "sound-switch on" : "sound-switch"}
                onClick={() => setSoundPreference(!soundEnabled)}
              >
                <span />
                <span className="sr-only">
                  {soundEnabled
                    ? t("settings.disableSound")
                    : t("settings.enableSound")}
                </span>
              </button>
            </div>
            {mockLocation && (
              <div className="demo-location-card">
                <span>{t("settings.demoActive")}</span>
                <strong>{mockLocation.name}</strong>
                <small>
                  {t("settings.demoHelp", {
                    region: regionLabel(mockLocation.region),
                  })}
                </small>
              </div>
            )}
            <button className="primary-button small" onClick={() => setSettingsOpen(false)}>
              {t("global.apply")}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
