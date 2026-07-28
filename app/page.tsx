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
import {
  ArrowRight,
  BadgePercent,
  Bell,
  BellOff,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  CloudSun,
  ExternalLink,
  Gem,
  History,
  Info,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Undo2,
  UserRoundCheck,
  Volume2,
  VolumeX,
  WalletCards,
  X,
} from "lucide-react";
import alpineData from "./data/destinations.json";
import DestinationMap from "./components/DestinationMap";

type Transport = "walking" | "cycling" | "e-bike" | "driving" | "public";
type Difficulty = "Easy" | "Moderate";
type Region = "All" | "Füssen / Allgäu" | "Bavaria" | "Valle d’Aosta";

export type Destination = {
  id: string;
  name: string;
  kind: string;
  description: string;
  lat: number;
  lng: number;
  distanceKm: number;
  visitMinutes: number;
  popularity: number;
  difficulty: Difficulty;
  tags: string[];
  region: string;
};

type WeatherDay = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
};

type Stop = Destination & {
  crowd: "Low" | "Moderate" | "Busy";
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

type AppPage = "home" | "gemdrop" | "points" | "gemdeals" | "notifications";

type GemNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

type PointEvent = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  balanceAfter: number;
  status: "local" | "verified";
};

type PlanUndo = {
  previousPlan: PlanDay[];
  message: string;
};

type ActionToast = {
  id: string;
  message: string;
  tone: "success" | "info" | "error";
  undo?: () => void;
};

const fussenDestinations = [
  {
    id: "hopfensee",
    name: "Hopfensee",
    kind: "Lakeside loop",
    description: "A gentle lake circuit with wide Alpine views and easy access from Füssen.",
    lat: 47.6072,
    lng: 10.6728,
    distanceKm: 10,
    visitMinutes: 100,
    popularity: 3,
    difficulty: "Easy",
    tags: ["Lakes", "Quiet places", "Cycling", "Sunset"],
  },
  {
    id: "weissensee",
    name: "Weißensee",
    kind: "Quiet lake",
    description: "A calmer swimming lake with a relaxed shore path and mountain backdrop.",
    lat: 47.5755,
    lng: 10.6243,
    distanceKm: 7,
    visitMinutes: 90,
    popularity: 2,
    difficulty: "Easy",
    tags: ["Lakes", "Quiet places", "Swimming", "Nature"],
  },
  {
    id: "alatsee",
    name: "Alatsee",
    kind: "Forest lake",
    description: "A compact high lake hidden in the forest, best reached before the midday peak.",
    lat: 47.5529,
    lng: 10.6367,
    distanceKm: 8,
    visitMinutes: 80,
    popularity: 3,
    difficulty: "Moderate",
    tags: ["Lakes", "Quiet places", "Hiking", "Nature"],
  },
  {
    id: "forggensee",
    name: "Forggensee",
    kind: "Big-lake panorama",
    description: "Open-water views, long cycling stretches and many places to pause by the shore.",
    lat: 47.6057,
    lng: 10.731,
    distanceKm: 13,
    visitMinutes: 110,
    popularity: 3,
    difficulty: "Easy",
    tags: ["Lakes", "Cycling", "Picnic", "Nature"],
  },
  {
    id: "neuschwanstein",
    name: "Neuschwanstein",
    kind: "Castle viewpoint",
    description: "The iconic castle landscape, scheduled early to avoid its busiest hours.",
    lat: 47.5576,
    lng: 10.7498,
    distanceKm: 6,
    visitMinutes: 120,
    popularity: 5,
    difficulty: "Moderate",
    tags: ["Culture", "Views", "Castles", "Iconic"],
  },
  {
    id: "lechfall",
    name: "Lechfall",
    kind: "River gorge",
    description: "A dramatic turquoise river stop just outside town, ideal for a short walk.",
    lat: 47.5666,
    lng: 10.6895,
    distanceKm: 2,
    visitMinutes: 55,
    popularity: 4,
    difficulty: "Easy",
    tags: ["Water", "Walking", "Nature", "Views"],
  },
  {
    id: "kalvarienberg",
    name: "Kalvarienberg",
    kind: "Panoramic walk",
    description: "A short uphill walk rewarded by a wide view over Füssen and the lakes.",
    lat: 47.5654,
    lng: 10.7004,
    distanceKm: 3,
    visitMinutes: 70,
    popularity: 2,
    difficulty: "Moderate",
    tags: ["Views", "Quiet places", "Walking", "Nature"],
  },
  {
    id: "faulenbacher-tal",
    name: "Faulenbacher Valley",
    kind: "Slow nature trail",
    description: "A low-key valley of small lakes and forest paths directly from Füssen.",
    lat: 47.5605,
    lng: 10.6827,
    distanceKm: 4,
    visitMinutes: 90,
    popularity: 2,
    difficulty: "Easy",
    tags: ["Quiet places", "Walking", "Nature", "Lakes"],
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

const normalizedTags = (tags: string[]) =>
  Array.from(
    new Set(
      tags.map((tag) => {
        if (/lake|water|swim/i.test(tag)) return "Lakes";
        if (/culture|heritage|castle|village/i.test(tag)) return "Culture";
        if (/view|photo|scenic/i.test(tag)) return "Views";
        if (/nature|forest|park|wildlife|hiking/i.test(tag)) return "Nature";
        return tag;
      }),
    ),
  );

const publicDemoTags = (place: AlpineSource) => {
  const kind = place.destination_type.toLowerCase();
  const tags = [
    /lake|reservoir/.test(kind) ? "Lakes" : "",
    /castle|cultural|historic|archaeological|heritage|monastery/.test(kind)
      ? "Culture"
      : "",
    /view|route|mountain|pass|hill/.test(kind) ? "Views" : "",
    /nature|valley|wetland|trail|reserve/.test(kind) ? "Nature" : "",
  ].filter(Boolean);
  return tags.length > 0 ? tags : ["Local places"];
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
  kind: place.destination_type,
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
      ? "Moderate"
      : "Easy",
  tags: normalizedTags(publicDemoTags(place)),
  description: `Explore ${place.name}, a ${place.destination_type.toLowerCase()} in ${place.region}, with crowd-aware timing and lower-impact route options.`,
  region: place.region === "Bavaria" ? "Bavaria" : "Valle d’Aosta",
}));

