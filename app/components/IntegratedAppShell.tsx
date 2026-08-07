"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bike,
  Bus,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Coins,
  Compass,
  Copy,
  Download,
  Footprints,
  Gift,
  Globe2,
  HeartHandshake,
  Info,
  Languages,
  List,
  LocateFixed,
  MapPin,
  Map as MapIcon,
  Menu,
  Mountain,
  Navigation,
  Pencil,
  QrCode,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DestinationPhoto from "./DestinationPhoto";
import IntegratedResultCard from "./IntegratedResultCard";
import VisitFeedback from "./VisitFeedback";
import { locales, type Locale } from "../domain";
import { localeNames, usePersistentLocale } from "../hooks/usePersistentLocale";
import {
  difficultyLabel,
  kindLabel,
  panUi,
  transportLabel,
} from "../i18n/pan-ui";
import {
  allExperiences,
  catalogueSummary,
  pilotRegions,
  totalCatalogueEntries,
  type PilotRegion,
} from "../product/catalogue";
import type { NearbyTransitStop } from "../product/transit";
import {
  applyPromptToPreferences,
  haversineKm,
  rankExperiences,
  type RankedExperience,
} from "../product/recommendation-engine";
import {
  useLiveWeather,
  useRoadTimes,
  useSelectedRoute,
} from "../product/live-context";
import {
  appendPointEvent,
  createRewardUnlock,
  createSavedTrip,
  loadActiveTrip,
  loadLedger,
  loadRewardUnlocks,
  loadSavedTrips,
  migrateLegacyTrip,
  pointBalance,
  saveActiveTrip,
  saveLedger,
  saveRewardUnlocks,
  saveTrips,
  type GemPointEvent,
  type RewardUnlock,
  type SavedTrip,
} from "../product/storage";
import { defaultPreferences } from "../product/data";
import type {
  AppSection,
  Experience,
  ExperienceKind,
  SearchPreferences,
  TransportMode,
} from "../product/types";

type ExploreStage = "brief" | "results" | "experience";
type TripMode = "active" | "saved";
type MapFocus = { region: PilotRegion | null; requestId: number };
type UndoSnapshot = {
  savedTrips: SavedTrip[];
  activeTrip: SavedTrip | null;
  label: string;
};

const MultiDayTripPlanner = dynamic(() => import("./MultiDayTripPlanner"), {
  ssr: false,
  loading: () => null,
});

const ExperienceMap = dynamic(() => import("./ExperienceMap"), {
  ssr: false,
  loading: () => (
    <div className="experience-map-shell experience-map-placeholder" aria-busy="true" />
  ),
});

const EMPTY_EXPERIENCES: Experience[] = [];

const copy = {
  en: {
    explore: "Explore",
    trip: "My Trip",
    rewards: "GemPoints",
    about: "About",
    account: "Profile",
    headline: "What would you like to experience?",
    intro:
      "Describe your plan naturally, then adjust the constraints that matter.",
    prompt: "Tell GemGo what you are looking for",
    origin: "Starting from",
    travel: "Maximum travel time",
    mobility: "Mobility",
    time: "Available time",
    experience: "Experience type",
    needs: "Difficulty and needs",
    search: "Show my best alternatives",
    results: "Your three best alternatives",
    adjust: "Adjust preferences",
    active: "Active plan",
    saved: "Saved trips",
    verify: "Verify visit",
    offline: "Save essentials offline",
    noTrip: "No active trip yet",
    find: "Find an experience",
    points: "GemPoints",
    impact: "Your GemGo impact",
  },
  it: {
    explore: "Esplora",
    trip: "Il mio viaggio",
    rewards: "GemPoints",
    about: "Informazioni",
    account: "Profilo",
    headline: "Che esperienza vorresti vivere?",
    intro:
      "Descrivi il piano in modo naturale, poi modifica i vincoli importanti.",
    prompt: "Spiega a GemGo cosa stai cercando",
    origin: "Partenza da",
    travel: "Tempo massimo di viaggio",
    mobility: "Mobilità",
    time: "Tempo disponibile",
    experience: "Tipo di esperienza",
    needs: "Difficoltà ed esigenze",
    search: "Mostra le alternative migliori",
    results: "Le tue tre alternative migliori",
    adjust: "Modifica preferenze",
    active: "Piano attivo",
    saved: "Viaggi salvati",
    verify: "Verifica visita",
    offline: "Salva dati essenziali offline",
    noTrip: "Non hai ancora un viaggio attivo",
    find: "Trova un’esperienza",
    points: "GemPoints",
    impact: "Il tuo impatto GemGo",
  },
  de: {
    explore: "Entdecken",
    trip: "Meine Reise",
    rewards: "GemPoints",
    about: "Über GemGo",
    account: "Profil",
    headline: "Was möchtest du erleben?",
    intro:
      "Beschreibe deinen Plan und passe danach die wichtigsten Vorgaben an.",
    prompt: "Beschreibe GemGo, wonach du suchst",
    origin: "Startpunkt",
    travel: "Maximale Reisezeit",
    mobility: "Mobilität",
    time: "Verfügbare Zeit",
    experience: "Erlebnisart",
    needs: "Schwierigkeit und Bedürfnisse",
    search: "Beste Alternativen anzeigen",
    results: "Deine drei besten Alternativen",
    adjust: "Einstellungen ändern",
    active: "Aktiver Plan",
    saved: "Gespeicherte Reisen",
    verify: "Besuch bestätigen",
    offline: "Wichtige Daten offline speichern",
    noTrip: "Noch keine aktive Reise",
    find: "Erlebnis finden",
    points: "GemPoints",
    impact: "Deine GemGo-Wirkung",
  },
  fr: {
    explore: "Explorer",
    trip: "Mon voyage",
    rewards: "GemPoints",
    about: "À propos",
    account: "Profil",
    headline: "Quelle expérience recherchez-vous ?",
    intro: "Décrivez votre projet puis ajustez les contraintes essentielles.",
    prompt: "Expliquez à GemGo ce que vous recherchez",
    origin: "Départ",
    travel: "Temps de trajet maximal",
    mobility: "Mobilité",
    time: "Temps disponible",
    experience: "Type d’expérience",
    needs: "Difficulté et besoins",
    search: "Afficher mes meilleures alternatives",
    results: "Vos trois meilleures alternatives",
    adjust: "Modifier les préférences",
    active: "Voyage actif",
    saved: "Voyages enregistrés",
    verify: "Vérifier la visite",
    offline: "Enregistrer les informations hors ligne",
    noTrip: "Aucun voyage actif",
    find: "Trouver une expérience",
    points: "GemPoints",
    impact: "Votre impact GemGo",
  },
  sl: {
    explore: "Razišči",
    trip: "Moje potovanje",
    rewards: "GemPoints",
    about: "O projektu",
    account: "Profil",
    headline: "Kaj bi radi doživeli?",
    intro: "Opišite načrt in nato prilagodite pomembne omejitve.",
    prompt: "Povejte GemGo, kaj iščete",
    origin: "Začetna točka",
    travel: "Najdaljši čas potovanja",
    mobility: "Mobilnost",
    time: "Razpoložljiv čas",
    experience: "Vrsta doživetja",
    needs: "Zahtevnost in potrebe",
    search: "Prikaži najboljše alternative",
    results: "Vaše tri najboljše alternative",
    adjust: "Spremeni nastavitve",
    active: "Aktivni načrt",
    saved: "Shranjena potovanja",
    verify: "Potrdi obisk",
    offline: "Shrani bistvene podatke brez povezave",
    noTrip: "Aktivnega potovanja še ni",
    find: "Poišči doživetje",
    points: "GemPoints",
    impact: "Vaš vpliv GemGo",
  },
} as const;

