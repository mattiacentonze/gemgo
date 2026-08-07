"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
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
  LocateFixed,
  MapPin,
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
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DestinationPhoto from "./DestinationPhoto";
import ExperienceMap from "./ExperienceMap";
import LocalProfilePanel from "./LocalProfilePanel";
import { difficultyLabel, kindLabel, panUi, transportLabel } from "../i18n/pan-ui";
import { allExperiences, catalogueSummary, nearestGtfsStop, totalCatalogueEntries } from "../product/integrated-data";
import {
  applyPromptToPreferences,
  haversineKm,
  rankExperiences,
  type RankedExperience,
} from "../product/recommendation-engine";
import { useLiveWeather, useOriginPoint, useRoadTimes, useSelectedRoute } from "../product/live-context";
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
import type { AppSection, Experience, ExperienceKind, SearchPreferences, TransportMode } from "../product/types";

type Locale = "en" | "it" | "de" | "fr" | "sl";
type ExploreStage = "brief" | "results" | "experience";
type TripMode = "active" | "saved";

const locales: Locale[] = ["en", "it", "de", "fr", "sl"];
const localeNames: Record<Locale, string> = { en: "English", it: "Italiano", de: "Deutsch", fr: "Français", sl: "Slovenščina" };

const copy = {
  en: {
    explore: "Explore", trip: "My Trip", rewards: "Rewards", about: "About", account: "Create account",
    headline: "What would you like to experience?", intro: "Describe your plan naturally, then adjust the constraints that matter.",
    prompt: "Tell GemGo what you are looking for", origin: "Starting from", travel: "Maximum travel time",
    mobility: "Mobility", time: "Available time", experience: "Experience type", needs: "Difficulty and needs",
    search: "Show my best alternatives", results: "Your three best alternatives", adjust: "Adjust preferences",
    active: "Active plan", saved: "Saved trips", verify: "Verify visit", offline: "Save essentials offline",
    noTrip: "No active trip yet", find: "Find an experience", points: "GemPoints", impact: "Your GemGo impact",
  },
  it: {
    explore: "Esplora", trip: "Il mio viaggio", rewards: "Premi", about: "Informazioni", account: "Crea account",
    headline: "Che esperienza vorresti vivere?", intro: "Descrivi il piano in modo naturale, poi modifica i vincoli importanti.",
    prompt: "Spiega a GemGo cosa stai cercando", origin: "Partenza da", travel: "Tempo massimo di viaggio",
    mobility: "Mobilità", time: "Tempo disponibile", experience: "Tipo di esperienza", needs: "Difficoltà ed esigenze",
    search: "Mostra le alternative migliori", results: "Le tue tre alternative migliori", adjust: "Modifica preferenze",
    active: "Piano attivo", saved: "Viaggi salvati", verify: "Verifica visita", offline: "Salva dati essenziali offline",
    noTrip: "Non hai ancora un viaggio attivo", find: "Trova un’esperienza", points: "GemPoints", impact: "Il tuo impatto GemGo",
  },
  de: {
    explore: "Entdecken", trip: "Meine Reise", rewards: "Prämien", about: "Über GemGo", account: "Konto erstellen",
    headline: "Was möchtest du erleben?", intro: "Beschreibe deinen Plan und passe danach die wichtigsten Vorgaben an.",
    prompt: "Beschreibe GemGo, wonach du suchst", origin: "Startpunkt", travel: "Maximale Reisezeit",
    mobility: "Mobilität", time: "Verfügbare Zeit", experience: "Erlebnisart", needs: "Schwierigkeit und Bedürfnisse",
    search: "Beste Alternativen anzeigen", results: "Deine drei besten Alternativen", adjust: "Einstellungen ändern",
    active: "Aktiver Plan", saved: "Gespeicherte Reisen", verify: "Besuch bestätigen", offline: "Wichtige Daten offline speichern",
    noTrip: "Noch keine aktive Reise", find: "Erlebnis finden", points: "GemPoints", impact: "Deine GemGo-Wirkung",
  },
  fr: {
    explore: "Explorer", trip: "Mon voyage", rewards: "Récompenses", about: "À propos", account: "Créer un compte",
    headline: "Quelle expérience recherchez-vous ?", intro: "Décrivez votre projet puis ajustez les contraintes essentielles.",
    prompt: "Expliquez à GemGo ce que vous recherchez", origin: "Départ", travel: "Temps de trajet maximal",
    mobility: "Mobilité", time: "Temps disponible", experience: "Type d’expérience", needs: "Difficulté et besoins",
    search: "Afficher mes meilleures alternatives", results: "Vos trois meilleures alternatives", adjust: "Modifier les préférences",
    active: "Voyage actif", saved: "Voyages enregistrés", verify: "Vérifier la visite", offline: "Enregistrer les informations hors ligne",
    noTrip: "Aucun voyage actif", find: "Trouver une expérience", points: "GemPoints", impact: "Votre impact GemGo",
  },
  sl: {
    explore: "Razišči", trip: "Moje potovanje", rewards: "Nagrade", about: "O projektu", account: "Ustvari račun",
    headline: "Kaj bi radi doživeli?", intro: "Opišite načrt in nato prilagodite pomembne omejitve.",
    prompt: "Povejte GemGo, kaj iščete", origin: "Začetna točka", travel: "Najdaljši čas potovanja",
    mobility: "Mobilnost", time: "Razpoložljiv čas", experience: "Vrsta doživetja", needs: "Zahtevnost in potrebe",
    search: "Prikaži najboljše alternative", results: "Vaše tri najboljše alternative", adjust: "Spremeni nastavitve",
    active: "Aktivni načrt", saved: "Shranjena potovanja", verify: "Potrdi obisk", offline: "Shrani bistvene podatke brez povezave",
    noTrip: "Aktivnega potovanja še ni", find: "Poišči doživetje", points: "GemPoints", impact: "Vaš vpliv GemGo",
  },
} as const;