const destinations: Destination[] = [
  ...fussenDestinations.map((place) => ({
    ...place,
    region: "Füssen / Allgäu",
  })),
  ...alpineDestinations,
];

const interestOptions = ["Lakes", "Quiet places", "Culture", "Views", "Nature"];
const transportLabels: Record<Transport, string> = {
  walking: "Walking",
  cycling: "Bike",
  "e-bike": "E-bike",
  driving: "Car",
  public: "Public transport",
};

const speedByMode: Record<Transport, number> = {
  walking: 4.5,
  cycling: 15,
  "e-bike": 19,
  driving: 35,
  public: 18,
};

const gemDeals = [
  {
    name: "Hotel Hechten",
    region: "Füssen / Allgäu",
    category: "Bike-friendly hotel",
    offer: "Concept: late bike check-out + welcome drink",
    creditCost: 25,
    url: "https://www.hotel-hechten.com/en/active/cycling-fussen-bavaria.html",
  },
  {
    name: "AMERON Neuschwanstein",
    region: "Füssen / Allgäu",
    category: "Stay & cycle",
    offer: "Concept: e-bike rental bundle",
    creditCost: 35,
    url: "https://www.ameroncollection.com/en/neuschwanstein-alpsee-resort-spa/discover-the-allgaeu-alps/cycling",
  },
  {
    name: "DIE GAMS",
    region: "Bavaria",
    category: "E-bike stay",
    offer: "Concept: charging + regional snack",
    creditCost: 20,
    url: "https://die-gams.info/en/aktiv/",
  },
  {
    name: "Hotel Comtes de Challant",
    region: "Valle d’Aosta",
    category: "Bike hotel",
    offer: "Concept: 10% GemGo pilot rate",
    creditCost: 30,
    url: "https://www.hotelcomtesdechallant.com/en/offers/discover-the-aosta-valley-by-e-bike",
  },
  {
    name: "Eco Wellness Notre Maison",
    region: "Valle d’Aosta",
    category: "Eco stay · Cogne",
    offer: "Concept: local breakfast upgrade",
    creditCost: 25,
    url: "https://ecobnb.com/IT-ao/hotel/eco-wellness-notre-maison/c0rl9",
  },
  {
    name: "Crabun Hotel",
    region: "Valle d’Aosta",
    category: "Bike hotel",
    offer: "Concept: secure bike storage + aperitivo",
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

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const weatherLabel = (code?: number) => {
  if (code === undefined) return "Forecast unavailable";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 57) return "Misty";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Storm risk";
};

function parsePrompt(prompt: string) {
  const text = prompt.toLowerCase();
  const wordDays: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  let parsedDays = 1;
  const digitMatch = text.match(/\b([1-7])\s*days?\b/);
  const wordMatch = Object.entries(wordDays).find(([word]) =>
    text.includes(`${word} day`),
  );
  if (digitMatch) parsedDays = Number(digitMatch[1]);
  else if (wordMatch) parsedDays = wordMatch[1];

  let parsedTransport: Transport = "public";
  if (text.includes("e-bike") || text.includes("ebike")) parsedTransport = "e-bike";
  else if (text.includes("bike") || text.includes("cycling")) parsedTransport = "cycling";
  else if (text.includes("walk") || text.includes("hiking")) parsedTransport = "walking";
  else if (text.includes("bus") || text.includes("train")) parsedTransport = "public";
  else if (text.includes("car") || text.includes("driving")) parsedTransport = "driving";

  const parsedInterests = new Set<string>();
  if (text.includes("lake") || text.includes("swim")) parsedInterests.add("Lakes");
  const rejectsQuiet =
    /(?:don['’]?t|do not|not|avoid|no)\s+(?:want\s+)?(?:any\s+)?quiet/.test(text) ||
    /quiet\s+places?\s+(?:are\s+)?not/.test(text);
  if (
    !rejectsQuiet &&
    (text.includes("quiet") || text.includes("hidden") || text.includes("peaceful"))
  ) {
    parsedInterests.add("Quiet places");
  }
  if (text.includes("castle") || text.includes("culture")) parsedInterests.add("Culture");
  if (text.includes("view") || text.includes("panorama")) parsedInterests.add("Views");
  if (text.includes("nature") || text.includes("forest")) parsedInterests.add("Nature");

  let region: Region = "All";
  if (text.includes("aosta") || text.includes("cervinia") || text.includes("courmayeur")) {
    region = "Valle d’Aosta";
  } else if (text.includes("füssen") || text.includes("fussen") || text.includes("allgäu")) {
    region = "Füssen / Allgäu";
  } else if (text.includes("bavaria") || text.includes("bayern")) {
    region = "Bavaria";
  }

  return {
    days: parsedDays,
    transport: parsedTransport,
    interests: [...parsedInterests],
    easy: text.includes("easy") || text.includes("gentle"),
    avoidCrowds: true,
    region,
    startDate: text.includes("tomorrow") ? addDays(today(), 1) : undefined,
  };
}

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
  const crowd = score <= 2 ? "Low" : score <= 4 ? "Moderate" : "Busy";
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
  interests: string[],
  difficulty: Difficulty,
  avoidCrowds: boolean,
  transport: Transport,
) {
  let score = 0;
  interests.forEach((interest) => {
    if (destination.tags.includes(interest)) score += 4;
  });
  if (difficulty === "Easy" && destination.difficulty === "Easy") score += 3;
  if (avoidCrowds) score += 6 - destination.popularity;
  if (transport === "walking") score -= destination.distanceKm * 0.3;
  if (transport === "cycling" || transport === "e-bike") {
    if (destination.tags.includes("Cycling")) score += 2;
    score -= destination.distanceKm * 0.05;
  }
  return score;
}

export default function Home() {
  const [appPage, setAppPage] = useState<AppPage>("home");
  const [prompt, setPrompt] = useState(
    "Three days in Valle d’Aosta by e-bike, with lakes and panoramic villages.",
  );
  const [days, setDays] = useState(3);
  const [transport, setTransport] = useState<Transport>("e-bike");
  const [interests, setInterests] = useState(["Lakes", "Views"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [avoidCrowds, setAvoidCrowds] = useState(true);
  const [region, setRegion] = useState<Region>("Valle d’Aosta");
  const [startDate, setStartDate] = useState(today);
  const [controlsOverridePrompt, setControlsOverridePrompt] = useState(false);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [selected, setSelected] = useState<Destination>(destinations[0]);
  const [mapMode, setMapMode] = useState<"map" | "list">("map");
  const [showCrowdLayer, setShowCrowdLayer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weatherSource, setWeatherSource] = useState<"live" | "unavailable">(
    "unavailable",
  );
  const [xp, setXp] = useState(0);
  const [checkInMessage, setCheckInMessage] = useState(
    "Select a place, then verify your position when you arrive.",
  );
  const [checkInKind, setCheckInKind] = useState<"none" | "verified" | "demo">(
    "none",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [shareLabel, setShareLabel] = useState("Share MVP");
  const [crowdReport, setCrowdReport] = useState(4);
  const [dropMessage, setDropMessage] = useState(
    "Report what you see to reveal a calmer nearby alternative.",
  );
  const [dealRegion, setDealRegion] = useState<Region>("All");
  const [unlockedDeal, setUnlockedDeal] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mockLocationId, setMockLocationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<GemNotification[]>([]);
  const [pointHistory, setPointHistory] = useState<PointEvent[]>([]);
  const [planSaved, setPlanSaved] = useState(false);
  const [planUndo, setPlanUndo] = useState<PlanUndo | null>(null);
  const [planNotice, setPlanNotice] = useState("");
  const [whyPlanOpen, setWhyPlanOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState<ActionToast | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    const restoreStoredPoints = window.setTimeout(() => {
      const stored = window.localStorage.getItem("gemgo-xp");
      if (stored) setXp(Number(stored) || 0);
      const storedLocation = window.localStorage.getItem("gemgo-demo-location");
      if (storedLocation && destinations.some((item) => item.id === storedLocation)) {
        setMockLocationId(storedLocation);
      }
      setSoundEnabled(window.localStorage.getItem("gemgo-sound") !== "off");
      const storedNotifications = window.localStorage.getItem("gemgo-notifications");
      if (storedNotifications) {
        try {
          setNotifications(JSON.parse(storedNotifications));
        } catch {
          window.localStorage.removeItem("gemgo-notifications");
        }
      }
      const storedHistory = window.localStorage.getItem("gemgo-point-history");
      if (storedHistory) {
        try {
          setPointHistory(JSON.parse(storedHistory));
        } catch {
          window.localStorage.removeItem("gemgo-point-history");
        }
      } else if (stored && Number(stored) > 0) {
        const openingEvent: PointEvent = {
          id: createId(),
          amount: Number(stored),
          reason: "Existing GemXP balance imported from this device.",
          createdAt: new Date().toISOString(),
          balanceAfter: Number(stored),
          status: "local",
        };
        setPointHistory([openingEvent]);
        window.localStorage.setItem("gemgo-point-history", JSON.stringify([openingEvent]));
      }
      const storedPlan = window.localStorage.getItem("gemgo-saved-plan");
      if (storedPlan) {
        try {
          const restoredPlan = JSON.parse(storedPlan) as PlanDay[];
          if (Array.isArray(restoredPlan) && restoredPlan.length > 0) {
            setPlan(restoredPlan);
            setPlanSaved(true);
          }
        } catch {
          window.localStorage.removeItem("gemgo-saved-plan");
        }
      }
      setNotificationPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
      const path = window.location.pathname.replace(/\/+$/, "");
      setAppPage(
        path === "/gemdrop"
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
        path === "/gemdrop"
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

  const notify = (title: string, body: string) => {
    const item: GemNotification = {
      id: createId(),
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((current) => {
      const next = [item, ...current].slice(0, 100);
      window.localStorage.setItem("gemgo-notifications", JSON.stringify(next));
      return next;
    });
    if ("Notification" in window && Notification.permission === "granted") {
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

  const addPoints = (amount: number, reason: string) => {
    setXp((current) => {
      const nextBalance = Math.max(0, current + amount);
      window.localStorage.setItem("gemgo-xp", String(nextBalance));
      const entry: PointEvent = {
        id: createId(),
        amount,
        reason,
        createdAt: new Date().toISOString(),
        balanceAfter: nextBalance,
        status: "local",
      };
      setPointHistory((history) => {
        const nextHistory = [entry, ...history].slice(0, 200);
        window.localStorage.setItem("gemgo-point-history", JSON.stringify(nextHistory));
        return nextHistory;
      });
      return nextBalance;
    });
    notify(
      amount >= 0 ? `You earned ${amount} GemXP` : `${Math.abs(amount)} GemXP used`,
      reason,
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
      notify("GemGo notifications are on", "Point rewards will also appear on this device.");
    }
  };

  const navigate = (page: AppPage) => {
    const href = page === "home" ? "/" : page === "points" ? "/points" : `/${page}`;
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
        showToast(`Location set to ${destination.name}`, "success");
      }
    } else {
      window.localStorage.removeItem("gemgo-demo-location");
      showToast("Real device location restored", "info");
    }
  };

  const isAtSelectedPlace = mockLocationId === selected.id;

  const visibleDestinations = useMemo(() => {
    const scoped =
      region === "All"
        ? destinations
        : destinations.filter((destination) => destination.region === region);
    if (!mockLocation) return scoped;
    return [...scoped].sort(
      (a, b) =>
        haversineKm(mockLocation.lat, mockLocation.lng, a.lat, a.lng) -
        haversineKm(mockLocation.lat, mockLocation.lng, b.lat, b.lng),
    );
  }, [mockLocation, region]);

  const nearbyLabel = mockLocation ? "Near you" : "Places in this area";
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
      addPoints(10, `Crowd report saved for ${mockLocation.name}.`);
    }
    setDropMessage(
      `Your report for ${mockLocation.name} was saved on this device. +10 GemXP. ${
        gemDropAlternative
          ? `${gemDropAlternative.name} is the calmer nearby GemDrop.`
          : "No lower-crowd alternative is available in this pilot area yet."
      }`,
    );
  };

  const previewDeal = (dealName: string) => {
    setUnlockedDeal(dealName);
    showToast(`${dealName} concept opened`, "info");
  };

  const routeLink = (destination: Destination) => {
    const travelmode =
      transport === "walking"
        ? "walking"
        : transport === "cycling" || transport === "e-bike"
          ? "bicycling"
          : transport === "driving"
            ? "driving"
            : "transit";
    const origin =
      destination.region === "Valle d’Aosta"
        ? "Aosta%2C%20Italy"
        : destination.region === "Bavaria"
          ? "Munich%2C%20Germany"
          : "F%C3%BCssen%2C%20Germany";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.lat},${destination.lng}&travelmode=${travelmode}`;
  };

  const fetchWeather = async (requestedRegion: Region): Promise<WeatherDay[]> => {
    try {
      const coordinates =
        requestedRegion === "Valle d’Aosta"
          ? "latitude=45.74&longitude=7.32"
          : requestedRegion === "Bavaria"
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
    const parsed = controlsOverridePrompt
      ? {
          days,
          transport,
          interests,
          easy: difficulty === "Easy",
          avoidCrowds,
          region,
          startDate: undefined,
        }
      : parsePrompt(prompt);
    const nextDays = parsed.days;
    const nextTransport = parsed.transport;
    const nextInterests = parsed.interests;
    const nextDifficulty = parsed.easy ? "Easy" : difficulty;
    const nextAvoidCrowds = parsed.avoidCrowds || avoidCrowds;
    const nextRegion = parsed.region;
    setDays(nextDays);
    setTransport(nextTransport);
    setInterests(nextInterests);
    setDifficulty(nextDifficulty);
    setAvoidCrowds(nextAvoidCrowds);
    setRegion(nextRegion);
    if (parsed.startDate) setStartDate(parsed.startDate);

    const weather = await fetchWeather(nextRegion);
    const eligible =
      nextRegion === "All"
        ? destinations
        : destinations.filter((destination) => destination.region === nextRegion);
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
      const date = addDays(parsed.startDate ?? startDate, dayIndex);
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
        if (crowd.crowd === "Busy") continue;
        const travelMinutes = Math.max(
          8,
          Math.round((destination.distanceKm / speedByMode[nextTransport]) * 60),
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
    setPlan(newPlan);
    setPlanSaved(false);
    setPlanUndo(null);
    setPlanNotice("Busy predictions were excluded from this itinerary.");
    if (newPlan[0]?.stops[0]) setSelected(newPlan[0].stops[0]);
    setLoading(false);
    window.setTimeout(() => {
      document.getElementById("trip-plan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const updatePrompt = (value: string) => {
    setPrompt(value);
    setControlsOverridePrompt(false);
    const parsed = parsePrompt(value);
    setDays(parsed.days);
    setTransport(parsed.transport);
    setInterests(parsed.interests);
    setDifficulty(parsed.easy ? "Easy" : "Moderate");
    setAvoidCrowds(true);
    setRegion(parsed.region);
    if (parsed.startDate) setStartDate(parsed.startDate);
  };

  const savePlan = () => {
    if (plan.length === 0) return;
    window.localStorage.setItem("gemgo-saved-plan", JSON.stringify(plan));
    setPlanSaved(true);
    setPlanNotice("Plan saved on this device.");
    showToast("Plan saved on this device", "success");
  };

  const addDestinationToPlan = (destination: Destination) => {
    if (plan.some((day) => day.stops.some((stop) => stop.id === destination.id))) {
      setPlanNotice(`${destination.name} is already in your plan.`);
      return;
    }
    const previousPlan = plan;
    const date = plan[0]?.date ?? startDate;
    const crowd = getCrowd(destination, date, 0, true);
    const stop: Stop = {
      ...destination,
      ...crowd,
      suggestedTime: crowd.crowd === "Busy" ? "08:00" : crowd.suggestedTime,
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
      message: `${destination.name} added to My Plan.`,
    });
    setPlanNotice(`${destination.name} added to My Plan.`);
    setJustAddedId(destination.id);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setJustAddedId(null);
      highlightTimerRef.current = null;
    }, 950);
    showToast(`${destination.name} added to Your plan`, "success", () => {
      setPlan(previousPlan);
      setPlanSaved(false);
      setPlanUndo(null);
      setPlanNotice("Last plan change undone.");
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
    setPlanNotice("Last plan change undone.");
    setPlanUndo(null);
    showToast("Plan change undone", "info");
  };

  const verifyLocation = () => {
    if (isAtSelectedPlace) {
      const key = `gemgo-checkin-${selected.id}`;
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, "demo-verified");
        addPoints(5, `Demo check-in completed at ${selected.name}.`);
      }
      setCheckInKind("demo");
      setCheckInMessage(
        `Demo location matched ${selected.name}. +5 demo GemXP — presentation mode, not a real GPS verification.`,
      );
      return;
    }
    if (!navigator.geolocation) {
      setCheckInMessage("Geolocation is not supported on this device.");
      return;
    }
    setCheckInMessage("Checking your position…");
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
            addPoints(60, `GPS check-in verified at ${selected.name}.`);
          }
          setCheckInKind("verified");
          setCheckInMessage(
            `Verified at ${selected.name}. +60 GemXP — this proves presence, not transport mode.`,
          );
        } else {
          setCheckInKind("none");
          setCheckInMessage(
            `You are about ${distance.toFixed(
              distance < 10 ? 1 : 0,
            )} km from ${selected.name}. Check-in unlocks within 500 m.`,
          );
        }
      },
      () => {
        setCheckInMessage(
          "Location permission was unavailable. You can still try the clearly labelled demo.",
        );
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
          `Visit photo linked to ${selected.name}.`,
        );
      }
      setCheckInMessage(
        checkInKind === "verified"
          ? "Photo linked to your verified visit. +5 GemXP."
          : `Photo linked to the demo check-in at ${selected.name}. +2 demo GemXP.`,
      );
    } else {
      setCheckInMessage(
        "Photo preview added locally. Verify a visit before it can earn GemXP.",
      );
    }
  };

  const shareSite = async () => {
    const shareData = {
      title: "GemGo MVP",
      text: "Plan a quieter, lower-impact trip around Füssen and the Allgäu.",
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setShareLabel(navigator.share ? "Shared" : "Link copied");
      showToast(navigator.share ? "GemGo shared" : "Link copied", "success");
      window.setTimeout(() => setShareLabel("Share MVP"), 1800);
    } catch {
      setShareLabel("Share MVP");
    }
  };

  return (
    <main className={`app-page page-${appPage}`}>
      <header className="site-header">
        <Link className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("home"); }} aria-label="GemGo home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/assets/gemgo-logo-green.svg?v=2" alt="" aria-hidden="true" />
          <span>GemGo</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className={appPage === "home" ? "active" : ""} href="/" onClick={(event) => { event.preventDefault(); navigate("home"); }}>Explore</Link>
          <Link className={appPage === "gemdrop" ? "active" : ""} href="/gemdrop" onClick={(event) => { event.preventDefault(); navigate("gemdrop"); }}>GemDrop</Link>
          <Link className={appPage === "points" ? "active" : ""} href="/points" onClick={(event) => { event.preventDefault(); navigate("points"); }}>GemPoints</Link>
          <Link className={appPage === "gemdeals" ? "active" : ""} href="/gemdeals" onClick={(event) => { event.preventDefault(); navigate("gemdeals"); }}>GemDeals</Link>
        </nav>
        <div className="header-actions">
          <button className="xp-pill" aria-label={`${xp} GemXP. Open points.`} onClick={() => navigate("points")}>
            <Gem aria-hidden="true" size={17} strokeWidth={2.4} />
            {xp} XP
          </button>
          <button
            className="notification-button"
            aria-label={`Open notifications. ${notifications.filter((item) => !item.read).length} unread.`}
            onClick={() => navigate("notifications")}
          >
            <Bell aria-hidden="true" size={20} strokeWidth={2.2} />
            {notifications.some((item) => !item.read) && (
              <span>{notifications.filter((item) => !item.read).length}</span>
            )}
          </button>
          <button className="outline-button compact" onClick={shareSite}>
            {shareLabel}
          </button>
          <button
            className="settings-button"
            aria-label="Open app settings"
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
              Undo
            </button>
          )}
        </div>
      )}

      <section className="hero home-only" id="top">
        <div className="planner-panel">
          <p className="eyebrow">Plan less. Experience more.</p>
          <h1>More Alps. Fewer queues.</h1>
          <p className="hero-copy">
            Describe the trip naturally. GemGo resets every preference,
            checks the forecast and prioritises less-crowded times across
            Bavaria, Füssen and Valle d’Aosta.
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
                How GemGo works
              </span>
              {howOpen ? (
                <ChevronUp aria-hidden="true" size={18} />
              ) : (
                <ChevronDown aria-hidden="true" size={18} />
              )}
            </button>
            {howOpen && (
              <div className="how-preview-steps">
                <span><Search aria-hidden="true" size={16} />Describe your trip</span>
                <span><CloudSun aria-hidden="true" size={16} />Compare weather and crowds</span>
                <span><Route aria-hidden="true" size={16} />Get a quieter plan</span>
              </div>
            )}
          </div>

          <form onSubmit={buildPlan} className="planner-form">
            <label htmlFor="trip-prompt">What would you like to do?</label>
            <div className="prompt-row">
              <textarea
                id="trip-prompt"
                value={prompt}
                onChange={(event) => updatePrompt(event.target.value)}
                rows={3}
                aria-describedby="prompt-hint"
              />
              <button
                type="submit"
                className="prompt-submit"
                aria-label="Build this trip"
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
              Mention days, transport, interests and crowd preference.
            </span>
          </form>

          <div className="prompt-suggestions" aria-label="Try a request">
            {[
              "Tomorrow, 2 days in Bavaria by train with castles",
              "Three days in Valle d’Aosta by e-bike, no quiet places",
              "One easy day around Füssen with lakes and views",
            ].map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => updatePrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="quick-settings" aria-label="Trip settings">
            <label>
              <span>Days</span>
              <select
                value={days}
                onChange={(event) => {
                  setDays(Number(event.target.value));
                  setControlsOverridePrompt(true);
                }}
              >
                <option value={1}>1 day</option>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={4}>4 days</option>
                <option value={5}>5 days</option>
                <option value={6}>6 days</option>
                <option value={7}>7 days</option>
              </select>
            </label>
            <label>
              <span>Area</span>
              <select
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value as Region);
                  setControlsOverridePrompt(true);
                }}
              >
                <option value="All">All pilot areas</option>
                <option value="Füssen / Allgäu">Füssen / Allgäu</option>
                <option value="Bavaria">Bavaria</option>
                <option value="Valle d’Aosta">Valle d’Aosta</option>
              </select>
            </label>
            <label>
              <span>Transport</span>
              <select
                value={transport}
                onChange={(event) => {
                  setTransport(event.target.value as Transport);
                  setControlsOverridePrompt(true);
                }}
              >
                {Object.entries(transportLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Start</span>
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
          </div>

          <div className="interest-chips" aria-label="Interests">
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
                {interest}
              </button>
            ))}
            <span className="chip active baseline-chip">
              Crowd-smart by default
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
              {loading ? "Building your trip…" : "Build my trip"}
              <ArrowRight aria-hidden="true" size={19} />
            </button>
            <a href="#explore" className="text-link">
              Explore destinations
            </a>
          </div>
          <p className="trust-note">
            No sign-up to plan or collect GemXP. An account is only needed later
            to convert eligible XP into reward-ready GemCredits.
          </p>
        </div>

        <div className="map-panel" aria-label="Destination map">
          <div className="map-switch" role="group" aria-label="Map view">
            <button
              className={mapMode === "map" ? "active" : ""}
              onClick={() => setMapMode("map")}
            >
              Map
            </button>
            <button
              className={mapMode === "list" ? "active" : ""}
              onClick={() => setMapMode("list")}
            >
              List
            </button>
            <button
              className={showCrowdLayer ? "active crowd-toggle" : "crowd-toggle"}
              aria-pressed={showCrowdLayer}
              onClick={() => {
                const next = !showCrowdLayer;
                setShowCrowdLayer(next);
                showToast(
                  next ? "Crowd veil enabled" : "Crowd veil hidden",
                  "info",
                );
              }}
            >
              Crowds
            </button>
          </div>
          {mapMode === "map" ? (
            <DestinationMap
              destinations={destinations}
              selected={selected}
              onSelect={setSelected}
              showCrowdLayer={showCrowdLayer}
              routeLink={routeLink}
            />
          ) : (
            <div className="map-list">
              <p className="eyebrow">{nearbyLabel}</p>
              <p className="map-list-context">
                {mockLocation
                  ? `Ordered by distance from ${mockLocation.name}.`
                  : `Showing destinations in ${region === "All" ? "all pilot areas" : region}. Enable location to sort by distance.`}
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
                    <small>{destination.kind}</small>
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
            View on OpenStreetMap
            <ExternalLink aria-hidden="true" size={12} />
          </a>
        </div>
      </section>

      <section className="plan-section home-only" id="trip-plan" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your plan</p>
            <h2>
              {plan.length
                ? `${plan.length} ${plan.length === 1 ? "day" : "days"}, balanced for you.`
                : "Build a trip to see your itinerary."}
            </h2>
          </div>
          {plan.length > 0 && (
            <div className="plan-tools">
              <div className="source-badges">
                <span className={weatherSource === "live" ? "live" : ""}>
                  {weatherSource === "live" && (
                    <Circle aria-hidden="true" size={8} fill="currentColor" />
                  )}
                  {weatherSource === "live" ? "Live weather" : "Weather unavailable"}
                </span>
                <span>
                  <Sparkles aria-hidden="true" size={14} />
                  Crowd: predicted
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
                  Why this plan?
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
                  {planSaved ? "Saved" : "Save plan"}
                </button>
              </div>
            </div>
          )}
        </div>

        {plan.length > 0 && whyPlanOpen && (
          <div className="why-plan-panel">
            <div>
              <Sparkles aria-hidden="true" size={19} />
              <strong>Preference match</strong>
              <span>
                {interests.length
                  ? `Prioritised ${interests.join(", ").toLowerCase()}.`
                  : "Balanced across the selected pilot area."}
              </span>
            </div>
            <div>
              <UserRoundCheck aria-hidden="true" size={19} />
              <strong>Busy places removed</strong>
              <span>Automatic suggestions marked Busy are excluded, not merely ranked lower.</span>
            </div>
            <div>
              <CloudSun aria-hidden="true" size={19} />
              <strong>Conditions checked</strong>
              <span>
                {weatherSource === "live"
                  ? "Forecast, date and weekday affect the schedule."
                  : "Date and weekday are used; live weather was unavailable."}
              </span>
            </div>
            <div>
              <Navigation aria-hidden="true" size={19} />
              <strong>Route fit</strong>
              <span>{transportLabels[transport]} travel and off-peak times shape each day.</span>
            </div>
          </div>
        )}

        {planNotice && (
          <div className="plan-notice" role="status">
            <CheckCircle2 aria-hidden="true" size={17} />
            <span>{planNotice}</span>
            {planUndo && (
              <button type="button" onClick={undoPlanChange}>
                <Undo2 aria-hidden="true" size={15} />
                Undo
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
                key={day.date}
              >
                <div className="day-header">
                  <div>
                    <span>Day {index + 1}</span>
                    <h3>{formatDate(day.date)}</h3>
                  </div>
                  <div className="weather">
                    <strong>{weatherLabel(day.weather?.code)}</strong>
                    <span>
                      {day.weather
                        ? `${day.weather.min}° / ${day.weather.max}° · ${day.weather.rain}% rain`
                        : "No live forecast for this date"}
                    </span>
                  </div>
                </div>
                <ol>
                  {day.stops.map((stop) => (
                    <li key={stop.id}>
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
                            {stop.travelMinutes} min by {transportLabels[transport].toLowerCase()} ·{" "}
                            {stop.visitMinutes} min visit
                          </small>
                        </span>
                        <span className={`crowd crowd-${stop.crowd.toLowerCase()}`}>
                          {stop.crowd}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="day-footer">
                  <span>≈ {day.distanceKm} km total</span>
                  <span>
                    Estimates use distance, popularity, weekday and weather.
                  </span>
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
              Try: “Two quiet days with lakes and easy cycling” or set the
              controls above.
            </p>
          </div>
        )}
      </section>

      <section className="explore-section home-only" id="explore">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Explore</p>
            <h2>Local places, not a generic bucket list.</h2>
          </div>
          <p>
            {destinations.length} public-safe pilot destinations across
            Bavaria, Valle d’Aosta and Füssen. Select one to inspect it on the
            map.
          </p>
        </div>
        <div className="destination-grid">
          {visibleDestinations.map((destination) => (
            <article
              key={destination.id}
              className={selected.id === destination.id ? "destination-card selected" : "destination-card"}
            >
              <div className="destination-index">
                {String(visibleDestinations.indexOf(destination) + 1).padStart(2, "0")}
              </div>
              <span>{destination.kind}</span>
              <small>{destination.region}</small>
              <h3>{destination.name}</h3>
              <div className={`explore-crowd crowd-${crowdForExplore(destination).toLowerCase()}`}>
                <span>{crowdForExplore(destination)}</span>
                <small>
                  GemGo estimate for {formatDate(startDate)} · medium confidence
                </small>
              </div>
              <p>{destination.description}</p>
              <div className="destination-tags">
                {Array.from(new Set(destination.tags))
                  .slice(0, 3)
                  .map((tag) => (
                    <small key={`${destination.id}-${tag}`}>{tag}</small>
                  ))}
              </div>
              <div className="destination-actions">
                <button onClick={() => addDestinationToPlan(destination)}>
                  <BookmarkPlus aria-hidden="true" size={15} />
                  Add to plan
                </button>
                <button
                  onClick={() => {
                    setSelected(destination);
                    document
                      .querySelector(".map-panel")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View on map
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section home-only" id="how">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Natural to use. Honest about the data.</h2>
          </div>
        </div>
        <div className="how-grid">
          <article>
            <span>01</span>
            <h3>Describe your day</h3>
            <p>
              GemGo’s MVP recognises days, transport and interests from your
              request, while keeping every setting editable.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Balance the route</h3>
            <p>
              A transparent planner ranks curated places, estimates travel time
              and spreads stops across the available days.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Check live conditions</h3>
            <p>
              Weather comes from Open-Meteo. Crowd labels are predictions with
              medium confidence—not invented real-time counts.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Earn now, redeem later</h3>
            <p>
              GemXP records participation without sign-up. If you later want
              real rewards, an account links eligible verified XP and converts
              it into spendable GemCredits.
            </p>
          </article>
        </div>
      </section>

      <section className="feature-section gemdrop-section page-section gemdrop-only" id="gemdrop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GemDrop · react in the moment</p>
            <h2>Too busy? Drop into a calmer nearby place.</h2>
          </div>
          <p>
            Community reports are pilot signals. They never claim an exact
            live visitor count.
          </p>
        </div>
        <div className="feature-grid">
          {mockLocation && <article className="drop-control-card">
            <div className="location-status matched">
              <span>Your current location</span>
              <strong>{mockLocation.name}</strong>
            </div>
            <label className="crowd-slider">
              <span>How crowded does it feel? {crowdReport}/5</span>
              <input
                type="range"
                min={1}
                max={5}
                value={crowdReport}
                onChange={(event) => setCrowdReport(Number(event.target.value))}
              />
            </label>
            <button className="primary-button small" onClick={reportCrowd}>
              Rate this place · +10 XP
            </button>
            <p className="checkin-message">{dropMessage}</p>
          </article>}

          <article className="drop-result-card">
            <span className="drop-badge">Suggested GemDrop</span>
            {gemDropAlternative ? (
              <>
                <small>{gemDropAlternative.region}</small>
                <h3>{gemDropAlternative.name}</h3>
                <p>{gemDropAlternative.description}</p>
                <div className="drop-stats">
                  <span>
                    {haversineKm(
                      (mockLocation ?? selected).lat,
                      (mockLocation ?? selected).lng,
                      gemDropAlternative.lat,
                      gemDropAlternative.lng,
                    ).toFixed(1)}{" "}
                    km away
                  </span>
                  <span>Lower modelled popularity</span>
                </div>
                <button
                  className="outline-button"
                  onClick={() => setSelected(gemDropAlternative)}
                >
                  Show this place on the map
                </button>
              </>
            ) : (
              <p>Choose another destination to see a nearby alternative.</p>
            )}
          </article>
        </div>
      </section>

      <section className="gems-section page-section points-only" id="gems">
        <div className="gems-copy">
          <p className="eyebrow">GemXP + GemCredits</p>
          <h2>Progress first. Real rewards only when you choose them.</h2>
          <p>
            Planning and earning GemXP never require an account. An account is
            requested only when you decide to convert eligible, verified XP
            into GemCredits for real rewards.
          </p>
          <div className="balance-grid">
            <article className="balance-card xp-balance">
              <Gem aria-hidden="true" size={20} />
              <span>Your progress</span>
              <strong>{xp} GemXP</strong>
              <small>Starts immediately · local to this device · not spendable</small>
            </article>
            <article className="balance-card credit-balance">
              <WalletCards aria-hidden="true" size={20} />
              <span>Reward-ready balance</span>
              <strong>0 GemCredits</strong>
              <small>Account-linked · only verified XP can become credits</small>
            </article>
          </div>
          <div className="conversion-flow" aria-label="How XP becomes GemCredits">
            <div><span>1</span><strong>Earn GemXP</strong><small>No registration needed</small></div>
            <ArrowRight aria-hidden="true" size={16} />
            <div><span>2</span><strong>Verify & link</strong><small>Only when you want rewards</small></div>
            <ArrowRight aria-hidden="true" size={16} />
            <div><span>3</span><strong>Get GemCredits</strong><small>Redeem with real partners</small></div>
          </div>
          <div className="earn-list">
            <span><strong>+60</strong> verified recommended visit</span>
            <span><strong>+20</strong> off-peak or off-season choice</span>
            <span><strong>+10</strong> sustainable travel evidence</span>
            <span><strong>+15</strong> local partner visit</span>
            <span><strong>+5</strong> original visit photo</span>
          </div>
        </div>
        <div className="checkin-card">
          <div className="checkin-place">
            <span>Selected destination</span>
            <strong>{selected.name}</strong>
            <button
              onClick={() => navigate("home")}
            >
              Change
            </button>
          </div>
          <div className="checkin-actions">
            <button className="primary-button small" onClick={verifyLocation}>
              {isAtSelectedPlace ? "Verify demo-location check-in" : "Verify GPS check-in"}
            </button>
            <button className="outline-button" onClick={() => setSettingsOpen(true)}>
              <Settings aria-hidden="true" size={16} />
              Demo location
            </button>
          </div>
          <p className={`checkin-message ${checkInKind}`}>{checkInMessage}</p>
          <label className="photo-upload">
            <span>Attach a visit photo</span>
            <small>Preview stays on this device in the MVP.</small>
            <input
              type="file"
              accept="image/*"
              aria-label="Choose a visit photo"
              onChange={handlePhoto}
            />
          </label>
          {photoUrl && (
            <div className="photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={`Local preview of ${photoName}`} />
              <span>{photoName}</span>
            </div>
          )}
        </div>
        <div className="points-history">
          <div className="points-history-heading">
            <div>
              <History aria-hidden="true" size={20} />
              <div>
                <h3>GemXP history</h3>
                <p>Every local movement includes its reason, time and resulting balance.</p>
              </div>
            </div>
            <span>{pointHistory.length} {pointHistory.length === 1 ? "entry" : "entries"}</span>
          </div>
          {pointHistory.length === 0 ? (
            <div className="empty-history">
              <Clock3 aria-hidden="true" size={26} />
              <p>Your first check-in, crowd report or visit photo will appear here.</p>
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
                    <strong>{entry.reason}</strong>
                    <time>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </span>
                  <span className="point-balance">{entry.balanceAfter} XP balance</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="feature-section deals-section page-section deals-only" id="deals">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GemDeals · reward the good route</p>
            <h2>Real local businesses, concept partnerships for now.</h2>
          </div>
          <p>
            GemXP is never spent directly. Future verified XP becomes
            GemCredits, which can unlock partner rewards. Business names and
            links are real; these terms are mock pilot proposals.
          </p>
        </div>
        <div className="deal-filters" aria-label="Filter GemDeals">
          {(["All", "Füssen / Allgäu", "Bavaria", "Valle d’Aosta"] as Region[]).map(
            (item) => (
              <button
                key={item}
                className={dealRegion === item ? "chip active" : "chip"}
                onClick={() => setDealRegion(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className="deals-grid">
          {gemDeals
            .filter((deal) => dealRegion === "All" || deal.region === dealRegion)
            .map((deal) => (
              <article className="deal-card" key={deal.name}>
                <span>{deal.region}</span>
                <small>{deal.category}</small>
                <h3>{deal.name}</h3>
                <p>
                  {unlockedDeal === deal.name
                    ? deal.offer
                    : `A future reward concept for ${deal.creditCost} GemCredits.`}
                </p>
                <div className="deal-actions">
                  <button onClick={() => previewDeal(deal.name)}>
                    {unlockedDeal === deal.name ? "Concept shown" : "Preview concept"}
                  </button>
                  <a href={deal.url} target="_blank" rel="noreferrer">
                    Real business
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
            <p className="eyebrow">Activity centre</p>
            <h1 id="notifications-title">Notifications</h1>
            <p>Your GemGo history stays on this device for the MVP.</p>
          </div>
          <div className="notification-actions">
            {notificationPermission !== "granted" && (
              <button className="primary-button small" onClick={requestNotifications}>
                Enable phone notifications
              </button>
            )}
            {notifications.length > 0 && (
              <button
                className="outline-button"
                onClick={() =>
                  persistNotifications(notifications.map((item) => ({ ...item, read: true })))
                }
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <BellOff aria-hidden="true" size={38} />
              <h2>No notifications yet</h2>
              <p>Check in, rate a place or add a visit photo to see your activity here.</p>
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
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                    <time>
                      {new Intl.DateTimeFormat("en", {
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
                  Mark as {item.read ? "unread" : "read"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <nav className="mobile-tabbar" aria-label="GemGo sections">
        <Link className={appPage === "home" ? "active" : ""} href="/" onClick={(event) => { event.preventDefault(); navigate("home"); }}><Search aria-hidden="true" size={19} />Explore</Link>
        <Link className={appPage === "gemdrop" ? "active" : ""} href="/gemdrop" onClick={(event) => { event.preventDefault(); navigate("gemdrop"); }}><MapPin aria-hidden="true" size={19} />GemDrop</Link>
        <Link className={appPage === "points" ? "active" : ""} href="/points" onClick={(event) => { event.preventDefault(); navigate("points"); }}><Gem aria-hidden="true" size={19} />Points</Link>
        <Link className={appPage === "gemdeals" ? "active" : ""} href="/gemdeals" onClick={(event) => { event.preventDefault(); navigate("gemdeals"); }}><BadgePercent aria-hidden="true" size={19} />Deals</Link>
      </nav>

      <footer>
        <Link
          className="brand footer-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("home");
          }}
          aria-label="GemGo home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/assets/gemgo-logo-green.svg?v=2" alt="" aria-hidden="true" />
          <span>GemGo</span>
        </Link>
        <p>Public MVP · Bavaria · Füssen / Allgäu · Valle d’Aosta.</p>
        <button onClick={shareSite}>
          {shareLabel}
          <Share2 aria-hidden="true" size={16} />
        </button>
      </footer>
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
              <div><p className="eyebrow">MVP presentation mode</p><h2 id="settings-title">App settings</h2></div>
              <button aria-label="Close settings" onClick={() => setSettingsOpen(false)}>
                <X aria-hidden="true" size={21} />
              </button>
            </div>
            <p>
              Choose a simulated location to test only the features that normally require GPS.
              The app always labels this as demo data.
            </p>
            <label>
              <span>Simulated location</span>
              <select
                value={mockLocationId ?? ""}
                onChange={(event) => setDemoLocation(event.target.value || null)}
              >
                <option value="">Use real device GPS</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} · {destination.region}
                  </option>
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
                <strong>Action sounds</strong>
                <small>Short, subtle feedback for rewards and confirmations.</small>
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
                  {soundEnabled ? "Disable action sounds" : "Enable action sounds"}
                </span>
              </button>
            </div>
            {mockLocation && (
              <div className="demo-location-card">
                <span>Demo location active</span>
                <strong>{mockLocation.name}</strong>
                <small>{mockLocation.region} · crowd reports, check-in and visit photos are now testable here.</small>
              </div>
            )}
            <button className="primary-button small" onClick={() => setSettingsOpen(false)}>
              Apply and continue
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