const gemPointsCopy = {
  en: {
    eyebrow: "One clear currency",
    title: "GemPoints",
    intro:
      "Earn GemPoints for verified, lower-impact choices. Partner rewards shown here are demonstrative until agreements are active.",
    progress: "Progress to your first reward",
    available: "Demonstration rewards",
    history: "GemPoints history",
    empty: "No point events yet.",
    codes: "Unlocked codes",
    expires: "expires",
    impact: "Your GemGo impact",
    verified: "verified quieter experiences",
    drops: "GemDrops accepted",
    partners: "partner visits",
    current: "current GemPoints",
    partner: "Demonstration partner",
    local: "locally relevant",
    unlock: "Unlock reward",
    badges: "Badge journey",
    badgesIntro:
      "Badges reflect real actions stored on this device, inspired by Alpify’s progressive achievement model.",
    earned: "Earned",
    inProgress: "In progress",
    notStarted: "Not started",
    badgeNames: [
      "First Gem",
      "Alpine Explorer",
      "Bike Trail Hero",
      "Green Traveller",
      "Hidden Gem Hunter",
      "Route Builder",
    ],
    badgeDetails: [
      "Verify 1 visit",
      "Verify 5 visits",
      "Complete 3 bicycle visits",
      "Make 5 lower-impact journeys",
      "Visit 3 lower-pressure places",
      "Save 3 Alpine trips",
    ],
    offers: ["10% off a regional tasting", "Free hot drink with a meal"],
  },
  it: {
    eyebrow: "Una sola valuta",
    title: "GemPoints",
    intro:
      "Guadagna GemPoints con scelte verificate e a minore impatto. I premi partner mostrati sono dimostrativi finché gli accordi non saranno attivi.",
    progress: "Progresso verso il primo premio",
    available: "Premi dimostrativi",
    history: "Storico GemPoints",
    empty: "Non ci sono ancora movimenti.",
    codes: "Codici sbloccati",
    expires: "scade alle",
    impact: "Il tuo impatto GemGo",
    verified: "esperienze più tranquille verificate",
    drops: "GemDrop accettati",
    partners: "visite presso partner",
    current: "GemPoints attuali",
    partner: "Partner dimostrativo",
    local: "rilevante per il territorio",
    unlock: "Sblocca premio",
    badges: "Percorso badge",
    badgesIntro:
      "I badge riflettono azioni reali salvate sul dispositivo e riprendono il modello progressivo di Alpify.",
    earned: "Ottenuto",
    inProgress: "In corso",
    notStarted: "Non iniziato",
    badgeNames: [
      "Prima gemma",
      "Esploratore alpino",
      "Eroe della bici",
      "Viaggiatore green",
      "Cacciatore di gemme",
      "Creatore di itinerari",
    ],
    badgeDetails: [
      "Verifica 1 visita",
      "Verifica 5 visite",
      "Completa 3 visite in bici",
      "Fai 5 viaggi a minore impatto",
      "Visita 3 luoghi a minore pressione",
      "Salva 3 viaggi alpini",
    ],
    offers: [
      "10% su una degustazione regionale",
      "Bevanda calda gratuita con un pasto",
    ],
  },
  de: {
    eyebrow: "Eine klare Punktewährung",
    title: "GemPoints",
    intro:
      "Sammle GemPoints für bestätigte, umweltschonendere Entscheidungen. Partnerprämien sind bis zu aktiven Vereinbarungen als Demo gekennzeichnet.",
    progress: "Fortschritt bis zur ersten Prämie",
    available: "Demonstrationsprämien",
    history: "GemPoints-Verlauf",
    empty: "Noch keine Punkteereignisse.",
    codes: "Freigeschaltete Codes",
    expires: "gültig bis",
    impact: "Deine GemGo-Wirkung",
    verified: "bestätigte ruhigere Erlebnisse",
    drops: "akzeptierte GemDrops",
    partners: "Partnerbesuche",
    current: "aktuelle GemPoints",
    partner: "Demonstrationspartner",
    local: "lokal relevant",
    unlock: "Prämie freischalten",
    badges: "Abzeichen-Reise",
    badgesIntro:
      "Abzeichen basieren auf echten, auf diesem Gerät gespeicherten Aktionen und Alpifys Fortschrittsmodell.",
    earned: "Erhalten",
    inProgress: "In Arbeit",
    notStarted: "Nicht begonnen",
    badgeNames: [
      "Erstes Juwel",
      "Alpenentdecker",
      "Radweg-Held",
      "Grüner Reisender",
      "Geheimtipp-Jäger",
      "Routenplaner",
    ],
    badgeDetails: [
      "1 Besuch bestätigen",
      "5 Besuche bestätigen",
      "3 Besuche per Fahrrad",
      "5 Reisen mit geringerem Einfluss",
      "3 weniger belastete Orte besuchen",
      "3 Alpenreisen speichern",
    ],
    offers: [
      "10 % auf eine regionale Verkostung",
      "Kostenloses Heißgetränk zu einer Mahlzeit",
    ],
  },
  fr: {
    eyebrow: "Une monnaie claire",
    title: "GemPoints",
    intro:
      "Gagnez des GemPoints grâce à des choix vérifiés et à faible impact. Les récompenses partenaires restent démonstratives jusqu’à la mise en place des accords.",
    progress: "Progression vers la première récompense",
    available: "Récompenses de démonstration",
    history: "Historique GemPoints",
    empty: "Aucun mouvement pour le moment.",
    codes: "Codes débloqués",
    expires: "expire à",
    impact: "Votre impact GemGo",
    verified: "expériences plus calmes vérifiées",
    drops: "GemDrops acceptés",
    partners: "visites partenaires",
    current: "GemPoints actuels",
    partner: "Partenaire de démonstration",
    local: "pertinent localement",
    unlock: "Débloquer",
    badges: "Parcours de badges",
    badgesIntro:
      "Les badges reflètent des actions réelles enregistrées sur cet appareil, selon le modèle progressif d’Alpify.",
    earned: "Obtenu",
    inProgress: "En cours",
    notStarted: "Non commencé",
    badgeNames: [
      "Première pépite",
      "Explorateur alpin",
      "Héros du vélo",
      "Voyageur responsable",
      "Chasseur de pépites",
      "Créateur d’itinéraires",
    ],
    badgeDetails: [
      "Valider 1 visite",
      "Valider 5 visites",
      "Effectuer 3 visites à vélo",
      "Faire 5 trajets à faible impact",
      "Visiter 3 lieux moins fréquentés",
      "Enregistrer 3 voyages alpins",
    ],
    offers: [
      "10 % sur une dégustation régionale",
      "Boisson chaude offerte avec un repas",
    ],
  },
  sl: {
    eyebrow: "Ena jasna valuta",
    title: "GemPoints",
    intro:
      "Pridobite GemPoints za potrjene izbire z manjšim vplivom. Partnerske nagrade so predstavitvene, dokler dogovori niso aktivni.",
    progress: "Napredek do prve nagrade",
    available: "Predstavitvene nagrade",
    history: "Zgodovina GemPoints",
    empty: "Dogodkov s točkami še ni.",
    codes: "Odklenjene kode",
    expires: "poteče ob",
    impact: "Vaš vpliv GemGo",
    verified: "potrjene mirnejše izkušnje",
    drops: "sprejeti GemDropi",
    partners: "obiski partnerjev",
    current: "trenutni GemPoints",
    partner: "Predstavitveni partner",
    local: "lokalno pomembno",
    unlock: "Odkleni nagrado",
    badges: "Pot značk",
    badgesIntro:
      "Značke odražajo resnična dejanja, shranjena v tej napravi, po Alpifyjevem modelu napredka.",
    earned: "Pridobljeno",
    inProgress: "V teku",
    notStarted: "Ni začeto",
    badgeNames: [
      "Prvi dragulj",
      "Alpski raziskovalec",
      "Kolesarski junak",
      "Zeleni popotnik",
      "Lovec na dragulje",
      "Načrtovalec poti",
    ],
    badgeDetails: [
      "Potrdite 1 obisk",
      "Potrdite 5 obiskov",
      "Opravite 3 obiske s kolesom",
      "Opravite 5 poti z manjšim vplivom",
      "Obiščite 3 manj obremenjene kraje",
      "Shranite 3 alpska potovanja",
    ],
    offers: [
      "10 % popusta na regionalno pokušino",
      "Brezplačen topel napitek ob obroku",
    ],
  },
} as const;

const plannerCopy = {
  en: {
    alpineStart:
      "Choose one of the official Alpine pilot locations. GemGo plans movement between Alpine activities, not the journey from home.",
    hoursHint: "Shown in hours and minutes",
    notifications: "Notifications",
  },
  it: {
    alpineStart:
      "Scegli una delle località alpine ufficiali del progetto pilota. GemGo pianifica gli spostamenti tra attività alpine, non il viaggio da casa.",
    hoursHint: "Mostrato in ore e minuti",
    notifications: "Notifiche",
  },
  de: {
    alpineStart:
      "Wähle einen offiziellen Ort des Alpen-Pilotprojekts. GemGo plant Wege zwischen alpinen Aktivitäten, nicht die Anreise von zu Hause.",
    hoursHint: "In Stunden und Minuten",
    notifications: "Benachrichtigungen",
  },
  fr: {
    alpineStart:
      "Choisissez un lieu officiel du pilote alpin. GemGo planifie les déplacements entre activités alpines, pas le trajet depuis votre domicile.",
    hoursHint: "Affiché en heures et minutes",
    notifications: "Notifications",
  },
  sl: {
    alpineStart:
      "Izberite eno od uradnih lokacij alpskega pilota. GemGo načrtuje premike med alpskimi dejavnostmi, ne poti od doma.",
    hoursHint: "Prikazano v urah in minutah",
    notifications: "Obvestila",
  },
} as const;

const transportOptions: Array<{
  id: TransportMode;
  label: string;
  icon: typeof Car;
}> = [
  { id: "walking", label: "Walking", icon: Footprints },
  { id: "bicycle", label: "Bicycle", icon: Bike },
  { id: "public", label: "Public transport", icon: Bus },
  { id: "car", label: "Car", icon: Car },
  { id: "mixed", label: "Mixed mobility", icon: Route },
];

const kindOptions: Array<{ id: ExperienceKind; label: string }> = [
  { id: "hiking", label: "Hiking" },
  { id: "nature", label: "Nature" },
  { id: "villages", label: "Villages" },
  { id: "culture", label: "Culture" },
  { id: "water", label: "Lakes & rivers" },
  { id: "food", label: "Food" },
  { id: "family", label: "Family" },
  { id: "accessible", label: "Accessible" },
  { id: "winter", label: "Winter" },
];