const transportOptions: Array<{ id: TransportMode; label: string; icon: typeof Car }> = [
  { id: "walking", label: "Walking", icon: Footprints },
  { id: "bicycle", label: "Bicycle", icon: Bike },
  { id: "public", label: "Public transport", icon: Bus },
  { id: "car", label: "Car", icon: Car },
  { id: "mixed", label: "Mixed mobility", icon: Route },
];

const kindOptions: Array<{ id: ExperienceKind; label: string }> = [
  { id: "hiking", label: "Hiking" }, { id: "nature", label: "Nature" }, { id: "villages", label: "Villages" },
  { id: "culture", label: "Culture" }, { id: "water", label: "Lakes & rivers" }, { id: "food", label: "Food" },
  { id: "family", label: "Family" }, { id: "accessible", label: "Accessible" }, { id: "winter", label: "Winter" },
];

const needOptions = ["Children", "Dog", "Reduced mobility", "Stroller", "No exposed paths", "Indoor alternative", "Low-cost"];
const durationOptions: Array<{ id: SearchPreferences["availableTime"]; label: string }> = [
  { id: "short", label: "1–2 hours" }, { id: "half", label: "Half day" }, { id: "full", label: "Full day" }, { id: "multi", label: "Multiple days" },
];

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${minutes}m`;
};

const overlap = (first: ExperienceKind[], second: ExperienceKind[]) => first.some((item) => second.includes(item));

export default function IntegratedAppShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [section, setSection] = useState<AppSection>("explore");
  const [stage, setStage] = useState<ExploreStage>("brief");
  const [preferences, setPreferences] = useState<SearchPreferences>(defaultPreferences);
  const [selectedId, setSelectedId] = useState(allExperiences[0]?.id ?? "");
  const [showMore, setShowMore] = useState(false);
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

  const t = copy[locale];
  const u = panUi[locale];
  const { origin, status: originStatus } = useOriginPoint(preferences.origin);
  const weather = useLiveWeather(origin);

  const initialRanked = useMemo(
    () => rankExperiences(allExperiences, preferences, { origin, weather }),
    [origin, preferences, weather],
  );
  const roadCandidates = useMemo(
    () => initialRanked.map((item) => item.experience),
    [initialRanked],
  );
  const routeTimes = useRoadTimes(origin, roadCandidates, preferences.transport);
  const ranked = useMemo(
    () => rankExperiences(allExperiences, preferences, { origin, weather, routeTimes }),
    [origin, preferences, routeTimes, weather],
  );

  const selected = allExperiences.find((experience) => experience.id === selectedId) ?? ranked[0]?.experience ?? allExperiences[0];
  const activeExperience = activeTrip
    ? allExperiences.find((experience) => experience.id === activeTrip.trip.experienceId) ?? null
    : null;
  const activeTransitStop = activeExperience ? nearestGtfsStop(activeExperience) : null;
  const selectedRoute = useSelectedRoute(origin, selected ?? null, preferences.transport);
  const activeRoute = useSelectedRoute(origin, activeExperience, activeTrip?.preferences.transport ?? preferences.transport);
  const balance = pointBalance(ledger);

  const moreResults = useMemo(() => {
    const selectedIds = new Set(ranked.map((item) => item.experience.id));
    return allExperiences
      .filter((experience) => !selectedIds.has(experience.id) && overlap(experience.kind, preferences.kinds))
      .slice(0, 6);
  }, [preferences.kinds, ranked]);

  const gemDropAlternative = (() => {
    if (!activeExperience || !activeTrip) return null;
    return allExperiences
      .filter((experience) => experience.id !== activeExperience.id && overlap(experience.kind, activeExperience.kind))
      .sort((first, second) => {
        const crowd = { low: 0, moderate: 1, high: 2 };
        return crowd[first.crowd] - crowd[second.crowd] || first.durationMinutes - second.durationMinutes;
      })[0] ?? null;
  })();

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("gemgo-locale-v3") as Locale | null;
    if (storedLocale && locales.includes(storedLocale)) setLocale(storedLocale);
    const trips = loadSavedTrips();
    const active = loadActiveTrip();
    const migrated = migrateLegacyTrip(defaultPreferences);
    setSavedTrips(trips.length ? trips : migrated ? [migrated] : []);
    setActiveTrip(active ?? migrated);
    setLedger(loadLedger());
    setUnlocks(loadRewardUnlocks());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("gemgo-locale-v3", locale);
  }, [locale]);

  useEffect(() => saveTrips(savedTrips), [savedTrips]);
  useEffect(() => saveActiveTrip(activeTrip), [activeTrip]);
  useEffect(() => saveLedger(ledger), [ledger]);
  useEffect(() => saveRewardUnlocks(unlocks), [unlocks]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const closeOverlays = () => {
      setMobileMenuOpen(false);
      setLanguageOpen(false);
    };
    window.addEventListener("gemgo:close-overlays", closeOverlays);
    return () => window.removeEventListener("gemgo:close-overlays", closeOverlays);
  }, []);

  const chooseSection = (next: AppSection) => {
    window.dispatchEvent(new Event("gemgo:close-overlays"));
    setSection(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updatePreference = <K extends keyof SearchPreferences>(key: K, value: SearchPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const search = () => {
    const interpreted = applyPromptToPreferences(preferences.prompt, preferences);
    setPreferences(interpreted);
    setStage("results");
    if (ranked[0]) setSelectedId(ranked[0].experience.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setSavedTrips((current) => current.map((trip) => (trip.id === next.id ? next : trip)));
  };

  const renameTrip = (trip: SavedTrip) => {
    const name = window.prompt("Trip name", trip.name)?.trim();
    if (!name) return;
    const next = { ...trip, name, updatedAt: new Date().toISOString() };
    setSavedTrips((current) => current.map((item) => (item.id === trip.id ? next : item)));
    if (activeTrip?.id === trip.id) setActiveTrip(next);
  };

  const duplicateTrip = (trip: SavedTrip) => {
    const now = new Date().toISOString();
    const copyTrip: SavedTrip = { ...trip, id: `trip-${Date.now()}`, name: `${trip.name} copy`, createdAt: now, updatedAt: now };
    setSavedTrips((current) => [copyTrip, ...current]);
    setToast("Trip duplicated");
  };

  const deleteTrip = (trip: SavedTrip) => {
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
      updateActive({ ...activeTrip, offlineSaved: true, updatedAt: new Date().toISOString() });
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
    setVerificationOpen(false);
    setVerificationMessage("Visit verified and GemPoints awarded");
    setToast("Visit verified");
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
          { label: "Current location", lat: position.coords.latitude, lng: position.coords.longitude },
          activeExperience,
        );
        if (distance <= 2) completeVerification("verified");
        else setVerificationMessage(`You are about ${distance.toFixed(1)} km from the verification area.`);
      },
      () => setVerificationMessage("Location permission was denied or the position could not be determined."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const verifyQr = () => {
    if (/^(GEMGO|GEM)-/i.test(qrCode.trim())) completeVerification("verified");
    else setVerificationMessage("The QR code is not valid for this demonstration.");
  };

  const switchGemDrop = () => {
    if (!activeTrip || !gemDropAlternative) return;
    updateActive({
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      trip: { ...activeTrip.trip, experienceId: gemDropAlternative.id, acceptedGemDrop: true },
    });
    setGemDropOpen(false);
    setToast("Trip switched to the quieter alternative");
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

  const navItems: Array<{ id: AppSection; label: string; icon: typeof Compass }> = [
    { id: "explore", label: t.explore, icon: Compass },
    { id: "trip", label: t.trip, icon: CalendarDays },
    { id: "rewards", label: t.rewards, icon: Gift },
    { id: "about", label: t.about, icon: Info },
  ];

  return (
    <main className="product-app integrated-app">
      <header className="app-header">
        <Link className="brand brand-compact" href="/" aria-label="GemGo homepage">
          <span className="brand-mark"><Mountain size={21} /></span>
          <span><strong>GemGo</strong><small>{u.tagline}</small></span>
        </Link>
        <nav className="desktop-nav" aria-label={t.explore}>
          {navItems.map((item) => <button type="button" key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => chooseSection(item.id)}>{item.label}</button>)}
        </nav>
        <div className="header-actions">
          <div className="language-menu">
            <button type="button" className="icon-text-button" onClick={() => { window.dispatchEvent(new Event("gemgo:close-overlays")); setLanguageOpen((value) => !value); }}><Languages size={18} /> {locale.toUpperCase()}</button>
            {languageOpen && <div className="language-popover"><strong>{u.language}</strong>{locales.map((item) => <button type="button" key={item} onClick={() => { setLocale(item); setLanguageOpen(false); }}>{item === locale ? <Check size={15} /> : <span />}{localeNames[item]}</button>)}</div>}
          </div>
          <LocalProfilePanel locale={locale} ledger={ledger} savedTrips={savedTrips} unlocks={unlocks} />
          <button type="button" className="icon-button mobile-menu-button" aria-label={u.openMenu} onClick={() => { window.dispatchEvent(new Event("gemgo:close-overlays")); setLanguageOpen(false); setMobileMenuOpen((value) => !value); }}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {mobileMenuOpen && <nav className="mobile-menu">{navItems.map((item) => <button type="button" key={item.id} onClick={() => chooseSection(item.id)}>{item.label}<ChevronRight size={17} /></button>)}</nav>}
      </header>

      {activeTransitStop && section === "trip" && (
        <aside className="gtfs-source-banner">
          <Bus size={18} />
          <span><strong>{activeTransitStop.name}</strong><small>{activeTransitStop.distanceKm.toFixed(1)} km from the experience · static regional-rail stop from GTFS.de / DELFI, not a live departure</small></span>
        </aside>
      )}

      {section === "explore" && (
        <section className="app-content explore-page">
          {stage === "brief" && (
            <>
              <div className="page-heading split-heading"><div><span className="eyebrow"><Compass size={15} /> {u.alternatives}</span><h1>{t.headline}</h1><p>{t.intro}</p></div><div className="privacy-note"><ShieldCheck size={19} /><span><strong>{u.noAccount}</strong> {u.localPlanning}</span></div></div>
              <div className="explore-layout">
                <form className="planner-panel" onSubmit={(event) => { event.preventDefault(); search(); }}>
                  <label className="prompt-field"><span>{t.prompt}</span><textarea rows={4} value={preferences.prompt} onChange={(event) => updatePreference("prompt", event.target.value)} /><small>{u.parser}</small></label>
                  <div className="form-section"><div className="form-section-title"><LocateFixed size={18} /><div><strong>{t.origin}</strong><small>{originStatus === "ready" ? origin?.label : originStatus === "loading" ? u.resolving : originStatus === "not-found" ? u.notFound : u.typePlace}</small></div></div><div className="field-grid field-grid-location"><label><span>{t.origin}</span><input value={preferences.origin} onChange={(event) => updatePreference("origin", event.target.value)} /></label><label><span>{t.travel}</span><div className="range-value">{preferences.maxTravelMinutes} min</div><input type="range" min="15" max="180" step="5" value={preferences.maxTravelMinutes} onChange={(event) => updatePreference("maxTravelMinutes", Number(event.target.value))} /></label></div></div>
                  <div className="form-section"><div className="form-section-title"><Navigation size={18} /><div><strong>{t.mobility}</strong><small>{u.travelImpact}</small></div></div><div className="choice-grid transport-grid">{transportOptions.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} className={preferences.transport === option.id ? "is-selected" : ""} onClick={() => updatePreference("transport", option.id)}><Icon size={18} />{transportLabel(locale, option.id)}</button>; })}</div></div>
                  <div className="form-section"><div className="form-section-title"><Clock3 size={18} /><div><strong>{t.time}</strong><small>{u.impractical}</small></div></div><div className="choice-grid duration-grid">{durationOptions.map((option) => <button type="button" key={option.id} className={preferences.availableTime === option.id ? "is-selected" : ""} onClick={() => updatePreference("availableTime", option.id)}>{u[option.id]}</button>)}</div><div className="field-grid time-grid"><label><span>{u.from}</span><input type="time" value={preferences.availableFrom} onChange={(event) => updatePreference("availableFrom", event.target.value)} /></label><label><span>{u.to}</span><input type="time" value={preferences.availableTo} onChange={(event) => updatePreference("availableTo", event.target.value)} /></label></div></div>
                  <div className="form-section"><div className="form-section-title"><Sparkles size={18} /><div><strong>{t.experience}</strong><small>{u.chooseMatters}</small></div></div><div className="chip-grid">{kindOptions.map((option) => <button type="button" key={option.id} className={preferences.kinds.includes(option.id) ? "is-selected" : ""} onClick={() => updatePreference("kinds", preferences.kinds.includes(option.id) ? preferences.kinds.filter((item) => item !== option.id) : [...preferences.kinds, option.id])}>{kindLabel(locale, option.id)}</button>)}</div></div>
                  <div className="form-section"><div className="form-section-title"><Target size={18} /><div><strong>{t.needs}</strong><small>{u.unsuitable}</small></div></div><div className="choice-grid difficulty-grid">{(["easy", "moderate", "challenging"] as const).map((difficulty) => <button type="button" key={difficulty} className={preferences.difficulty === difficulty ? "is-selected" : ""} onClick={() => updatePreference("difficulty", difficulty)}>{difficultyLabel(locale, difficulty)}</button>)}</div><div className="chip-grid needs-grid">{needOptions.map((need, index) => <button type="button" key={need} className={preferences.needs.includes(need) ? "is-selected" : ""} onClick={() => updatePreference("needs", preferences.needs.includes(need) ? preferences.needs.filter((item) => item !== need) : [...preferences.needs, need])}>{u.needs[index]}</button>)}</div></div>
                  <div className="condition-card"><CloudRain size={21} /><div><strong>{weather.source === "live" ? `${weather.temperature?.toFixed(0)}°C · ${weather.precipitationProbability ?? 0}% rain probability` : "Live weather unavailable"}</strong><span>{weather.source === "live" ? "Open-Meteo conditions influence the ranking." : "GemGo uses conservative fallback assumptions."}</span></div><span className="data-source-chip">{weather.source}</span></div>
                  <button type="submit" className="button button-primary button-large">{t.search}<ArrowRight size={18} /></button>
                </form>
                <aside className="explore-aside"><div className="catalogue-card"><span className="eyebrow"><Globe2 size={14} /> {u.catalogue}</span><strong>{totalCatalogueEntries}</strong><span>{u.catalogueBody}</span><div>{Object.entries(catalogueSummary).map(([region, count]) => <small key={region}>{region}: {count}</small>)}</div></div><ExperienceMap locale={locale} experiences={ranked.map((item) => item.experience)} origin={origin} selectedId={selectedId} onSelect={(experience) => setSelectedId(experience.id)} /><div className="method-card"><h3>{u.quality}</h3><p>{u.qualityBody}</p></div></aside>
              </div>
            </>
          )}

          {stage === "results" && (
            <>
              <div className="results-header"><button type="button" className="back-button" onClick={() => setStage("brief")}><ArrowLeft size={17} /> {t.adjust}</button><div><span className="eyebrow"><Sparkles size={15} /> Ranked from {totalCatalogueEntries} entries</span><h1>{t.results}</h1><p>Starting from <strong>{origin?.label ?? preferences.origin}</strong>, within <strong>{preferences.maxTravelMinutes} minutes</strong>.</p></div><div className="results-summary"><strong>3</strong><span>distinct recommendation roles</span><small>Live route times where available</small></div></div>
              <div className="result-layout"><div className="results-map-panel"><ExperienceMap experiences={ranked.map((item) => item.experience)} origin={origin} selectedId={selectedId} onSelect={(experience) => setSelectedId(experience.id)} /><div className="comparison-proof"><div><span>Original plan</span><strong>Popular destination</strong><small>Higher expected pressure</small></div><ArrowRight size={22} /><div><span>GemGo alternative</span><strong>{ranked[0]?.experience.name}</strong><small>Compatible and more transparent</small></div></div></div><div className="result-cards">{ranked.map((item) => <IntegratedResultCard key={item.experience.id} item={item} saved={savedTrips.some((trip) => trip.trip.experienceId === item.experience.id)} onOpen={() => { setSelectedId(item.experience.id); setStage("experience"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onSave={() => saveIdea(item.experience)} />)}{showMore && moreResults.map((experience) => <CompactResult key={experience.id} experience={experience} onOpen={() => { setSelectedId(experience.id); setStage("experience"); }} />)}<button type="button" className="show-more-button" onClick={() => setShowMore((value) => !value)}>{showMore ? "Show only the top three" : "Show more compatible results"}<ChevronRight size={17} /></button></div></div>
            </>
          )}

          {stage === "experience" && selected && <ExperienceDetail experience={selected} ranked={ranked.find((item) => item.experience.id === selected.id)} origin={origin} route={selectedRoute} transport={preferences.transport} onBack={() => setStage("results")} onSave={() => saveIdea(selected)} onAdd={() => saveIdea(selected, true)} />}
        </section>
      )}

      {section === "trip" && (
        <section className="app-content trip-page integrated-trip-page">
          <div className="page-heading trip-heading"><div><span className="eyebrow"><CalendarDays size={15} /> {t.trip}</span><h1>{activeExperience ? activeTrip?.name : t.noTrip}</h1><p>Saved ideas and active operational plans now live in one place.</p></div><div className="segmented-control"><button type="button" className={tripMode === "active" ? "is-active" : ""} onClick={() => setTripMode("active")}>{t.active}</button><button type="button" className={tripMode === "saved" ? "is-active" : ""} onClick={() => setTripMode("saved")}>{t.saved} ({savedTrips.length})</button></div></div>
          {tripMode === "active" && (!activeTrip || !activeExperience ? <div className="empty-state"><CalendarDays size={36} /><h2>{t.noTrip}</h2><button type="button" className="button button-primary" onClick={() => chooseSection("explore")}>{t.find}<ArrowRight size={17} /></button></div> : <div className="trip-layout"><div className="trip-main-card"><DestinationPhoto name={activeExperience.name} region={activeExperience.region} className="trip-real-photo" /><div className="trip-title-block"><span className={`crowd-chip crowd-${activeExperience.crowd}`}>{activeExperience.crowd} crowd</span><h2>{activeExperience.promise}</h2><p>{activeExperience.name} · departure {activeTrip.trip.plannedDeparture}</p></div><ExperienceMap experiences={[activeExperience]} origin={origin} selectedId={activeExperience.id} routeCoordinates={activeRoute} /><div className="trip-timeline">{activeExperience.itinerary.map((item, index) => <div className="timeline-item" key={`${item.time}-${item.label}`}><div className="timeline-marker">{index + 1}</div><time>{item.time}</time><span>{item.label}</span></div>)}</div><div className="trip-action-row"><button type="button" className="button button-primary" onClick={() => setVerificationOpen(true)} disabled={activeTrip.trip.verified}>{activeTrip.trip.verified ? "Visit verified" : t.verify}<BadgeCheck size={17} /></button><a className="button button-secondary" href={`https://www.openstreetmap.org/directions?to=${activeExperience.latitude},${activeExperience.longitude}`} target="_blank" rel="noreferrer"><Navigation size={17} /> Open navigation</a></div></div><aside className="trip-side"><div className="operational-card"><h3>Operational information</h3>{activeExperience.mobility.map((item) => <p key={item}><CheckCircle2 size={16} />{item}</p>)}<p><Users size={16} /> Best lower-pressure window: {activeExperience.crowdWindow}</p></div><div className="offline-card"><Download size={22} /><div><h3>Offline essentials</h3><p>Cache the application shell and preserve this trip on the device.</p></div><button type="button" className="button button-secondary" onClick={saveOffline}>{activeTrip.offlineSaved ? "Saved offline" : t.offline}</button></div><button type="button" className="condition-change-card" onClick={() => setGemDropOpen(true)}><Sparkles size={22} /><span><strong>Conditions changed</strong><small>Compare a contextual quieter alternative.</small></span><ChevronRight size={18} /></button></aside></div>)}
          {tripMode === "saved" && <div className="saved-trip-grid">{savedTrips.length === 0 ? <div className="empty-state"><Save size={34} /><h2>No saved trips</h2></div> : savedTrips.map((trip) => { const experience = allExperiences.find((item) => item.id === trip.trip.experienceId); return <article className="saved-trip-card" key={trip.id}><div><span>{experience?.region ?? "Alps"}</span><h3>{trip.name}</h3><p>{experience?.promise}</p><small>Updated {new Date(trip.updatedAt).toLocaleDateString(locale)}</small></div><div className="saved-trip-actions"><button type="button" onClick={() => { setActiveTrip(trip); setTripMode("active"); }}><ArrowRight size={16} /> Open</button><button type="button" onClick={() => renameTrip(trip)}><Pencil size={16} /> Rename</button><button type="button" onClick={() => duplicateTrip(trip)}><Copy size={16} /> Duplicate</button><button type="button" onClick={() => deleteTrip(trip)}><Trash2 size={16} /> Delete</button></div></article>; })}</div>}
        </section>
      )}

      {section === "rewards" && <RewardsPage balance={balance} ledger={ledger} unlocks={unlocks} activeTrip={activeTrip} onUnlock={unlockReward} />}
      {section === "about" && <AboutPage savedTrips={savedTrips} ledger={ledger} />}

      <nav className="mobile-bottom-nav">{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => chooseSection(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>

      {gemDropOpen && activeExperience && gemDropAlternative && <GemDropModal original={activeExperience} alternative={gemDropAlternative} onClose={() => setGemDropOpen(false)} onSwitch={switchGemDrop} />}
      {verificationOpen && activeExperience && <VerificationModal experience={activeExperience} message={verificationMessage} qrCode={qrCode} onQrCode={setQrCode} onGps={verifyGps} onQr={verifyQr} onDemo={() => completeVerification("demo")} onClose={() => setVerificationOpen(false)} />}
      {toast && <div className="action-toast"><CheckCircle2 size={18} />{toast}</div>}
    </main>
  );
}

function IntegratedResultCard({ item, saved, onOpen, onSave }: { item: RankedExperience; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const experience = item.experience;
  return <article className="experience-card integrated-result-card"><div className="experience-card-media"><DestinationPhoto name={experience.name} region={experience.region} compact /><span className="rank-label">{item.label}</span><span className={`crowd-chip crowd-${experience.crowd}`}>{experience.crowd} crowd</span></div><div className="experience-card-body"><span className="validation-label"><BadgeCheck size={14} />{experience.validation}</span><h2>{experience.name}</h2><p className="experience-promise">{experience.promise}</p><div className="experience-metrics"><span><Navigation size={16} />{item.travelMinutes ?? "?"} min</span><span><Clock3 size={16} />{formatDuration(experience.durationMinutes)}</span><span><Coins size={16} />{experience.points}</span></div><div className="reason-list">{item.reasons.slice(0, 3).map((reason) => <span key={reason}><CheckCircle2 size={14} />{reason}</span>)}</div><div className="experience-card-actions"><button type="button" className="button button-primary" onClick={onOpen}>View experience<ArrowRight size={16} /></button><button type="button" className="button button-secondary" onClick={onSave} disabled={saved}>{saved ? "Saved" : "Save"}</button></div></div></article>;
}

function CompactResult({ experience, onOpen }: { experience: Experience; onOpen: () => void }) {
  return <button type="button" className="compact-result" onClick={onOpen}><MapPin size={18} /><span><strong>{experience.name}</strong><small>{experience.region} · {experience.kind.slice(0, 2).join(" · ")}</small></span><ChevronRight size={17} /></button>;
}

function ExperienceDetail({ experience, ranked, origin, route, transport, onBack, onSave, onAdd }: { experience: Experience; ranked?: RankedExperience; origin: { label: string; lat: number; lng: number } | null; route: Array<[number, number]>; transport: TransportMode; onBack: () => void; onSave: () => void; onAdd: () => void }) {
  const travel = ranked?.travelMinutes ?? experience.travel[transport];
  return <div className="experience-detail"><button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} />Back to alternatives</button><div className="integrated-detail-hero"><DestinationPhoto name={experience.name} region={experience.region} /><div className="detail-hero-copy"><div><span>{experience.validation}</span><span className={`crowd-chip crowd-${experience.crowd}`}>{experience.crowd} crowd</span></div><p>{experience.region} · {experience.country}</p><h1>{experience.promise}</h1><strong>{experience.name}</strong></div></div><div className="detail-metric-strip"><span><Navigation size={18} /><strong>{travel ?? "Unavailable"}{travel ? " min" : ""}</strong><small>travel time</small></span><span><Clock3 size={18} /><strong>{formatDuration(experience.durationMinutes)}</strong><small>duration</small></span><span><Users size={18} /><strong>{experience.crowdWindow}</strong><small>best window</small></span><span><Coins size={18} /><strong>+{experience.points}</strong><small>GemPoints</small></span></div><div className="detail-grid"><div className="detail-main"><section className="content-card fit-card"><span className="eyebrow"><Sparkles size={14} />Why this fits you</span><h2>A recommendation derived from your real constraints</h2><p>{ranked?.reasons.join(". ") ?? experience.summary}</p></section><section className="content-card"><h2>Route and mobility</h2><ExperienceMap experiences={[experience]} origin={origin} selectedId={experience.id} routeCoordinates={route} />{experience.mobility.map((item) => <p key={item}><CheckCircle2 size={16} />{item}</p>)}</section><section className="content-card"><h2>What you will do</h2><div className="mini-itinerary">{experience.itinerary.map((item) => <div key={`${item.time}-${item.label}`}><time>{item.time}</time><span>{item.label}</span></div>)}</div></section><section className="content-card comparison-card"><h2>Honest comparison</h2><div className="comparison-columns"><div><small>Original plan</small><strong>{experience.comparison.original}</strong><span>{experience.comparison.reachDifference}</span></div><ArrowRight size={22} /><div><small>GemGo alternative</small><strong>{experience.name}</strong>{experience.comparison.advantages.map((item) => <span key={item}><Check size={14} />{item}</span>)}</div></div><div className="tradeoff-box"><AlertTriangle size={18} /><div><strong>Trade-offs</strong>{experience.tradeoffs.map((item) => <span key={item}>{item}</span>)}</div></div></section></div><aside className="detail-side"><section className="content-card local-benefit-card"><HeartHandshake size={24} /><h3>Local benefit</h3><p>{experience.localBenefit}</p>{experience.partner && <span>{experience.partner}</span>}</section><section className="content-card safety-card"><h3>Safety and limits</h3>{experience.safety.map((item) => <p key={item}><ShieldCheck size={16} />{item}</p>)}</section><div className="detail-cta-card"><button type="button" className="button button-primary button-full" onClick={onAdd}>Add to My Trip<ArrowRight size={17} /></button><button type="button" className="button button-secondary button-full" onClick={onSave}>Save for later</button><button type="button" className="button button-ghost button-full" onClick={onBack}>Show another alternative</button></div></aside></div></div>;
}