const needOptions = [
  "Children",
  "Dog",
  "Reduced mobility",
  "Stroller",
  "No exposed paths",
  "Indoor alternative",
  "Low-cost",
];
const durationOptions: Array<{
  id: SearchPreferences["availableTime"];
  label: string;
}> = [
  { id: "short", label: "1–2 hours" },
  { id: "half", label: "Half day" },
  { id: "full", label: "Full day" },
  { id: "multi", label: "Multiple days" },
];

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours}h${remainder ? ` ${remainder}m` : ""}`
    : `${minutes}m`;
};

const overlap = (first: ExperienceKind[], second: ExperienceKind[]) =>
  first.some((item) => second.includes(item));
const tr = (locale: Locale, english: string, italian: string) =>
  locale === "it" ? italian : english;
const BADGE_HISTORY_KEY = "gemgo-badge-history-v1";

const appPath = {
  explore: "/app/explore",
  results: "/app/results",
  trip: "/app/my-trip",
  savedTrips: "/app/my-trip/saved",
  points: "/app/gempoints",
} as const;

const badgeValuesFor = (events: GemPointEvent[], trips: SavedTrip[]) => {
  const visits = events.filter((event) => event.type === "visit");
  return [
    visits.length,
    visits.length,
    visits.filter((event) => event.metadata?.transport === "bicycle").length,
    visits.filter((event) =>
      ["walking", "bicycle", "public"].includes(
        event.metadata?.transport ?? "",
      ),
    ).length,
    visits.filter((event) => event.metadata?.crowd === "low").length,
    trips.length,
  ];
};

export default function IntegratedAppShell() {
  const { locale, setLocale } = usePersistentLocale();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [section, setSection] = useState<AppSection>("explore");
  const [stage, setStage] = useState<ExploreStage>("brief");
  const defaultOrigin =
    allExperiences.find((experience) => experience.name === "Cogne") ??
    allExperiences[0];
  const [preferences, setPreferences] = useState<SearchPreferences>({
    ...defaultPreferences,
    origin: defaultOrigin?.name ?? "Cogne",
  });
  const [promptDraft, setPromptDraft] = useState(defaultPreferences.prompt);
  const [originExperienceId, setOriginExperienceId] = useState(
    defaultOrigin?.id ?? "",
  );
  const [selectedId, setSelectedId] = useState(
    defaultOrigin?.id ?? allExperiences[0]?.id ?? "",
  );
  const [showMore, setShowMore] = useState(false);
  const [resultsView, setResultsView] = useState<"list" | "map">("list");
  const [mapFocus, setMapFocus] = useState<MapFocus>({
    region: null,
    requestId: 0,
  });
  const [tripMode, setTripMode] = useState<TripMode>("active");
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<SavedTrip | null>(null);
  const [ledger, setLedger] = useState<GemPointEvent[]>([]);
  const [unlocks, setUnlocks] = useState<RewardUnlock[]>([]);
  const [gemDropOpen, setGemDropOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [toast, setToast] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [activeTransitStop, setActiveTransitStop] =
    useState<NearbyTransitStop | null>(null);

  const t = copy[locale];
  const u = panUi[locale];
  const plannerText = plannerCopy[locale];
  const originExperience = useMemo(
    () =>
      allExperiences.find(
        (experience) => experience.id === originExperienceId,
      ) ?? defaultOrigin,
    [defaultOrigin, originExperienceId],
  );
  const origin = useMemo(
    () =>
      originExperience
        ? {
            label: originExperience.name,
            lat: originExperience.latitude,
            lng: originExperience.longitude,
          }
        : null,
    [originExperience],
  );
  const originStatus = origin ? "ready" : "not-found";
  const weather = useLiveWeather(origin);

  const initialRanked = useMemo(
    () => rankExperiences(allExperiences, preferences, { origin, weather }),
    [origin, preferences, weather],
  );
  const roadCandidates = useMemo(
    () =>
      stage === "brief"
        ? EMPTY_EXPERIENCES
        : initialRanked.slice(0, 3).map((item) => item.experience),
    [initialRanked, stage],
  );
  const routeTimes = useRoadTimes(origin, roadCandidates, preferences.transport);
  const ranked = useMemo(
    () =>
      rankExperiences(allExperiences, preferences, {
        origin,
        weather,
        routeTimes,
      }),
    [origin, preferences, routeTimes, weather],
  );

  const selected =
    allExperiences.find((experience) => experience.id === selectedId) ??
    ranked[0]?.experience ??
    allExperiences[0];
  const activeExperience = activeTrip
    ? (allExperiences.find(
        (experience) => experience.id === activeTrip.trip.experienceId,
      ) ?? null)
    : null;
  const selectedRoute = useSelectedRoute(
    origin,
    stage === "brief" ? null : (selected ?? null),
    preferences.transport,
  );
  const activeRoute = useSelectedRoute(
    origin,
    section === "trip" ? activeExperience : null,
    activeTrip?.preferences.transport ?? preferences.transport,
  );
  const balance = pointBalance(ledger);

  const moreResults = useMemo(() => {
    const selectedIds = new Set(ranked.map((item) => item.experience.id));
    return allExperiences
      .filter(
        (experience) =>
          !selectedIds.has(experience.id) &&
          overlap(experience.kind, preferences.kinds),
      )
      .slice(0, 6);
  }, [preferences.kinds, ranked]);

  const gemDropAlternative = (() => {
    if (!activeExperience || !activeTrip) return null;
    return (
      allExperiences
        .filter(
          (experience) =>
            experience.id !== activeExperience.id &&
            overlap(experience.kind, activeExperience.kind),
        )
        .sort((first, second) => {
          const crowd = { low: 0, moderate: 1, high: 2 };
          return (
            crowd[first.crowd] - crowd[second.crowd] ||
            first.durationMinutes - second.durationMinutes
          );
        })[0] ?? null
    );
  })();

  useEffect(() => {
    const trips = loadSavedTrips();
    const active = loadActiveTrip();
    const migrated = migrateLegacyTrip(defaultPreferences);
    setSavedTrips(trips.length ? trips : migrated ? [migrated] : []);
    setActiveTrip(active ?? migrated);
    setLedger(loadLedger());
    setUnlocks(loadRewardUnlocks());
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const path = window.location.pathname.replace(/\/$/, "");
      const params = new URLSearchParams(window.location.search);
      const legacySection = params.get("section");
      const experienceMatch = path.match(/^\/app\/experience\/([^/]+)$/);

      if (legacySection === "trip") {
        setSection("trip");
        setTripMode(params.get("view") === "saved" ? "saved" : "active");
        const keepGemDrop = params.get("gemdrop") === "1" ? "?gemdrop=1" : "";
        window.history.replaceState(
          null,
          "",
          params.get("view") === "saved"
            ? appPath.savedTrips
            : `${appPath.trip}${keepGemDrop}`,
        );
        return;
      }
      if (legacySection === "rewards") {
        setSection("rewards");
        window.history.replaceState(null, "", appPath.points);
        return;
      }
      if (path === "/app/my-trip" || path === "/app/my-trip/saved") {
        setSection("trip");
        setTripMode(path.endsWith("/saved") ? "saved" : "active");
        return;
      }
      if (path === "/app/gempoints") {
        setSection("rewards");
        return;
      }

      setSection("explore");
      if (path === "/app/results") {
        setStage("results");
        return;
      }
      if (experienceMatch) {
        const requestedId = decodeURIComponent(experienceMatch[1]);
        if (allExperiences.some((experience) => experience.id === requestedId)) {
          setSelectedId(requestedId);
          setStage("experience");
          return;
        }
      }
      setStage("brief");
      if (path === "/app" || path === "/app/") {
        window.history.replaceState(null, "", appPath.explore);
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gemdrop") === "1" && activeTrip) setGemDropOpen(true);
  }, [activeTrip]);

  useEffect(() => {
    if (
      section !== "trip" ||
      !activeExperience ||
      activeExperience.country !== "Germany"
    ) {
      queueMicrotask(() =>
        setActiveTransitStop((current) => (current ? null : current)),
      );
      return;
    }
    let active = true;
    import("../product/transit").then(({ nearestGtfsStop }) => {
      if (active) setActiveTransitStop(nearestGtfsStop(activeExperience));
    });
    return () => {
      active = false;
    };
  }, [activeExperience, section]);

  useEffect(() => saveTrips(savedTrips), [savedTrips]);
  useEffect(() => saveActiveTrip(activeTrip), [activeTrip]);
  useEffect(() => saveLedger(ledger), [ledger]);
  useEffect(() => saveRewardUnlocks(unlocks), [unlocks]);

  useEffect(() => {
    if (!toast) return;
    const tone =
      /denied|unavailable|not available|invalid|could not|error/i.test(toast)
        ? "error"
        : /verified|saved|added|switched|unlocked|duplicated|congratulations/i.test(
              toast,
            )
          ? "success"
          : "info";
    window.dispatchEvent(new CustomEvent("gemgo:ui-sound", { detail: tone }));
    const timer = window.setTimeout(() => {
      setToast("");
      setUndoSnapshot(null);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const closeOverlays = () => {
      setMobileMenuOpen(false);
      setLanguageOpen(false);
    };
    window.addEventListener("gemgo:close-overlays", closeOverlays);
    return () =>
      window.removeEventListener("gemgo:close-overlays", closeOverlays);
  }, []);

  const chooseSection = (next: AppSection) => {
    window.dispatchEvent(new Event("gemgo:close-overlays"));
    setSection(next);
    setMobileMenuOpen(false);
    const nextUrl =
      next === "trip"
        ? appPath.trip
        : next === "rewards"
          ? appPath.points
          : appPath.explore;
    if (next === "explore") setStage("brief");
    if (next === "trip") setTripMode("active");
    window.history.pushState(null, "", nextUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseExploreStage = (
    next: ExploreStage,
    experienceId?: string,
  ) => {
    setSection("explore");
    setStage(next);
    const nextUrl =
      next === "results"
        ? appPath.results
        : next === "experience" && experienceId
          ? `/app/experience/${encodeURIComponent(experienceId)}`
          : appPath.explore;
    window.history.pushState(null, "", nextUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseTripMode = (next: TripMode) => {
    setTripMode(next);
    window.history.pushState(
      null,
      "",
      next === "saved" ? appPath.savedTrips : appPath.trip,
    );
  };

  const updatePreference = <K extends keyof SearchPreferences>(
    key: K,
    value: SearchPreferences[K],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const search = () => {
    const interpreted = applyPromptToPreferences(promptDraft, {
      ...preferences,
      prompt: promptDraft,
    });
    setPreferences(interpreted);
    const nextRanked = rankExperiences(allExperiences, interpreted, {
      origin,
      weather,
      routeTimes,
    });
    if (nextRanked[0]) setSelectedId(nextRanked[0].experience.id);
    chooseExploreStage("results");
  };

  const changeOrigin = (experienceId: string) => {
    const experience = allExperiences.find((item) => item.id === experienceId);
    if (!experience) return;
    setOriginExperienceId(experienceId);
    setPreferences((current) => ({ ...current, origin: experience.name }));
  };

  const focusMapRegion = (region: PilotRegion) => {
    setMapFocus((current) => ({
      region,
      requestId: current.requestId + 1,
    }));
  };

  const saveIdea = (experience: Experience, activate = false) => {
    const trip = createSavedTrip(
      experience.id,
      `${experience.name} · ${new Date().toLocaleDateString(locale)}`,
      preferences,
      preferences.availableFrom || "14:30",
    );
    setSavedTrips((current) => [trip, ...current]);
    if (activate) {
      setActiveTrip(trip);
      setTripMode("active");
      chooseSection("trip");
    }
    setToast(activate ? "Added to My Trip" : "Saved in My Trip");
  };

  const updateActive = (next: SavedTrip) => {
    setActiveTrip(next);
    setSavedTrips((current) =>
      current.map((trip) => (trip.id === next.id ? next : trip)),
    );
  };

  const renameTrip = (trip: SavedTrip) => {
    const name = window.prompt("Trip name", trip.name)?.trim();
    if (!name) return;
    const next = { ...trip, name, updatedAt: new Date().toISOString() };
    setSavedTrips((current) =>
      current.map((item) => (item.id === trip.id ? next : item)),
    );
    if (activeTrip?.id === trip.id) setActiveTrip(next);
  };

  const duplicateTrip = (trip: SavedTrip) => {
    const now = new Date().toISOString();
    const copyTrip: SavedTrip = {
      ...trip,
      id: `trip-${Date.now()}`,
      name: `${trip.name} copy`,
      createdAt: now,
      updatedAt: now,
    };
    setSavedTrips((current) => [copyTrip, ...current]);
    setToast("Trip duplicated");
  };

  const deleteTrip = (trip: SavedTrip) => {
    setUndoSnapshot({
      savedTrips,
      activeTrip,
      label: tr(locale, "Restore trip", "Ripristina viaggio"),
    });
    setSavedTrips((current) => current.filter((item) => item.id !== trip.id));
    if (activeTrip?.id === trip.id) setActiveTrip(null);
    setToast("Trip deleted");
  };

  const saveOffline = async () => {
    if (!activeTrip) return;
    try {
      if ("caches" in window) {
        const cache = await caches.open("gemgo-trip-essentials-v1");
        await cache.addAll(["/app", "/manifest.webmanifest"]);
      }
      updateActive({
        ...activeTrip,
        offlineSaved: true,
        updatedAt: new Date().toISOString(),
      });
      setToast("Essential trip information saved offline");
    } catch {
      setToast("Offline saving is not available in this browser");
    }
  };

  const completeVerification = (status: "demo" | "verified") => {
    if (!activeTrip || !activeExperience || activeTrip.trip.verified) return;
    const verifiedTrip: SavedTrip = {
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      trip: { ...activeTrip.trip, verified: true },
    };
    updateActive(verifiedTrip);
    let nextLedger = appendPointEvent(ledger, {
      id: `visit-${activeTrip.id}`,
      amount: activeExperience.points,
      type: "visit",
      label: `Verified visit: ${activeExperience.name}`,
      createdAt: new Date().toISOString(),
      status,
      metadata: {
        transport: activeTrip.preferences.transport,
        crowd: activeExperience.crowd,
        experienceId: activeExperience.id,
        region: activeExperience.region,
      },
    });
    if (activeTrip.trip.acceptedGemDrop) {
      nextLedger = appendPointEvent(nextLedger, {
        id: `gemdrop-${activeTrip.id}`,
        amount: 20,
        type: "gemdrop",
        label: "Accepted a lower-pressure GemDrop",
        createdAt: new Date().toISOString(),
        status,
        metadata: {
          transport: activeTrip.preferences.transport,
          crowd: activeExperience.crowd,
          experienceId: activeExperience.id,
          region: activeExperience.region,
        },
      });
    }
    setLedger(nextLedger);
    const beforeBadges = badgeValuesFor(ledger, savedTrips);
    const afterBadges = badgeValuesFor(nextLedger, savedTrips);
    const goals = [1, 5, 3, 5, 3, 3];
    const unlockedIndex = goals.findIndex(
      (goal, index) => beforeBadges[index] < goal && afterBadges[index] >= goal,
    );
    if (unlockedIndex >= 0) {
      const badgeTitle = gemPointsCopy[locale].badgeNames[unlockedIndex];
      const history = JSON.parse(
        window.localStorage.getItem(BADGE_HISTORY_KEY) ?? "[]",
      ) as Array<{ id: string; title: string; createdAt: string }>;
      window.localStorage.setItem(
        BADGE_HISTORY_KEY,
        JSON.stringify([
          {
            id: `badge-${Date.now()}`,
            title: badgeTitle,
            createdAt: new Date().toISOString(),
          },
          ...history,
        ]),
      );
      window.dispatchEvent(new Event("gemgo:badge-earned"));
      setToast(`Congratulations! Badge earned: ${badgeTitle}`);
    } else {
      setToast("Visit verified");
    }
    setVerificationOpen(false);
    setVerificationMessage("Visit verified and GemPoints awarded");
  };

  const verifyGps = () => {
    if (!activeExperience || !navigator.geolocation) {
      setVerificationMessage("Geolocation is not available on this device.");
      return;
    }
    setVerificationMessage("Checking your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = haversineKm(
          {
            label: "Current location",
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          activeExperience,
        );
        if (distance <= 2) completeVerification("verified");
        else
          setVerificationMessage(
            `You are about ${distance.toFixed(1)} km from the verification area.`,
          );
      },
      () =>
        setVerificationMessage(
          "Location permission was denied or the position could not be determined.",
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const verifyQr = () => {
    if (/^(GEMGO|GEM)-/i.test(qrCode.trim())) completeVerification("verified");
    else
      setVerificationMessage(
        "The QR code is not valid for this demonstration.",
      );
  };

  const switchGemDrop = () => {
    if (!activeTrip || !gemDropAlternative) return;
    setUndoSnapshot({
      savedTrips,
      activeTrip,
      label: tr(locale, "Restore original plan", "Ripristina piano originale"),
    });
    updateActive({
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      trip: {
        ...activeTrip.trip,
        experienceId: gemDropAlternative.id,
        acceptedGemDrop: true,
      },
    });
    setGemDropOpen(false);
    setToast("Trip switched to the quieter alternative");
  };

  const undoLastAction = () => {
    if (!undoSnapshot) return;
    setSavedTrips(undoSnapshot.savedTrips);
    setActiveTrip(undoSnapshot.activeTrip);
    setToast(tr(locale, "Action restored", "Azione ripristinata"));
    setUndoSnapshot(null);
  };

  const unlockReward = (rewardId: string, cost: number, label: string) => {
    if (balance < cost) return;
    const unlock = createRewardUnlock(rewardId);
    const nextLedger = appendPointEvent(ledger, {
      id: `redemption-${unlock.id}`,
      amount: -cost,
      type: "redemption",
      label,
      createdAt: new Date().toISOString(),
      status: "demo",
    });
    setLedger(nextLedger);
    setUnlocks((current) => [unlock, ...current]);
    setToast(`Reward unlocked: ${unlock.code}`);
  };

  const navItems: Array<{
    id: AppSection;
    label: string;
    icon: typeof Compass;
  }> = [
    { id: "explore", label: t.explore, icon: Compass },
    { id: "trip", label: t.trip, icon: CalendarDays },
    { id: "rewards", label: t.rewards, icon: Gift },
    { id: "about", label: t.about, icon: Info },
  ];

  return (
    <main
      className={`product-app integrated-app ${resultsView === "map" ? "mobile-results-map-mode" : ""}`}
    >
      <header className="app-header">
        <Link
          className="brand brand-compact"
          href="/"
          aria-label="GemGo homepage"
        >
          <span className="brand-mark">
            <img src="/assets/gemgo-logo-green.svg?v=2" alt="" />
          </span>
          <span>
            <strong>GemGo</strong>
            <small>Better Alpine Choices</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label={t.explore}>
          {navItems.map((item) =>
            item.id === "about" ? (
              <Link
                key={item.id}
                href="/about"
                className="desktop-nav-link"
              >
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                key={item.id}
                className={section === item.id ? "is-active" : ""}
                onClick={() => chooseSection(item.id)}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
        <div className="header-actions">
          <div className="language-menu">
            <button
              type="button"
              className="icon-text-button"
              onClick={() => {
                window.dispatchEvent(new Event("gemgo:close-overlays"));
                setLanguageOpen((value) => !value);
              }}
            >
              <Languages size={18} /> {locale.toUpperCase()}
            </button>
            {languageOpen && (
              <div className="language-popover">
                <strong>{u.language}</strong>
                {locales.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setLocale(item);
                      setLanguageOpen(false);
                    }}
                  >
                    {item === locale ? <Check size={15} /> : <span />}
                    {localeNames[item]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="header-points-link"
            aria-label={`${balance.toLocaleString(locale)} GemPoints`}
            onClick={() => chooseSection("rewards")}
          >
            <Coins size={18} />
            <span>
              <strong>{balance.toLocaleString(locale)}</strong>
              <small>GemPoints</small>
            </span>
          </button>
          <Link
            href="/notifications"
            className="icon-button notification-page-link"
            aria-label={plannerText.notifications}
          >
            <Bell size={19} />
            <span className="header-notification-dot" aria-hidden="true" />
          </Link>
          <Link href="/profile" className="icon-text-button profile-page-link">
            <UserRound size={18} />
            <span>{t.account}</span>
          </Link>
          <button
            type="button"
            className="icon-button mobile-menu-button"
            aria-label={u.openMenu}
            onClick={() => {
              window.dispatchEvent(new Event("gemgo:close-overlays"));
              setLanguageOpen(false);
              setMobileMenuOpen((value) => !value);
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <nav className="mobile-menu">
            {navItems.map((item) =>
              item.id === "about" ? (
                <Link key={item.id} href="/about">
                  {item.label}
                  <ChevronRight size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => chooseSection(item.id)}
                >
                  {item.label}
                  <ChevronRight size={17} />
                </button>
              ),
            )}
            <Link href="/profile">
              {t.account}
              <ChevronRight size={17} />
            </Link>
          </nav>
        )}
      </header>

      {activeTransitStop && section === "trip" && (
        <aside className="gtfs-source-banner">
          <Bus size={18} />
          <span>
            <strong>{activeTransitStop.name}</strong>
            <small>
              {activeTransitStop.distanceKm.toFixed(1)} km from the experience ·
              static regional-rail stop from GTFS.de / DELFI, not a live
              departure
            </small>
          </span>
        </aside>
      )}

      {section === "explore" && (
        <section className="app-content explore-page">
          {stage === "brief" && (
            <>
              <div className="page-heading split-heading">
                <div>
                  <span className="eyebrow">
                    <Compass size={15} /> {u.alternatives}
                  </span>
                  <h1>{t.headline}</h1>
                  <p>{t.intro}</p>
                </div>
                <div className="privacy-note">
                  <ShieldCheck size={19} />
                  <span>
                    <strong>{u.noAccount}</strong> {u.localPlanning}
                  </span>
                </div>
              </div>
              <div className="explore-layout">
                <form
                  className="planner-panel"
                  onSubmit={(event) => {
                    event.preventDefault();
                    search();
                  }}
                >
                  <label className="prompt-field">
                    <span>{t.prompt}</span>
                    <textarea
                      rows={4}
                      value={promptDraft}
                      onChange={(event) => setPromptDraft(event.target.value)}
                    />
                    <small>{u.parser}</small>
                  </label>
                  <div className="form-section">
                    <div className="form-section-title">
                      <LocateFixed size={18} />
                      <div>
                        <strong>{t.origin}</strong>
                        <small>
                          {originStatus === "ready"
                            ? origin?.label
                            : u.notFound}
                        </small>
                      </div>
                    </div>
                    <p className="alpine-origin-note">
                      {plannerText.alpineStart}
                    </p>
                    <div className="field-grid field-grid-location">
                      <label>
                        <span>{t.origin}</span>
                        <select
                          value={originExperienceId}
                          onChange={(event) => changeOrigin(event.target.value)}
                        >
                          {Object.keys(catalogueSummary).map((region) => (
                            <optgroup key={region} label={region}>
                              {allExperiences
                                .filter(
                                  (experience) => experience.region === region,
                                )
                                .map((experience) => (
                                  <option
                                    key={experience.id}
                                    value={experience.id}
                                  >
                                    {experience.name}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t.travel}</span>
                        <div className="range-value">
                          {formatDuration(preferences.maxTravelMinutes)}{" "}
                          <small>{plannerText.hoursHint}</small>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="720"
                          step="15"
                          value={preferences.maxTravelMinutes}
                          onChange={(event) =>
                            updatePreference(
                              "maxTravelMinutes",
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div className="form-section">
                    <div className="form-section-title">
                      <Navigation size={18} />
                      <div>
                        <strong>{t.mobility}</strong>
                        <small>{u.travelImpact}</small>
                      </div>
                    </div>
                    <div className="choice-grid transport-grid">
                      {transportOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            type="button"
                            key={option.id}
                            className={
                              preferences.transport === option.id
                                ? "is-selected"
                                : ""
                            }
                            onClick={() =>
                              updatePreference("transport", option.id)
                            }
                          >
                            <Icon size={18} />
                            {transportLabel(locale, option.id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-section">
                    <div className="form-section-title">
                      <Clock3 size={18} />
                      <div>
                        <strong>{t.time}</strong>
                        <small>{u.impractical}</small>
                      </div>
                    </div>
                    <div className="choice-grid duration-grid">
                      {durationOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={
                            preferences.availableTime === option.id
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            updatePreference("availableTime", option.id)
                          }
                        >
                          {u[option.id]}
                        </button>
                      ))}
                    </div>
                    <div className="field-grid time-grid">
                      <label>
                        <span>{u.from}</span>
                        <input
                          type="time"
                          value={preferences.availableFrom}
                          onChange={(event) =>
                            updatePreference(
                              "availableFrom",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>{u.to}</span>
                        <input
                          type="time"
                          value={preferences.availableTo}
                          onChange={(event) =>
                            updatePreference("availableTo", event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div className="form-section">
                    <div className="form-section-title">
                      <Sparkles size={18} />
                      <div>
                        <strong>{t.experience}</strong>
                        <small>{u.chooseMatters}</small>
                      </div>
                    </div>
                    <div className="chip-grid">
                      {kindOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={
                            preferences.kinds.includes(option.id)
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            updatePreference(
                              "kinds",
                              preferences.kinds.includes(option.id)
                                ? preferences.kinds.filter(
                                    (item) => item !== option.id,
                                  )
                                : [...preferences.kinds, option.id],
                            )
                          }
                        >
                          {kindLabel(locale, option.id)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-section">
                    <div className="form-section-title">
                      <Target size={18} />
                      <div>
                        <strong>{t.needs}</strong>
                        <small>{u.unsuitable}</small>
                      </div>
                    </div>
                    <div className="choice-grid difficulty-grid">
                      {(["easy", "moderate", "challenging"] as const).map(
                        (difficulty) => (
                          <button
                            type="button"
                            key={difficulty}
                            className={
                              preferences.difficulty === difficulty
                                ? "is-selected"
                                : ""
                            }
                            onClick={() =>
                              updatePreference("difficulty", difficulty)
                            }
                          >
                            {difficultyLabel(locale, difficulty)}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="chip-grid needs-grid">
                      {needOptions.map((need, index) => (
                        <button
                          type="button"
                          key={need}
                          className={
                            preferences.needs.includes(need)
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            updatePreference(
                              "needs",
                              preferences.needs.includes(need)
                                ? preferences.needs.filter(
                                    (item) => item !== need,
                                  )
                                : [...preferences.needs, need],
                            )
                          }
                        >
                          {u.needs[index]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="condition-card">
                    <CloudRain size={21} />
                    <div>
                      <strong>
                        {weather.source === "live"
                          ? `${weather.temperature?.toFixed(0)}°C · ${weather.precipitationProbability ?? 0}% rain probability`
                          : "Live weather unavailable"}
                      </strong>
                      <span>
                        {weather.source === "live"
                          ? "Open-Meteo conditions influence the ranking."
                          : "GemGo uses conservative fallback assumptions."}
                      </span>
                    </div>
                    <span className="data-source-chip">{weather.source}</span>
                  </div>
                  <button
                    type="submit"
                    className="button button-primary button-large"
                  >
                    {t.search}
                    <ArrowRight size={18} />
                  </button>
                </form>
                <aside className="explore-aside">
                  <div className="catalogue-card">
                    <span className="eyebrow">
                      <Globe2 size={14} /> {u.catalogue}
                    </span>
                    <strong>{totalCatalogueEntries}</strong>
                    <span>{u.catalogueBody}</span>
                    <div>
                      {Object.entries(catalogueSummary).map(
                        ([region, count]) => (
                          <small key={region}>
                            {region}: {count}
                          </small>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="app-map-panel">
                    <ExperienceMap
                      locale={locale}
                      experiences={allExperiences}
                      origin={origin}
                      selectedId={selectedId}
                      routeCoordinates={selectedRoute}
                      routeMode={preferences.transport}
                      focusRegion={mapFocus.region}
                      focusRequestId={mapFocus.requestId}
                      onSelect={(experience) => setSelectedId(experience.id)}
                    />
                    <MapRegionControls
                      locale={locale}
                      activeRegion={mapFocus.region}
                      onSelect={focusMapRegion}
                    />
                  </div>
                  <div className="method-card">
                    <h3>{u.quality}</h3>
                    <p>{u.qualityBody}</p>
                  </div>
                </aside>
              </div>
            </>
          )}

          {stage === "results" && (
            <>
              <div
                className="mobile-results-switch"
                aria-label={tr(locale, "Results view", "Vista risultati")}
              >
                <button
                  type="button"
                  className={resultsView === "list" ? "is-active" : ""}
                  aria-pressed={resultsView === "list"}
                  onClick={() => setResultsView("list")}
                >
                  <List size={17} />
                  {tr(locale, "List", "Elenco")}
                </button>
                <button
                  type="button"
                  className={resultsView === "map" ? "is-active" : ""}
                  aria-pressed={resultsView === "map"}
                  onClick={() => setResultsView("map")}
                >
                  <MapIcon size={17} />
                  {tr(locale, "Map", "Mappa")}
                </button>
              </div>
              <div className="results-header">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => chooseExploreStage("brief")}
                >
                  <ArrowLeft size={17} /> {t.adjust}
                </button>
                <div>
                  <span className="eyebrow">
                    <Sparkles size={15} />{" "}
                    {tr(locale, "Ranked from", "Classificate tra")}{" "}
                    {totalCatalogueEntries}{" "}
                    {tr(locale, "entries", "destinazioni")}
                  </span>
                  <h1>{t.results}</h1>
                  <p>
                    {tr(locale, "Starting from", "Partenza da")}{" "}
                    <strong>{origin?.label ?? preferences.origin}</strong>,{" "}
                    {tr(locale, "within", "entro")}{" "}
                    <strong>
                      {formatDuration(preferences.maxTravelMinutes)}
                    </strong>
                    .
                  </p>
                </div>
                <div className="results-summary">
                  <strong>3</strong>
                  <span>
                    {tr(
                      locale,
                      "distinct recommendation roles",
                      "alternative con ruoli distinti",
                    )}
                  </span>
                  <small>
                    {tr(
                      locale,
                      "Live route times where available",
                      "Tempi di percorso live quando disponibili",
                    )}
                  </small>
                </div>
              </div>
              <div className="result-layout">
                <div className="results-map-panel">
                  <div className="app-map-panel">
                    <ExperienceMap
                      locale={locale}
                      experiences={allExperiences}
                      origin={origin}
                      selectedId={selectedId}
                      routeCoordinates={selectedRoute}
                      routeMode={preferences.transport}
                      focusRegion={mapFocus.region}
                      focusRequestId={mapFocus.requestId}
                      onSelect={(experience) => setSelectedId(experience.id)}
                    />
                    <MapRegionControls
                      locale={locale}
                      activeRegion={mapFocus.region}
                      onSelect={focusMapRegion}
                    />
                  </div>
                  <div className="comparison-proof">
                    <div>
                      <span>
                        {tr(locale, "Original plan", "Piano originale")}
                      </span>
                      <strong>
                        {tr(
                          locale,
                          "Popular destination",
                          "Destinazione popolare",
                        )}
                      </strong>
                      <small>
                        {tr(
                          locale,
                          "Higher expected pressure",
                          "Pressione prevista più alta",
                        )}
                      </small>
                    </div>
                    <ArrowRight size={22} />
                    <div>
                      <span>
                        {tr(locale, "GemGo alternative", "Alternativa GemGo")}
                      </span>
                      <strong>{ranked[0]?.experience.name}</strong>
                      <small>
                        {tr(
                          locale,
                          "Compatible and more transparent",
                          "Compatibile e più trasparente",
                        )}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="result-cards">
                  {ranked.map((item) => (
                    <IntegratedResultCard
                      locale={locale}
                      key={item.experience.id}
                      item={item}
                      saved={savedTrips.some(
                        (trip) => trip.trip.experienceId === item.experience.id,
                      )}
                      onOpen={() => {
                        setSelectedId(item.experience.id);
                        chooseExploreStage("experience", item.experience.id);
                      }}
                      onSave={() => saveIdea(item.experience)}
                    />
                  ))}
                  {showMore &&
                    moreResults.map((experience) => (
                      <CompactResult
                        key={experience.id}
                        experience={experience}
                        onOpen={() => {
                          setSelectedId(experience.id);
                          chooseExploreStage("experience", experience.id);
                        }}
                      />
                    ))}
                  <button
                    type="button"
                    className="show-more-button"
                    onClick={() => setShowMore((value) => !value)}
                  >
                    {showMore
                      ? tr(
                          locale,
                          "Show only the top three",
                          "Mostra solo le prime tre",
                        )
                      : tr(
                          locale,
                          "Show more compatible results",
                          "Mostra altre alternative compatibili",
                        )}
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === "experience" && selected && (
            <ExperienceDetail
              locale={locale}
              experience={selected}
              ranked={ranked.find((item) => item.experience.id === selected.id)}
              origin={origin}
              route={selectedRoute}
              transport={preferences.transport}
              onBack={() => chooseExploreStage("results")}
              onSave={() => saveIdea(selected)}
              onAdd={() => saveIdea(selected, true)}
            />
          )}
        </section>
      )}

      {section === "trip" && (
        <section className="app-content trip-page integrated-trip-page">
          <div className="page-heading trip-heading">
            <div>
              <span className="eyebrow">
                <CalendarDays size={15} /> {t.trip}
              </span>
              <h1>{activeExperience ? activeTrip?.name : t.noTrip}</h1>
              <p>
                {tr(
                  locale,
                  "Saved ideas and active operational plans now live in one place.",
                  "Idee salvate e piani attivi sono raccolti in un unico posto.",
                )}
              </p>
            </div>
            <div className="segmented-control">
              <button
                type="button"
                className={tripMode === "active" ? "is-active" : ""}
                onClick={() => chooseTripMode("active")}
              >
                {t.active}
              </button>
              <button
                type="button"
                className={tripMode === "saved" ? "is-active" : ""}
                onClick={() => chooseTripMode("saved")}
              >
                {t.saved} ({savedTrips.length})
              </button>
            </div>
          </div>
          {tripMode === "active" &&
            (!activeTrip || !activeExperience ? (
              <div className="empty-state">
                <CalendarDays size={36} />
                <h2>{t.noTrip}</h2>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => chooseSection("explore")}
                >
                  {t.find}
                  <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="trip-layout">
                <div className="trip-main-card">
                  <DestinationPhoto
                    name={activeExperience.name}
                    region={activeExperience.region}
                    className="trip-real-photo"
                  />
                  <div className="trip-title-block">
                    <span
                      className={`crowd-chip crowd-${activeExperience.crowd}`}
                    >
                      {activeExperience.crowd}{" "}
                      {tr(locale, "crowd", "affollamento")}
                    </span>
                    <h2>{activeExperience.promise}</h2>
                    <p>
                      {activeExperience.name} ·{" "}
                      {tr(locale, "departure", "partenza")}{" "}
                      {activeTrip.trip.plannedDeparture}
                    </p>
                  </div>
                <ExperienceMap
                  experiences={[activeExperience]}
                  origin={origin}
                  selectedId={activeExperience.id}
                  routeCoordinates={activeRoute}
                  routeMode={activeTrip.preferences.transport}
                />
                  <div className="trip-timeline">
                    {activeExperience.itinerary.map((item, index) => (
                      <div
                        className="timeline-item"
                        key={`${item.time}-${item.label}`}
                      >
                        <div className="timeline-marker">{index + 1}</div>
                        <time>{item.time}</time>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="trip-action-row">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setVerificationOpen(true)}
                      disabled={activeTrip.trip.verified}
                    >
                      {activeTrip.trip.verified
                        ? tr(locale, "Visit verified", "Visita verificata")
                        : t.verify}
                      <BadgeCheck size={17} />
                    </button>
                    <a
                      className="button button-secondary"
                      href={`https://www.openstreetmap.org/directions?to=${activeExperience.latitude},${activeExperience.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation size={17} />{" "}
                      {tr(locale, "Open navigation", "Apri navigazione")}
                    </a>
                  </div>
                </div>
                <aside className="trip-side">
                  <div className="operational-card">
                    <h3>
                      {tr(
                        locale,
                        "Operational information",
                        "Informazioni operative",
                      )}
                    </h3>
                    {activeExperience.mobility.map((item) => (
                      <p key={item}>
                        <CheckCircle2 size={16} />
                        {item}
                      </p>
                    ))}
                    <p>
                      <Users size={16} />{" "}
                      {tr(
                        locale,
                        "Best lower-pressure window:",
                        "Fascia consigliata a minore affollamento:",
                      )}{" "}
                      {activeExperience.crowdWindow}
                    </p>
                  </div>
                  <div className="offline-card">
                    <Download size={22} />
                    <div>
                      <h3>
                        {tr(
                          locale,
                          "Offline essentials",
                          "Dati essenziali offline",
                        )}
                      </h3>
                      <p>
                        {tr(
                          locale,
                          "Cache the application shell and preserve this trip on the device.",
                          "Salva l’app e questo viaggio sul dispositivo.",
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={saveOffline}
                    >
                      {activeTrip.offlineSaved
                        ? tr(locale, "Saved offline", "Salvato offline")
                        : t.offline}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="condition-change-card"
                    onClick={() => setGemDropOpen(true)}
                  >
                    <Sparkles size={22} />
                    <span>
                      <strong>
                        {tr(
                          locale,
                          "Conditions changed",
                          "Condizioni cambiate",
                        )}
                      </strong>
                      <small>
                        {tr(
                          locale,
                          "Compare a contextual quieter alternative.",
                          "Confronta un’alternativa contestuale più tranquilla.",
                        )}
                      </small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                </aside>
              </div>
            ))}
          {tripMode === "saved" && (
            <div className="saved-trip-grid">
              {savedTrips.length === 0 ? (
                <div className="empty-state">
                  <Save size={34} />
                  <h2>
                    {tr(locale, "No saved trips", "Nessun viaggio salvato")}
                  </h2>
                </div>
              ) : (
                savedTrips.map((trip) => {
                  const experience = allExperiences.find(
                    (item) => item.id === trip.trip.experienceId,
                  );
                  return (
                    <article className="saved-trip-card" key={trip.id}>
                      <div>
                        <span>{experience?.region ?? "Alps"}</span>
                        <h3>{trip.name}</h3>
                        <p>{experience?.promise}</p>
                        <small>
                          {tr(locale, "Updated", "Aggiornato")}{" "}
                          {new Date(trip.updatedAt).toLocaleDateString(locale)}
                        </small>
                      </div>
                      <div className="saved-trip-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTrip(trip);
                            chooseTripMode("active");
                          }}
                        >
                          <ArrowRight size={16} /> {tr(locale, "Open", "Apri")}
                        </button>
                        <button type="button" onClick={() => renameTrip(trip)}>
                          <Pencil size={16} />{" "}
                          {tr(locale, "Rename", "Rinomina")}
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateTrip(trip)}
                        >
                          <Copy size={16} />{" "}
                          {tr(locale, "Duplicate", "Duplica")}
                        </button>
                        <button type="button" onClick={() => deleteTrip(trip)}>
                          <Trash2 size={16} /> {tr(locale, "Delete", "Elimina")}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
          <MultiDayTripPlanner trips={savedTrips} locale={locale} />
          <VisitFeedback
            key={activeTrip?.id ?? "no-trip"}
            trip={activeTrip}
            locale={locale}
          />
        </section>
      )}

      {section === "rewards" && (
        <RewardsPage
          locale={locale}
          balance={balance}
          ledger={ledger}
          unlocks={unlocks}
          activeTrip={activeTrip}
          savedTrips={savedTrips}
          onUnlock={unlockReward}
        />
      )}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return item.id === "about" ? (
            <Link key={item.id} href="/about">
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? "is-active" : ""}
              onClick={() => chooseSection(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {gemDropOpen && activeExperience && gemDropAlternative && (
        <GemDropModal
          locale={locale}
          original={activeExperience}
          alternative={gemDropAlternative}
          onClose={() => setGemDropOpen(false)}
          onSwitch={switchGemDrop}
        />
      )}
      {verificationOpen && activeExperience && (
        <VerificationModal
          locale={locale}
          experience={activeExperience}
          message={verificationMessage}
          qrCode={qrCode}
          onQrCode={setQrCode}
          onGps={verifyGps}
          onQr={verifyQr}
          onDemo={() => completeVerification("demo")}
          onClose={() => setVerificationOpen(false)}
        />
      )}
      {toast && (
        <div className="action-toast">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          {undoSnapshot && (
            <button
              type="button"
              className="toast-undo-button"
              onClick={undoLastAction}
            >
              {undoSnapshot.label}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function MapRegionControls({
  locale,
  activeRegion,
  onSelect,
}: {
  locale: Locale;
  activeRegion: PilotRegion | null;
  onSelect: (region: PilotRegion) => void;
}) {
  return (
    <div
      className="app-region-controls"
      aria-label={tr(locale, "Map areas", "Aree della mappa")}
    >
      {pilotRegions.map((region) => (
        <button
          type="button"
          key={region}
          className={activeRegion === region ? "is-active" : ""}
          aria-pressed={activeRegion === region}
          onClick={() => onSelect(region)}
        >
          <MapPin size={15} />
          <span>{region}</span>
          <strong>{catalogueSummary[region] ?? 0}</strong>
        </button>
      ))}
    </div>
  );
}

function CompactResult({
  experience,
  onOpen,
}: {
  experience: Experience;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="compact-result" onClick={onOpen}>
      <MapPin size={18} />
      <span>
        <strong>{experience.name}</strong>
        <small>
          {experience.region} · {experience.kind.slice(0, 2).join(" · ")}
        </small>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}

function ExperienceDetail({
  locale,
  experience,
  ranked,
  origin,
  route,
  transport,
  onBack,
  onSave,
  onAdd,
}: {
  locale: Locale;
  experience: Experience;
  ranked?: RankedExperience;
  origin: { label: string; lat: number; lng: number } | null;
  route: Array<[number, number]>;
  transport: TransportMode;
  onBack: () => void;
  onSave: () => void;
  onAdd: () => void;
}) {
  const travel = ranked?.travelMinutes ?? experience.travel[transport];
  return (
    <div className="experience-detail">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={17} />
        {tr(locale, "Back to alternatives", "Torna alle alternative")}
      </button>
      <div className="integrated-detail-hero">
        <DestinationPhoto name={experience.name} region={experience.region} />
        <div className="detail-hero-copy">
          <div>
            <span>{experience.validation}</span>
            <span className={`crowd-chip crowd-${experience.crowd}`}>
              {experience.crowd} {tr(locale, "crowd", "affollamento")}
            </span>
          </div>
          <p>
            {experience.region} · {experience.country}
          </p>
          <h1>{experience.promise}</h1>
          <strong>{experience.name}</strong>
        </div>
      </div>
      <div className="detail-metric-strip">
        <span>
          <Navigation size={18} />
          <strong>
            {travel
              ? formatDuration(travel)
              : tr(locale, "Unavailable", "Non disponibile")}
          </strong>
          <small>{tr(locale, "travel time", "tempo di viaggio")}</small>
        </span>
        <span>
          <Clock3 size={18} />
          <strong>{formatDuration(experience.durationMinutes)}</strong>
          <small>{tr(locale, "duration", "durata")}</small>
        </span>
        <span>
          <Users size={18} />
          <strong>{experience.crowdWindow}</strong>
          <small>{tr(locale, "best window", "fascia migliore")}</small>
        </span>
        <span>
          <Coins size={18} />
          <strong>+{experience.points}</strong>
          <small>GemPoints</small>
        </span>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="content-card fit-card">
            <span className="eyebrow">
              <Sparkles size={14} />
              {tr(locale, "Why this fits you", "Perché è adatta a te")}
            </span>
            <h2>
              {tr(
                locale,
                "A recommendation derived from your real constraints",
                "Una raccomandazione basata sui tuoi vincoli reali",
              )}
            </h2>
            <p>{ranked?.reasons.join(". ") ?? experience.summary}</p>
          </section>
          <section className="content-card">
            <h2>{tr(locale, "Route and mobility", "Percorso e mobilità")}</h2>
          <ExperienceMap
            experiences={[experience]}
            origin={origin}
            selectedId={experience.id}
            routeCoordinates={route}
            routeMode={transport}
          />
            {experience.mobility.map((item) => (
              <p key={item}>
                <CheckCircle2 size={16} />
                {item}
              </p>
            ))}
          </section>
          <section className="content-card">
            <h2>{tr(locale, "What you will do", "Cosa farai")}</h2>
            <div className="mini-itinerary">
              {experience.itinerary.map((item) => (
                <div key={`${item.time}-${item.label}`}>
                  <time>{item.time}</time>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="content-card comparison-card">
            <h2>{tr(locale, "Honest comparison", "Confronto trasparente")}</h2>
            <div className="comparison-columns">
              <div>
                <small>{tr(locale, "Original plan", "Piano originale")}</small>
                <strong>{experience.comparison.original}</strong>
                <span>{experience.comparison.reachDifference}</span>
              </div>
              <ArrowRight size={22} />
              <div>
                <small>
                  {tr(locale, "GemGo alternative", "Alternativa GemGo")}
                </small>
                <strong>{experience.name}</strong>
                {experience.comparison.advantages.map((item) => (
                  <span key={item}>
                    <Check size={14} />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="tradeoff-box">
              <AlertTriangle size={18} />
              <div>
                <strong>{tr(locale, "Trade-offs", "Compromessi")}</strong>
                {experience.tradeoffs.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </section>
        </div>
        <aside className="detail-side">
          <section className="content-card local-benefit-card">
            <HeartHandshake size={24} />
            <h3>{tr(locale, "Local benefit", "Beneficio locale")}</h3>
            <p>{experience.localBenefit}</p>
            {experience.partner && <span>{experience.partner}</span>}
          </section>
          <section className="content-card safety-card">
            <h3>{tr(locale, "Safety and limits", "Sicurezza e limiti")}</h3>
            {experience.safety.map((item) => (
              <p key={item}>
                <ShieldCheck size={16} />
                {item}
              </p>
            ))}
          </section>
          <div className="detail-cta-card">
            <button
              type="button"
              className="button button-primary button-full"
              onClick={onAdd}
            >
              {tr(locale, "Add to My Trip", "Aggiungi al mio viaggio")}
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={onSave}
            >
              {tr(locale, "Save for later", "Salva per dopo")}
            </button>
            <button
              type="button"
              className="button button-ghost button-full"
              onClick={onBack}
            >
              {tr(
                locale,
                "Show another alternative",
                "Mostra un’altra alternativa",
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const useModalA11y = (onClose: () => void) => {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const modal = document.querySelector<HTMLElement>(".modal-backdrop");
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      [
        ...(modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])",
        ) ?? []),
      ].filter((element) => element.offsetParent !== null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === modal) closeRef.current();
    };
    document.documentElement.classList.add("has-open-modal");
    document.addEventListener("keydown", onKeyDown);
    modal?.addEventListener("click", onBackdrop);
    requestAnimationFrame(() => focusable()[0]?.focus({ preventScroll: true }));
    return () => {
      document.documentElement.classList.remove("has-open-modal");
      document.removeEventListener("keydown", onKeyDown);
      modal?.removeEventListener("click", onBackdrop);
      previous?.focus({ preventScroll: true });
    };
  }, []);
};

function GemDropModal({
  locale,
  original,
  alternative,
  onClose,
  onSwitch,
}: {
  locale: Locale;
  original: Experience;
  alternative: Experience;
  onClose: () => void;
  onSwitch: () => void;
}) {
  useModalA11y(onClose);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="gemdrop-panel">
        <button type="button" className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <span className="eyebrow">
          <Sparkles size={15} />
          {tr(locale, "Contextual GemDrop", "GemDrop contestuale")}
        </span>
        <h2>
          {tr(
            locale,
            "This area is becoming crowded",
            "Questa area si sta affollando",
          )}
        </h2>
        <p>
          {tr(
            locale,
            "A comparable alternative is available. You remain in control.",
            "È disponibile un’alternativa comparabile. La scelta resta tua.",
          )}
        </p>
        <div className="gemdrop-comparison">
          <div className="gemdrop-option original-option">
            <DestinationPhoto
              name={original.name}
              region={original.region}
              compact
              className="gemdrop-destination-gallery is-original"
            />
            <small>{tr(locale, "Original plan", "Piano originale")}</small>
            <h3>{original.name}</h3>
            <p>
              <Users size={16} />
              {tr(locale, "Crowd rising", "Affollamento in aumento")}
            </p>
            <p>
              <Coins size={16} />
              {tr(locale, "Standard reward", "Ricompensa standard")}
            </p>
          </div>
          <ArrowRight size={24} />
          <div className="gemdrop-option alternative-option">
            <DestinationPhoto
              name={alternative.name}
              region={alternative.region}
              compact
              className="gemdrop-destination-gallery is-alternative"
            />
            <small>{tr(locale, "Alternative", "Alternativa")}</small>
            <h3>{alternative.name}</h3>
            <p>
              <Users size={16} />
              {alternative.crowd} crowd
            </p>
            <p>
              <Coins size={16} />
              +20 GemPoints bonus
            </p>
          </div>
        </div>
        <div className="gemdrop-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={onSwitch}
          >
            {tr(locale, "Switch my trip", "Cambia il mio viaggio")}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            {tr(locale, "Keep original plan", "Mantieni il piano originale")}
          </button>
        </div>
      </div>
    </div>
  );
}

function VerificationModal({
  locale,
  experience,
  message,
  qrCode,
  onQrCode,
  onGps,
  onQr,
  onDemo,
  onClose,
}: {
  locale: Locale;
  experience: Experience;
  message: string;
  qrCode: string;
  onQrCode: (value: string) => void;
  onGps: () => void;
  onQr: () => void;
  onDemo: () => void;
  onClose: () => void;
}) {
  useModalA11y(onClose);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="verification-card verification-modal">
        <button type="button" className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <BadgeCheck size={36} />
        <h2>{tr(locale, "Verify your visit", "Verifica la visita")}</h2>
        <p>
          {tr(
            locale,
            "Verification awards points and measures whether recommendations redistribute flows without retaining a detailed movement history.",
            "La verifica assegna punti e misura la redistribuzione dei flussi senza conservare uno storico dettagliato degli spostamenti.",
          )}
        </p>
        <button type="button" className="verification-method" onClick={onGps}>
          <LocateFixed size={24} />
          <span>
            <strong>
              {tr(
                locale,
                "Verify current location",
                "Verifica la posizione attuale",
              )}
            </strong>
            <small>
              {tr(
                locale,
                "Checks whether you are within 2 km of",
                "Controlla se ti trovi entro 2 km da",
              )}{" "}
              {experience.name}.
            </small>
          </span>
        </button>
        <div className="qr-verification">
          <label>
            <span>
              {tr(locale, "Partner QR code", "Codice QR del partner")}
            </span>
            <input
              value={qrCode}
              onChange={(event) => onQrCode(event.target.value)}
              placeholder="GEMGO-…"
            />
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={onQr}
          >
            <QrCode size={17} />
            {tr(locale, "Verify code", "Verifica codice")}
          </button>
        </div>
        <button type="button" className="button button-ghost" onClick={onDemo}>
          {tr(
            locale,
            "Use clearly labelled demo verification",
            "Usa la verifica demo chiaramente indicata",
          )}
        </button>
        {message && <p className="verification-message">{message}</p>}
      </div>
    </div>
  );
}

function RewardsPage({
  locale,
  balance,
  ledger,
  unlocks,
  activeTrip,
  savedTrips,
  onUnlock,
}: {
  locale: Locale;
  balance: number;
  ledger: GemPointEvent[];
  unlocks: RewardUnlock[];
  activeTrip: SavedTrip | null;
  savedTrips: SavedTrip[];
  onUnlock: (id: string, cost: number, label: string) => void;
}) {
  const text = gemPointsCopy[locale];
  const visits = ledger.filter((event) => event.type === "visit").length;
  const bikeVisits = ledger.filter(
    (event) => event.metadata?.transport === "bicycle",
  ).length;
  const greenVisits = ledger.filter((event) =>
    ["walking", "bicycle", "public"].includes(event.metadata?.transport ?? ""),
  ).length;
  const lowPressureVisits = ledger.filter(
    (event) => event.metadata?.crowd === "low",
  ).length;
  const badgeValues = [
    visits,
    visits,
    bikeVisits,
    greenVisits,
    lowPressureVisits,
    savedTrips.length,
  ];
  const badgeGoals = [1, 5, 3, 5, 3, 3];
  const badgeIcons = [BadgeCheck, Mountain, Bike, Footprints, Compass, Route];

  return (
    <section className="app-content rewards-page">
      <div className="page-heading rewards-heading">
        <div>
          <span className="eyebrow">
            <Gift size={15} />
            {text.eyebrow}
          </span>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </div>
        <div className="points-balance">
          <Coins size={27} />
          <strong>{balance}</strong>
          <span>GemPoints</span>
        </div>
      </div>
      <div className="reward-progress-card">
        <div>
          <strong>{Math.min(balance, 100)} / 100</strong>
          <span>{text.progress}</span>
        </div>
        <div className="progress-track large">
          <span style={{ width: `${Math.min(balance, 100)}%` }} />
        </div>
      </div>
      <div className="rewards-layout">
        <div className="reward-offers-section">
          <h2>{text.available}</h2>
          <div className="reward-list">
            <RewardCard
              id="tasting"
              title={text.offers[0]}
              cost={100}
              balance={balance}
              onUnlock={onUnlock}
              text={text}
            />
            <RewardCard
              id="drink"
              title={text.offers[1]}
              cost={120}
              balance={balance}
              onUnlock={onUnlock}
              text={text}
            />
          </div>
          {unlocks.length > 0 && (
            <div className="unlocked-list">
              <h3>{text.codes}</h3>
              {unlocks.map((unlock) => (
                <p key={unlock.id}>
                  <QrCode size={16} />
                  <strong>{unlock.code}</strong>
                  <span>
                    {text.expires}{" "}
                    {new Date(unlock.expiresAt).toLocaleTimeString(locale)}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
        <aside className="earning-card">
          <h2>{text.history}</h2>
          {ledger.length === 0 ? (
            <p>{text.empty}</p>
          ) : (
            [...ledger].reverse().map((event) => (
              <p key={event.id}>
                <span>{event.label}</span>
                <strong>
                  {event.amount > 0 ? "+" : ""}
                  {event.amount}
                </strong>
              </p>
            ))
          )}
        </aside>
      </div>
      <section className="badge-showcase">
        <div className="badge-showcase-heading">
          <span className="eyebrow">
            <BadgeCheck size={15} />
            {text.badges}
          </span>
          <h2>{text.badges}</h2>
          <p>{text.badgesIntro}</p>
        </div>
        <div className="badge-showcase-grid">
          {text.badgeNames.map((name, index) => {
            const Icon = badgeIcons[index];
            const value = badgeValues[index];
            const goal = badgeGoals[index];
            const state =
              value >= goal ? "earned" : value > 0 ? "progress" : "locked";
            return (
              <article key={name} className={`achievement-badge is-${state}`}>
                <div className="achievement-medallion">
                  <Icon size={25} />
                </div>
                <div>
                  <span>
                    {state === "earned"
                      ? text.earned
                      : state === "progress"
                        ? text.inProgress
                        : text.notStarted}
                  </span>
                  <h3>{name}</h3>
                  <p>{text.badgeDetails[index]}</p>
                  <div className="badge-progress">
                    <i
                      style={{
                        width: `${Math.min(100, (value / goal) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {Math.min(value, goal)} / {goal}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="personal-impact-section">
        <h2>{text.impact}</h2>
        <div className="impact-grid">
          <div>
            <strong>{activeTrip?.trip.verified ? 1 : 0}</strong>
            <span>{text.verified}</span>
          </div>
          <div>
            <strong>
              {ledger.filter((event) => event.type === "gemdrop").length}
            </strong>
            <span>{text.drops}</span>
          </div>
          <div>
            <strong>
              {ledger.filter((event) => event.type === "partner").length}
            </strong>
            <span>{text.partners}</span>
          </div>
          <div>
            <strong>{balance}</strong>
            <span>{text.current}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RewardCard({
  id,
  title,
  cost,
  balance,
  onUnlock,
  text,
}: {
  id: string;
  title: string;
  cost: number;
  balance: number;
  onUnlock: (id: string, cost: number, label: string) => void;
  text: (typeof gemPointsCopy)[Locale];
}) {
  return (
    <article className="reward-card">
      <div className="reward-icon">
        <WalletCards size={24} />
      </div>
      <div>
        <span>{text.partner}</span>
        <h3>{title}</h3>
        <p>
          {cost} GemPoints · {text.local}
        </p>
      </div>
      <button
        type="button"
        disabled={balance < cost}
        onClick={() => onUnlock(id, cost, `Redeemed: ${title}`)}
      >
        {text.unlock}
      </button>
    </article>
  );
}