function GemDropModal({ original, alternative, onClose, onSwitch }: { original: Experience; alternative: Experience; onClose: () => void; onSwitch: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="gemdrop-panel"><button type="button" className="modal-close" onClick={onClose}><X size={20} /></button><span className="eyebrow"><Sparkles size={15} />Contextual GemDrop</span><h2>This area is becoming crowded</h2><p>A comparable alternative is available. You remain in control.</p><div className="gemdrop-comparison"><div className="gemdrop-option original-option"><small>Original plan</small><h3>{original.name}</h3><p><Users size={16} />Crowd rising</p><p><Coins size={16} />Standard reward</p></div><ArrowRight size={24} /><div className="gemdrop-option alternative-option"><small>Alternative</small><h3>{alternative.name}</h3><p><Users size={16} />{alternative.crowd} crowd</p><p><Coins size={16} />+20 bonus GemPoints</p></div></div><div className="gemdrop-actions"><button type="button" className="button button-primary" onClick={onSwitch}>Switch my trip<ArrowRight size={17} /></button><button type="button" className="button button-secondary" onClick={onClose}>Keep original plan</button></div></div></div>;
}

function VerificationModal({ experience, message, qrCode, onQrCode, onGps, onQr, onDemo, onClose }: { experience: Experience; message: string; qrCode: string; onQrCode: (value: string) => void; onGps: () => void; onQr: () => void; onDemo: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="verification-card verification-modal"><button type="button" className="modal-close" onClick={onClose}><X size={20} /></button><BadgeCheck size={36} /><h2>Verify your visit</h2><p>Verification awards points and measures whether recommendations redistribute flows without retaining a detailed movement history.</p><button type="button" className="verification-method" onClick={onGps}><LocateFixed size={24} /><span><strong>Verify current location</strong><small>Checks whether you are within 2 km of {experience.name}.</small></span></button><div className="qr-verification"><label><span>Partner QR code</span><input value={qrCode} onChange={(event) => onQrCode(event.target.value)} placeholder="GEMGO-…" /></label><button type="button" className="button button-secondary" onClick={onQr}><QrCode size={17} />Verify code</button></div><button type="button" className="button button-ghost" onClick={onDemo}>Use clearly labelled demo verification</button>{message && <p className="verification-message">{message}</p>}</div></div>;
}

function RewardsPage({ balance, ledger, unlocks, activeTrip, onUnlock }: { balance: number; ledger: GemPointEvent[]; unlocks: RewardUnlock[]; activeTrip: SavedTrip | null; onUnlock: (id: string, cost: number, label: string) => void }) {
  return <section className="app-content rewards-page"><div className="page-heading rewards-heading"><div><span className="eyebrow"><Gift size={15} />One clear currency</span><h1>Your GemPoints</h1><p>Earn points across the Alps and use them with relevant local partners.</p></div><div className="points-balance"><Coins size={27} /><strong>{balance}</strong><span>GemPoints</span></div></div><div className="reward-progress-card"><div><strong>{Math.min(balance, 100)} / 100</strong><span>Progress to your first reward</span></div><div className="progress-track large"><span style={{ width: `${Math.min(balance, 100)}%` }} /></div></div><div className="rewards-layout"><div><h2>Available for the active trip</h2><div className="reward-list"><RewardCard id="tasting" title="10% off a regional tasting" cost={100} balance={balance} onUnlock={onUnlock} /><RewardCard id="drink" title="Free hot drink with a meal" cost={120} balance={balance} onUnlock={onUnlock} /></div>{unlocks.length > 0 && <div className="unlocked-list"><h3>Unlocked codes</h3>{unlocks.map((unlock) => <p key={unlock.id}><QrCode size={16} /><strong>{unlock.code}</strong><span>expires {new Date(unlock.expiresAt).toLocaleTimeString()}</span></p>)}</div>}</div><aside className="earning-card"><h2>GemPoints history</h2>{ledger.length === 0 ? <p>No point events yet.</p> : [...ledger].reverse().map((event) => <p key={event.id}><span>{event.label}</span><strong>{event.amount > 0 ? "+" : ""}{event.amount}</strong></p>)}</aside></div><div className="personal-impact-section"><h2>Your GemGo impact</h2><div className="impact-grid"><div><strong>{activeTrip?.trip.verified ? 1 : 0}</strong><span>verified quieter experiences</span></div><div><strong>{ledger.filter((event) => event.type === "gemdrop").length}</strong><span>GemDrops accepted</span></div><div><strong>{ledger.filter((event) => event.type === "partner").length}</strong><span>partner visits</span></div><div><strong>{balance}</strong><span>current GemPoints</span></div></div></div></section>;
}

function RewardCard({ id, title, cost, balance, onUnlock }: { id: string; title: string; cost: number; balance: number; onUnlock: (id: string, cost: number, label: string) => void }) {
  return <article className="reward-card"><div className="reward-icon"><WalletCards size={24} /></div><div><span>Demonstration partner</span><h3>{title}</h3><p>{cost} GemPoints · locally relevant</p></div><button type="button" disabled={balance < cost} onClick={() => onUnlock(id, cost, `Redeemed: ${title}`)}>Unlock reward</button></article>;
}

function AboutPage({ savedTrips, ledger }: { savedTrips: SavedTrip[]; ledger: GemPointEvent[] }) {
  return <section className="app-content about-page"><div className="page-heading"><span className="eyebrow"><Mountain size={15} />About GemGo</span><h1>Predict → Recommend → Redirect → Verify → Reward → Measure</h1><p>GemGo combines a better visitor decision with measurable, privacy-preserving outcomes for Alpine territories.</p></div><div className="methodology-grid"><article><Users size={23} /><h3>Crowd prediction</h3><p>Historical patterns, time, season, live weather and local signals, with visible confidence.</p></article><article><Target size={23} /><h3>Personalisation</h3><p>Interests, duration, difficulty, origin, transport and specific needs.</p></article><article><ShieldCheck size={23} /><h3>Safety gates</h3><p>Compatibility and territorial capacity before quietness improves rank.</p></article><article><Globe2 size={23} /><h3>Pan-Alpine framework</h3><p>{totalCatalogueEntries} current entries, shared standards and progressively deeper local validation.</p></article></div><div className="dashboard-banner"><div><span className="demo-label">Demonstration and device-local data</span><h2>Territory dashboard</h2><p>Real operational metrics will require sufficient anonymised samples.</p></div></div><div className="dashboard-metrics"><article><span>Plans created</span><strong>{savedTrips.length}</strong><small>on this device</small></article><article><span>Verified visits</span><strong>{ledger.filter((event) => event.type === "visit").length}</strong><small>device-local events</small></article><article><span>GemDrop acceptance</span><strong>{ledger.filter((event) => event.type === "gemdrop").length}</strong><small>device-local events</small></article><article><span>Catalogue coverage</span><strong>{Object.keys(catalogueSummary).length + 4}</strong><small>represented Alpine areas</small></article></div><div className="privacy-hero"><ShieldCheck size={34} /><div><h2>Privacy by design</h2><p>Explore without an account. Location is requested only for routing or verification. Account synchronisation remains optional and is not simulated as already operational.</p></div></div></section>;
}
