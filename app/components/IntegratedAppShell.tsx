"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bike,
  Bus,
  CalendarDays,
  CalendarClock,
  Car,
  Castle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Coins,
  Compass,
  Copy,
  Footprints,
  Gift,
  Globe2,
  HeartHandshake,
  Heart,
  Info,
  Languages,
  List,
  LoaderCircle,
  LocateFixed,
  Maximize2,
  MapPin,
  Map as MapIcon,
  Menu,
  MessageSquareText,
  Mountain,
  Navigation,
  Pencil,
  QrCode,
  Route,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Users,
  Watch,
  WalletCards,
  Waves,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import DestinationPhoto from "./DestinationPhoto";
import IntegratedResultCard from "./IntegratedResultCard";
import VisitFeedback, { readFeedbackStats } from "./VisitFeedback";
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
  catalogueExperiences,
  catalogueSummary,
  pilotRegions,
  totalCatalogueEntries,
  type PilotRegion,
} from "../product/catalogue";
import type { TransitAccessPlan } from "../product/transit";
import {
  applyPromptToPreferences,
  getEligibleExperiences,
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
  decodeSharedTrip,
  encodeSharedTrip,
  toggleExperienceInCollection,
  loadActiveTrip,
  loadCollections,
  loadLedger,
  loadRewardUnlocks,
  loadSavedTrips,
  migrateLegacyTrip,
  pointBalance,
  saveActiveTrip,
  saveCollections,
  saveLedger,
  saveRewardUnlocks,
  saveTrips,
  type GemPointEvent,
  type RewardUnlock,
  type SavedCollection,
  type SavedTrip,
  tripExperienceIds,
} from "../product/storage";
import { defaultPreferences } from "../product/data";
import type {
  AppSection,
  Experience,
  ExperienceKind,
  SearchPreferences,
  TransportMode,
} from "../product/types";
import { mvpCopy } from "../i18n/mvp-copy";
import {
  localizedExperienceCaption,
  localizedExperienceNarrative,
  localizedPracticalInfo,
  localizedExperienceReasons,
} from "../i18n/experience-content";
import { seasonLabel, seasonUi } from "../i18n/season";
import { loadStoredNotifications, upsertStoredNotification } from "../product/notifications";
import { calculateVisitPoints } from "../product/gempoints";
import { curatedScenarioFor } from "../product/curated-alternatives";
import { useAuth } from "./AuthProvider";

type ExploreStage = "brief" | "results" | "experience";
type TripMode = "active" | "saved" | "collections";
type MapFocus = { region: PilotRegion | null; requestId: number };
type ActivityProvider = "strava" | "garmin" | "apple-health" | "health-connect";
type UndoSnapshot = {
  savedTrips: SavedTrip[];
  activeTrip: SavedTrip | null;
  label: string;
};

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
    noTrip: "No active trip yet",
    find: "Find an experience",
    points: "GemPoints",
    impact: "Your GemGo impact",
    interpret: "Apply request to filters",
    interpreted: "Request applied",
    region: "Pilot region",
    allRegions: "Both pilot regions",
    quiet: "Prefer lower-pressure places",
    noMatches: "No trustworthy plan fits every constraint.",
    noMatchesBody: "Increase the available time or remove one hard filter. GemGo will not fill the list with an unsuitable destination.",
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
    noTrip: "Non hai ancora un viaggio attivo",
    find: "Trova un’esperienza",
    points: "GemPoints",
    impact: "Il tuo impatto GemGo",
    interpret: "Applica la richiesta ai filtri",
    interpreted: "Richiesta applicata",
    region: "Regione pilota",
    allRegions: "Entrambe le regioni pilota",
    quiet: "Preferisci luoghi a minore affollamento",
    noMatches: "Nessun piano affidabile rispetta tutti i vincoli.",
    noMatchesBody: "Aumenta il tempo disponibile oppure rimuovi un filtro rigido. GemGo non riempirà l’elenco con una meta inadatta.",
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
    noTrip: "Noch keine aktive Reise",
    find: "Erlebnis finden",
    points: "GemPoints",
    impact: "Deine GemGo-Wirkung",
    interpret: "Anfrage auf Filter anwenden",
    interpreted: "Anfrage übernommen",
    region: "Pilotregion",
    allRegions: "Beide Pilotregionen",
    quiet: "Orte mit geringerem Andrang bevorzugen",
    noMatches: "Kein verlässlicher Plan erfüllt alle Vorgaben.",
    noMatchesBody: "Erhöhe die verfügbare Zeit oder entferne einen festen Filter. GemGo ergänzt keine ungeeigneten Ziele.",
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
    noTrip: "Aucun voyage actif",
    find: "Trouver une expérience",
    points: "GemPoints",
    impact: "Votre impact GemGo",
    interpret: "Appliquer la demande aux filtres",
    interpreted: "Demande appliquée",
    region: "Région pilote",
    allRegions: "Les deux régions pilotes",
    quiet: "Privilégier les lieux moins fréquentés",
    noMatches: "Aucun projet fiable ne respecte toutes les contraintes.",
    noMatchesBody: "Augmentez le temps disponible ou retirez un filtre strict. GemGo ne complétera pas la liste avec une destination inadaptée.",
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
    noTrip: "Aktivnega potovanja še ni",
    find: "Poišči doživetje",
    points: "GemPoints",
    impact: "Vaš vpliv GemGo",
    interpret: "Uporabi zahtevo za filtre",
    interpreted: "Zahteva uporabljena",
    region: "Pilotna regija",
    allRegions: "Obe pilotni regiji",
    quiet: "Daj prednost manj obremenjenim krajem",
    noMatches: "Noben zanesljiv načrt ne izpolnjuje vseh omejitev.",
    noMatchesBody: "Povečajte razpoložljivi čas ali odstranite strogi filter. GemGo seznama ne bo zapolnil z neustreznim ciljem.",
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
    transitStatic: "km from the experience · static regional-rail stop from GTFS.de / DELFI, not a live departure",
    transitAccess: "Public-transport access",
    transitOrigin: "Nearest static stop to your Alpine start",
    transitDestination: "Nearest static stop to this experience",
    transitBavaria: "Static GTFS access points only. Open an external planner for the actual timetable and transfers.",
    transitAosta: "No verified reusable GTFS feed is available in this revision. Check the current official Valle d’Aosta operator timetable.",
    transitGoogle: "Open transit directions",
    transitOfficial: "Open official timetable",
  },
  it: {
    alpineStart:
      "Scegli una delle località alpine ufficiali del progetto pilota. GemGo pianifica gli spostamenti tra attività alpine, non il viaggio da casa.",
    hoursHint: "Mostrato in ore e minuti",
    notifications: "Notifiche",
    transitStatic: "km dall’esperienza · fermata ferroviaria regionale statica da GTFS.de / DELFI, non una partenza live",
    transitAccess: "Accesso con trasporto pubblico",
    transitOrigin: "Fermata statica più vicina alla partenza alpina",
    transitDestination: "Fermata statica più vicina a questa esperienza",
    transitBavaria: "Solo punti di accesso GTFS statici. Apri un planner esterno per orari e cambi effettivi.",
    transitAosta: "In questa revisione non è disponibile un feed GTFS verificato e riutilizzabile. Controlla l’orario attuale dell’operatore ufficiale valdostano.",
    transitGoogle: "Apri indicazioni con trasporto pubblico",
    transitOfficial: "Apri orario ufficiale",
  },
  de: {
    alpineStart:
      "Wähle einen offiziellen Ort des Alpen-Pilotprojekts. GemGo plant Wege zwischen alpinen Aktivitäten, nicht die Anreise von zu Hause.",
    hoursHint: "In Stunden und Minuten",
    notifications: "Benachrichtigungen",
    transitStatic: "km vom Erlebnis · statischer Regionalbahnhof aus GTFS.de / DELFI, keine Live-Abfahrt",
    transitAccess: "Anreise mit öffentlichen Verkehrsmitteln",
    transitOrigin: "Nächste statische Haltestelle zum Alpen-Start",
    transitDestination: "Nächste statische Haltestelle zu diesem Erlebnis",
    transitBavaria: "Nur statische GTFS-Zugangspunkte. Für tatsächliche Fahrpläne und Umstiege einen externen Planer öffnen.",
    transitAosta: "In dieser Version ist kein verifizierter, wiederverwendbarer GTFS-Feed verfügbar. Bitte den aktuellen Fahrplan des offiziellen Aostatal-Betreibers prüfen.",
    transitGoogle: "ÖPNV-Route öffnen",
    transitOfficial: "Offiziellen Fahrplan öffnen",
  },
  fr: {
    alpineStart:
      "Choisissez un lieu officiel du pilote alpin. GemGo planifie les déplacements entre activités alpines, pas le trajet depuis votre domicile.",
    hoursHint: "Affiché en heures et minutes",
    notifications: "Notifications",
    transitStatic: "km de l’expérience · arrêt ferroviaire régional statique issu de GTFS.de / DELFI, pas un départ en direct",
    transitAccess: "Accès en transports publics",
    transitOrigin: "Arrêt statique le plus proche du départ alpin",
    transitDestination: "Arrêt statique le plus proche de cette expérience",
    transitBavaria: "Points d’accès GTFS statiques uniquement. Ouvrez un planificateur externe pour les horaires et correspondances réels.",
    transitAosta: "Aucun flux GTFS vérifié et réutilisable n’est disponible dans cette version. Consultez l’horaire actuel de l’opérateur officiel valdôtain.",
    transitGoogle: "Ouvrir l’itinéraire en transports publics",
    transitOfficial: "Ouvrir l’horaire officiel",
  },
  sl: {
    alpineStart:
      "Izberite eno od uradnih lokacij alpskega pilota. GemGo načrtuje premike med alpskimi dejavnostmi, ne poti od doma.",
    hoursHint: "Prikazano v urah in minutah",
    notifications: "Obvestila",
    transitStatic: "km od doživetja · statična regionalna železniška postaja iz GTFS.de / DELFI, ne odhod v živo",
    transitAccess: "Dostop z javnim prevozom",
    transitOrigin: "Najbližja statična postaja alpskemu izhodišču",
    transitDestination: "Najbližja statična postaja temu doživetju",
    transitBavaria: "Samo statične dostopne točke GTFS. Za dejanski vozni red in prestope odprite zunanji načrtovalnik.",
    transitAosta: "V tej različici ni preverjenega in ponovno uporabnega vira GTFS. Preverite trenutni vozni red uradnega prevoznika Doline Aoste.",
    transitGoogle: "Odpri navodila za javni prevoz",
    transitOfficial: "Odpri uradni vozni red",
  },
} as const;

const activityCopy = {
  en: {
    title: "Verify every stop and the journey between them",
    body: "Each place is verified separately. In a future production account, an activity imported from Strava, Garmin, Apple Health or Android Health Connect can also confirm the declared journey.",
    future: "Future account integration · interactive demo",
    how: "Activity sync can verify both arrival and mobility. Walking instead of a declared bicycle trip earns a small bonus; switching from bicycle to car reduces the mobility reward.",
    planned: "Planned mode",
    actual: "Mode recorded by the activity",
    provider: "Activity source",
    import: "Import demo activity and verify",
    verified: "Demo stop recorded",
    standard: "Standard visit points",
    bonus: "Lower-impact change · points bonus",
    malus: "Higher-impact change · points reduction",
    basePoints: "Same base for every location",
    transportBonus: "Mobility bonus",
    offPeakBonus: "Suitable off-peak bonus",
    totalPoints: "Estimated total",
    routeSettings: "Travel between stops",
    routeHelp: "Change the mode to recalculate indicative leg times and redraw the route.",
    estimated: "estimated",
    openNavigation: "Open in Google Maps",
    expandMap: "Expand trip map",
    openTrip: "Open trip",
    start: "Trip starts",
    end: "Trip ends",
  },
  it: {
    title: "Verifica ogni tappa e il tragitto tra le tappe",
    body: "Ogni località viene verificata separatamente. In un futuro account di produzione, un’attività importata da Strava, Garmin, Apple Salute o Health Connect di Android potrà confermare anche il tragitto dichiarato.",
    future: "Futura integrazione account · demo interattiva",
    how: "La sincronizzazione attività potrà verificare arrivo e mobilità. Camminare invece di usare la bici dichiarata dà un piccolo bonus; passare dalla bici all’auto riduce i punti mobilità.",
    planned: "Mezzo pianificato",
    actual: "Mezzo registrato dall’attività",
    provider: "Fonte attività",
    import: "Importa attività demo e verifica",
    verified: "Tappa demo registrata",
    standard: "Punti visita standard",
    bonus: "Cambio a minore impatto · punti bonus",
    malus: "Cambio a maggiore impatto · punti ridotti",
    basePoints: "Stessa base per ogni località",
    transportBonus: "Bonus mobilità",
    offPeakBonus: "Bonus periodo adatto fuori picco",
    totalPoints: "Totale stimato",
    routeSettings: "Spostamenti tra le tappe",
    routeHelp: "Cambia mezzo per ricalcolare i tempi indicativi e ridisegnare il percorso.",
    estimated: "stimati",
    openNavigation: "Apri in Google Maps",
    expandMap: "Espandi la mappa del viaggio",
    openTrip: "Apri viaggio",
    start: "Inizio viaggio",
    end: "Fine viaggio",
  },
  de: {
    title: "Jeden Stopp und den Weg dazwischen bestätigen",
    body: "Jeder Ort wird einzeln bestätigt. In einem künftigen Produktivkonto kann eine Aktivität aus Strava, Garmin, Apple Health oder Android Health Connect auch den angegebenen Weg bestätigen.",
    future: "Künftige Kontoverknüpfung · interaktive Demo",
    how: "Die Aktivitätssynchronisierung kann Ankunft und Mobilität bestätigen. Zu Fuß statt mit dem geplanten Fahrrad gibt einen Bonus; der Wechsel vom Fahrrad zum Auto reduziert Mobilitätspunkte.",
    planned: "Geplantes Verkehrsmittel",
    actual: "In der Aktivität erkannt",
    provider: "Aktivitätsquelle",
    import: "Demo-Aktivität importieren und bestätigen",
    verified: "Demo-Stopp erfasst",
    standard: "Standard-Besuchspunkte",
    bonus: "Umweltschonenderer Wechsel · Bonus",
    malus: "Belastenderer Wechsel · weniger Punkte",
    basePoints: "Gleiche Basis für jeden Ort",
    transportBonus: "Mobilitätsbonus",
    offPeakBonus: "Bonus in geeigneter Nebensaison",
    totalPoints: "Geschätzte Summe",
    routeSettings: "Wege zwischen Stopps",
    routeHelp: "Verkehrsmittel ändern, um Richtzeiten und Route neu zu berechnen.",
    estimated: "geschätzt",
    openNavigation: "In Google Maps öffnen",
    expandMap: "Reisekarte vergrößern",
    openTrip: "Reise öffnen",
    start: "Reisebeginn",
    end: "Reiseende",
  },
  fr: {
    title: "Vérifier chaque étape et le trajet entre elles",
    body: "Chaque lieu est vérifié séparément. Avec un futur compte de production, une activité Strava, Garmin, Apple Santé ou Android Health Connect pourra aussi confirmer le trajet déclaré.",
    future: "Future connexion de compte · démo interactive",
    how: "La synchronisation pourra vérifier l’arrivée et la mobilité. Marcher au lieu du vélo prévu donne un bonus ; passer du vélo à la voiture réduit les points de mobilité.",
    planned: "Mode prévu",
    actual: "Mode enregistré",
    provider: "Source de l’activité",
    import: "Importer l’activité démo et vérifier",
    verified: "Étape démo enregistrée",
    standard: "Points de visite standard",
    bonus: "Changement à moindre impact · bonus",
    malus: "Changement à plus fort impact · points réduits",
    basePoints: "Même base pour chaque lieu",
    transportBonus: "Bonus mobilité",
    offPeakBonus: "Bonus hors pointe adapté",
    totalPoints: "Total estimé",
    routeSettings: "Trajets entre les étapes",
    routeHelp: "Changez de mode pour recalculer les durées indicatives et l’itinéraire.",
    estimated: "estimé",
    openNavigation: "Ouvrir dans Google Maps",
    expandMap: "Agrandir la carte du voyage",
    openTrip: "Ouvrir le voyage",
    start: "Début du voyage",
    end: "Fin du voyage",
  },
  sl: {
    title: "Potrdi vsak postanek in pot med njimi",
    body: "Vsak kraj se potrdi posebej. V prihodnjem produkcijskem računu bo dejavnost iz Strave, Garmina, Apple Health ali Android Health Connect lahko potrdila tudi napovedano pot.",
    future: "Prihodnja povezava računa · interaktivna predstavitev",
    how: "Sinhronizacija lahko potrdi prihod in način poti. Hoja namesto načrtovanega kolesa prinese bonus; zamenjava kolesa z avtomobilom zmanjša točke mobilnosti.",
    planned: "Načrtovani način",
    actual: "Zabeleženi način",
    provider: "Vir dejavnosti",
    import: "Uvozi predstavitveno dejavnost in potrdi",
    verified: "Predstavitveni postanek zabeležen",
    standard: "Običajne točke obiska",
    bonus: "Sprememba z manjšim vplivom · bonus",
    malus: "Sprememba z večjim vplivom · manj točk",
    basePoints: "Enaka osnova za vsak kraj",
    transportBonus: "Bonus za mobilnost",
    offPeakBonus: "Bonus v primernem času zunaj konice",
    totalPoints: "Ocenjeni seštevek",
    routeSettings: "Pot med postanki",
    routeHelp: "Spremeni način za nov okvirni čas in prikaz poti.",
    estimated: "ocenjeno",
    openNavigation: "Odpri v Google Maps",
    expandMap: "Povečaj zemljevid poti",
    openTrip: "Odpri potovanje",
    start: "Začetek poti",
    end: "Konec poti",
  },
} as const;

const detailCopy = {
  en: { attention: "Pay attention before you leave", attentionBody: "These operational notes are specific to this stop and can change seasonally.", plan: "Your stop, step by step", planBody: "The times below adapt the catalogue itinerary to your selected start window; confirm opening and access conditions before departure.", alternative: "Why the GemGo alternative works", tradeoff: "What changes compared with the original plan" },
  it: { attention: "Controlla questi aspetti prima di partire", attentionBody: "Queste note operative riguardano questa tappa e possono cambiare con la stagione.", plan: "La tua tappa, passo dopo passo", planBody: "Gli orari adattano l’itinerario del catalogo alla fascia scelta; verifica aperture e accessi prima di partire.", alternative: "Perché funziona l’alternativa GemGo", tradeoff: "Cosa cambia rispetto al piano originale" },
  de: { attention: "Vor der Abfahrt beachten", attentionBody: "Diese Hinweise gelten für diesen Stopp und können sich saisonal ändern.", plan: "Dein Stopp Schritt für Schritt", planBody: "Die Zeiten passen den Katalogablauf an dein Startfenster an; Öffnung und Zugang bitte vorab prüfen.", alternative: "Warum die GemGo-Alternative funktioniert", tradeoff: "Was sich gegenüber dem ursprünglichen Plan ändert" },
  fr: { attention: "À vérifier avant le départ", attentionBody: "Ces informations concernent cette étape et peuvent varier selon la saison.", plan: "Votre étape, pas à pas", planBody: "Les horaires adaptent le programme à votre créneau ; vérifiez ouvertures et accès avant le départ.", alternative: "Pourquoi l’alternative GemGo fonctionne", tradeoff: "Ce qui change par rapport au projet initial" },
  sl: { attention: "Preveri pred odhodom", attentionBody: "Te informacije veljajo za ta postanek in se lahko sezonsko spremenijo.", plan: "Tvoj postanek po korakih", planBody: "Časi prilagodijo načrt izbranemu začetku; pred odhodom preveri odpiralni čas in dostop.", alternative: "Zakaj alternativa GemGo deluje", tradeoff: "Kaj se spremeni glede na prvotni načrt" },
} as const;

const scenarioUi = {
  en: { expert: "Tourism-expert contest scenario", catalogue: "prototype catalogue locations", plus: "plus", scenarios: "team scenario places" },
  it: { expert: "Scenario del contest curato dall’esperto di turismo", catalogue: "località del catalogo prototipo", plus: "più", scenarios: "località degli scenari del team" },
  de: { expert: "Wettbewerbsszenario des Tourismusexperten", catalogue: "Orte im Prototypkatalog", plus: "plus", scenarios: "Orte aus Teamszenarien" },
  fr: { expert: "Scénario du concours validé par l’expert tourisme", catalogue: "lieux du catalogue prototype", plus: "plus", scenarios: "lieux des scénarios de l’équipe" },
  sl: { expert: "Tekmovalni scenarij turističnega strokovnjaka", catalogue: "lokacij v prototipnem katalogu", plus: "in", scenarios: "lokacij iz ekipnih scenarijev" },
} as const;

const gemDropUi = {
  en: { crowd: { low: "Low crowd", moderate: "Moderate crowd", high: "High crowd" }, bonus: "+20 GemPoints bonus" },
  it: { crowd: { low: "Poco affollata", moderate: "Affollamento moderato", high: "Molto affollata" }, bonus: "+20 GemPoints bonus" },
  de: { crowd: { low: "Wenig Andrang", moderate: "Mäßiger Andrang", high: "Hoher Andrang" }, bonus: "+20 GemPoints Bonus" },
  fr: { crowd: { low: "Faible affluence", moderate: "Affluence modérée", high: "Forte affluence" }, bonus: "+20 GemPoints de bonus" },
  sl: { crowd: { low: "Malo gneče", moderate: "Zmerna gneča", high: "Velika gneča" }, bonus: "+20 GemPoints bonusa" },
} as const;

const weatherUi = {
  en: { rain: "rain probability", unavailable: "Live weather unavailable", forecast: "Forecast", current: "Current weather", influence: "conditions influence the deterministic ranking.", fallback: "GemGo uses conservative fallback assumptions.", source: { live: "live", forecast: "forecast", unavailable: "unavailable" } },
  it: { rain: "probabilità di pioggia", unavailable: "Meteo live non disponibile", forecast: "Previsione", current: "Meteo attuale", influence: "condizioni considerate nell’ordinamento deterministico.", fallback: "GemGo usa ipotesi conservative di riserva.", source: { live: "live", forecast: "previsione", unavailable: "non disponibile" } },
  de: { rain: "Regenwahrscheinlichkeit", unavailable: "Live-Wetter nicht verfügbar", forecast: "Vorhersage", current: "Aktuelles Wetter", influence: "fließen in die deterministische Rangfolge ein.", fallback: "GemGo verwendet konservative Ersatzannahmen.", source: { live: "live", forecast: "Vorhersage", unavailable: "nicht verfügbar" } },
  fr: { rain: "probabilité de pluie", unavailable: "Météo en direct indisponible", forecast: "Prévisions", current: "Météo actuelle", influence: "prises en compte dans le classement déterministe.", fallback: "GemGo utilise des hypothèses de repli prudentes.", source: { live: "direct", forecast: "prévisions", unavailable: "indisponible" } },
  sl: { rain: "verjetnost dežja", unavailable: "Vreme v živo ni na voljo", forecast: "Napoved", current: "Trenutno vreme", influence: "vplivajo na deterministično razvrstitev.", fallback: "GemGo uporablja konservativne nadomestne predpostavke.", source: { live: "v živo", forecast: "napoved", unavailable: "ni na voljo" } },
} as const;

const promptExamples: Record<Locale, string> = {
  en: "I’m starting in Cogne, I have half a day and I’d like an easy nature experience without large crowds.",
  it: "Parto da Cogne, ho mezza giornata e vorrei un’esperienza facile nella natura senza grandi folle.",
  de: "Ich starte in Cogne, habe einen halben Tag Zeit und suche ein leichtes Naturerlebnis ohne große Menschenmengen.",
  fr: "Je pars de Cogne, j’ai une demi-journée et je cherche une expérience facile dans la nature, sans forte affluence.",
  sl: "Začenjam v Cogneju, na voljo imam pol dneva in želim lahko doživetje v naravi brez velike gneče.",
};

const systemUi = {
  en: { tripName: "Trip name", duplicated: "Trip duplicated", deleted: "Trip deleted", geoUnavailable: "Geolocation is not available on this device.", checkingLocation: "Checking your current location…", currentLocation: "Current location", distanceArea: (distance: string) => `You are about ${distance} km from the verification area.`, geoDenied: "Location permission was denied or the position could not be determined.", invalidQr: "The QR code is not valid for this demonstration.", switched: "Trip switched to the lower-pressure alternative", rewardUnlocked: (code: string) => `Demo reward unlocked: ${code}`, demoLedger: "Clearly labelled jury demo balance", rewardLedger: (label: string) => `Demo reward: ${label}`, visitLedger: (name: string, tone: string) => `Demo visit: ${name}${tone === "bonus" ? " · lower-impact bonus" : tone === "malus" ? " · mobility adjustment" : ""}`, gemDropLedger: "Accepted a lower-pressure GemDrop", badge: (title: string) => `Congratulations! Badge earned: ${title}` },
  it: { tripName: "Nome del viaggio", duplicated: "Viaggio duplicato", deleted: "Viaggio eliminato", geoUnavailable: "La geolocalizzazione non è disponibile su questo dispositivo.", checkingLocation: "Verifica della posizione attuale…", currentLocation: "Posizione attuale", distanceArea: (distance: string) => `Sei a circa ${distance} km dall’area di verifica.`, geoDenied: "Il permesso di localizzazione è stato negato o non è stato possibile determinare la posizione.", invalidQr: "Il codice QR non è valido per questa dimostrazione.", switched: "Viaggio aggiornato con l’alternativa a minore pressione", rewardUnlocked: (code: string) => `Premio demo sbloccato: ${code}`, demoLedger: "Saldo demo per la giuria chiaramente indicato", rewardLedger: (label: string) => `Premio demo: ${label}`, visitLedger: (name: string, tone: string) => `Visita demo: ${name}${tone === "bonus" ? " · bonus a minore impatto" : tone === "malus" ? " · adeguamento mobilità" : ""}`, gemDropLedger: "GemDrop a minore pressione accettato", badge: (title: string) => `Complimenti! Badge ottenuto: ${title}` },
  de: { tripName: "Reisename", duplicated: "Reise dupliziert", deleted: "Reise gelöscht", geoUnavailable: "Geolokalisierung ist auf diesem Gerät nicht verfügbar.", checkingLocation: "Aktueller Standort wird geprüft…", currentLocation: "Aktueller Standort", distanceArea: (distance: string) => `Du bist etwa ${distance} km vom Bestätigungsbereich entfernt.`, geoDenied: "Die Standortfreigabe wurde verweigert oder die Position konnte nicht bestimmt werden.", invalidQr: "Der QR-Code ist für diese Demonstration ungültig.", switched: "Reise auf die weniger belastete Alternative umgestellt", rewardUnlocked: (code: string) => `Demo-Prämie freigeschaltet: ${code}`, demoLedger: "Klar gekennzeichneter Demo-Punktestand für die Jury", rewardLedger: (label: string) => `Demo-Prämie: ${label}`, visitLedger: (name: string, tone: string) => `Demo-Besuch: ${name}${tone === "bonus" ? " · Bonus für geringere Wirkung" : tone === "malus" ? " · Mobilitätsanpassung" : ""}`, gemDropLedger: "GemDrop mit geringerem Andrang angenommen", badge: (title: string) => `Glückwunsch! Abzeichen erhalten: ${title}` },
  fr: { tripName: "Nom du voyage", duplicated: "Voyage dupliqué", deleted: "Voyage supprimé", geoUnavailable: "La géolocalisation n’est pas disponible sur cet appareil.", checkingLocation: "Vérification de votre position…", currentLocation: "Position actuelle", distanceArea: (distance: string) => `Vous êtes à environ ${distance} km de la zone de vérification.`, geoDenied: "L’autorisation de localisation a été refusée ou la position n’a pas pu être déterminée.", invalidQr: "Le code QR n’est pas valide pour cette démonstration.", switched: "Voyage remplacé par l’alternative à moindre pression", rewardUnlocked: (code: string) => `Récompense démo débloquée : ${code}`, demoLedger: "Solde démo jury clairement signalé", rewardLedger: (label: string) => `Récompense démo : ${label}`, visitLedger: (name: string, tone: string) => `Visite démo : ${name}${tone === "bonus" ? " · bonus à moindre impact" : tone === "malus" ? " · ajustement mobilité" : ""}`, gemDropLedger: "GemDrop à moindre pression accepté", badge: (title: string) => `Félicitations ! Badge obtenu : ${title}` },
  sl: { tripName: "Ime potovanja", duplicated: "Potovanje podvojeno", deleted: "Potovanje izbrisano", geoUnavailable: "Geolokacija v tej napravi ni na voljo.", checkingLocation: "Preverjanje trenutne lokacije…", currentLocation: "Trenutna lokacija", distanceArea: (distance: string) => `Od območja potrditve ste oddaljeni približno ${distance} km.`, geoDenied: "Dovoljenje za lokacijo je bilo zavrnjeno ali položaja ni bilo mogoče določiti.", invalidQr: "QR-koda ni veljavna za to predstavitev.", switched: "Potovanje preusmerjeno na manj obremenjeno alternativo", rewardUnlocked: (code: string) => `Predstavitvena nagrada odklenjena: ${code}`, demoLedger: "Jasno označeno predstavitveno stanje za žirijo", rewardLedger: (label: string) => `Predstavitvena nagrada: ${label}`, visitLedger: (name: string, tone: string) => `Predstavitveni obisk: ${name}${tone === "bonus" ? " · bonus za manjši vpliv" : tone === "malus" ? " · prilagoditev mobilnosti" : ""}`, gemDropLedger: "Sprejet GemDrop z manjšo obremenitvijo", badge: (title: string) => `Čestitamo! Pridobljena značka: ${title}` },
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
  { id: "culture", label: "Culture" },
  { id: "castle", label: "Castles" },
  { id: "museum", label: "Museums" },
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

const formatDateTime = (value: string | undefined, locale: Locale) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const estimateLegMinutes = (
  from: Experience,
  to: Experience,
  mode: TransportMode,
) => {
  const distance = haversineKm(
    { label: from.name, lat: from.latitude, lng: from.longitude },
    to,
  );
  const profiles: Record<TransportMode, { speed: number; overhead: number }> = {
    walking: { speed: 4.5, overhead: 0 },
    bicycle: { speed: 16, overhead: 4 },
    public: { speed: 28, overhead: 22 },
    car: { speed: 52, overhead: 8 },
    mixed: { speed: 23, overhead: 16 },
  };
  const profile = profiles[mode];
  return Math.max(5, Math.round((distance / profile.speed) * 60 + profile.overhead));
};

const googleMapsDirectionsUrl = (
  destination: Experience,
  mode: TransportMode,
  origin?: Experience,
) => {
  const travelMode: Record<TransportMode, string> = {
    walking: "walking",
    bicycle: "bicycling",
    public: "transit",
    car: "driving",
    mixed: "transit",
  };
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: travelMode[mode],
  });
  if (origin) params.set("origin", `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const mobilityAdjustment = (
  planned: TransportMode,
  actual?: TransportMode,
) => {
  if (!actual || planned === actual) return { tone: "standard" as const };
  const impact: Record<TransportMode, number> = {
    walking: 0,
    bicycle: 1,
    public: 2,
    mixed: 2,
    car: 3,
  };
  if (impact[actual] < impact[planned]) return { tone: "bonus" as const };
  return { tone: "malus" as const };
};

const overlap = (first: ExperienceKind[], second: ExperienceKind[]) =>
  first.some((item) => second.includes(item));
const compactUiTranslations: Record<"de" | "fr" | "sl", Record<string, string>> = {
  de: {
    "A comparable alternative is available. You remain in control.": "Eine vergleichbare Alternative ist verfügbar. Du behältst die Kontrolle.",
    "A recommendation derived from your real constraints": "Eine Empfehlung aus deinen tatsächlichen Vorgaben",
    "Action restored": "Aktion wiederhergestellt",
    "Add to My Trip": "Zu meiner Reise hinzufügen",
    "Alpine stops": "Alpenstopps",
    "Alternative": "Alternative",
    "Back to alternatives": "Zurück zu den Alternativen",
    "Best lower-pressure window:": "Bestes Zeitfenster mit geringerem Andrang:",
    "Checks whether you are within 2 km of": "Prüft, ob du höchstens 2 km entfernt bist von",
    "Close expanded map": "Vergrößerte Karte schließen",
    "Compatible and more transparent": "Passend und transparenter",
    "Complete an Alpine region": "Eine Alpenregion vervollständigen",
    "Contextual GemDrop": "Situativer GemDrop",
    "Crowd rising": "Zunehmender Andrang",
    "Demo GemPoints added": "Demo-GemPoints hinzugefügt",
    "Demo balance is already ready": "Der Demo-Punktestand ist bereits bereit",
    "Every verified visit advances the matching place, lake and castle collections. Categories appear only where the catalogue contains at least one qualifying place.": "Jeder bestätigte Besuch erweitert die passenden Orts-, Seen- und Burgsammlungen. Kategorien erscheinen nur, wenn der Katalog mindestens einen passenden Ort enthält.",
    "GemGo alternative": "GemGo-Alternative",
    "Higher expected pressure": "Höherer erwarteter Besucherdruck",
    "Honest comparison": "Transparenter Vergleich",
    "Keep original plan": "Ursprünglichen Plan behalten",
    "List": "Liste",
    "Live route times where available": "Live-Routenzeiten, sofern verfügbar",
    "Local benefit": "Lokaler Nutzen",
    "Map": "Karte",
    "Map areas": "Kartenbereiche",
    "More lakes": "Mehr Seen",
    "New active trip": "Neue aktive Reise",
    "New badge earned": "Neues Abzeichen erhalten",
    "No saved places yet": "Noch keine Orte gespeichert",
    "No saved trips": "Keine gespeicherten Reisen",
    "Operational information": "Praktische Informationen",
    "Original plan": "Ursprünglicher Plan",
    "Partner QR code": "QR-Code des Partners",
    "Popular destination": "Beliebtes Reiseziel",
    "Regional collections": "Regionale Sammlungen",
    "Restore original plan": "Ursprünglichen Plan wiederherstellen",
    "Restore trip": "Reise wiederherstellen",
    "Results view": "Ergebnisansicht",
    "Route and mobility": "Route und Mobilität",
    "Safety and limits": "Sicherheit und Grenzen",
    "Save for later": "Für später speichern",
    "Saved Alpine places": "Gespeicherte Alpenorte",
    "Saved ideas and active operational plans now live in one place.": "Gespeicherte Ideen und aktive Reisepläne befinden sich jetzt an einem Ort.",
    "Show another alternative": "Weitere Alternative anzeigen",
    "Show more compatible results": "Mehr passende Ergebnisse anzeigen",
    "Show only the top three": "Nur die besten drei anzeigen",
    "Standard reward": "Standardprämie",
    "Starting from": "Start in",
    "Switch my trip": "Meine Reise ändern",
    "This area is becoming crowded": "In diesem Gebiet nimmt der Andrang zu",
    "Unavailable": "Nicht verfügbar",
    "Updated": "Aktualisiert",
    "Use clearly labelled demo verification": "Klar gekennzeichnete Demo-Bestätigung verwenden",
    "Verification awards points and measures whether recommendations redistribute flows without retaining a detailed movement history.": "Die Bestätigung vergibt Punkte und misst, ob Empfehlungen Besucherströme verteilen, ohne einen detaillierten Bewegungsverlauf zu speichern.",
    "Verify code": "Code bestätigen",
    "Verify current location": "Aktuellen Standort bestätigen",
    "Verify your visit": "Besuch bestätigen",
    "Why this fits you": "Warum das zu dir passt",
    "best window": "bestes Zeitfenster",
    "crowd": "Andrang",
    "distinct recommendation roles": "unterschiedliche Empfehlungsrollen",
    "duration": "Dauer",
    "stops": "Stopps",
    "travel time": "Reisezeit",
  },
  fr: {
    "A comparable alternative is available. You remain in control.": "Une alternative comparable est disponible. Vous gardez le contrôle.",
    "A recommendation derived from your real constraints": "Une recommandation fondée sur vos contraintes réelles",
    "Action restored": "Action restaurée",
    "Add to My Trip": "Ajouter à mon voyage",
    "Alpine stops": "étapes alpines",
    "Alternative": "Alternative",
    "Back to alternatives": "Retour aux alternatives",
    "Best lower-pressure window:": "Meilleur créneau à moindre affluence :",
    "Checks whether you are within 2 km of": "Vérifie que vous êtes à moins de 2 km de",
    "Close expanded map": "Fermer la carte agrandie",
    "Compatible and more transparent": "Compatible et plus transparent",
    "Complete an Alpine region": "Compléter une région alpine",
    "Contextual GemDrop": "GemDrop contextuel",
    "Crowd rising": "Affluence en hausse",
    "Demo GemPoints added": "GemPoints de démonstration ajoutés",
    "Demo balance is already ready": "Le solde de démonstration est déjà prêt",
    "Every verified visit advances the matching place, lake and castle collections. Categories appear only where the catalogue contains at least one qualifying place.": "Chaque visite vérifiée fait progresser les collections de lieux, lacs et châteaux correspondantes. Une catégorie n’apparaît que si le catalogue contient au moins un lieu admissible.",
    "GemGo alternative": "Alternative GemGo",
    "Higher expected pressure": "Pression attendue plus forte",
    "Honest comparison": "Comparaison transparente",
    "Keep original plan": "Conserver le projet initial",
    "List": "Liste",
    "Live route times where available": "Durées d’itinéraire en direct si disponibles",
    "Local benefit": "Bénéfice local",
    "Map": "Carte",
    "Map areas": "Zones de la carte",
    "More lakes": "Plus de lacs",
    "New active trip": "Nouveau voyage actif",
    "New badge earned": "Nouveau badge obtenu",
    "No saved places yet": "Aucun lieu enregistré",
    "No saved trips": "Aucun voyage enregistré",
    "Operational information": "Informations pratiques",
    "Original plan": "Projet initial",
    "Partner QR code": "Code QR du partenaire",
    "Popular destination": "Destination populaire",
    "Regional collections": "Collections régionales",
    "Restore original plan": "Restaurer le projet initial",
    "Restore trip": "Restaurer le voyage",
    "Results view": "Affichage des résultats",
    "Route and mobility": "Itinéraire et mobilité",
    "Safety and limits": "Sécurité et limites",
    "Save for later": "Enregistrer pour plus tard",
    "Saved Alpine places": "Lieux alpins enregistrés",
    "Saved ideas and active operational plans now live in one place.": "Les idées enregistrées et les voyages actifs sont maintenant réunis au même endroit.",
    "Show another alternative": "Afficher une autre alternative",
    "Show more compatible results": "Afficher plus de résultats compatibles",
    "Show only the top three": "Afficher seulement les trois premiers",
    "Standard reward": "Récompense standard",
    "Starting from": "Départ de",
    "Switch my trip": "Modifier mon voyage",
    "This area is becoming crowded": "Cette zone devient fréquentée",
    "Unavailable": "Indisponible",
    "Updated": "Mis à jour",
    "Use clearly labelled demo verification": "Utiliser la vérification démo clairement signalée",
    "Verification awards points and measures whether recommendations redistribute flows without retaining a detailed movement history.": "La vérification attribue des points et mesure la redistribution des flux sans conserver un historique détaillé des déplacements.",
    "Verify code": "Vérifier le code",
    "Verify current location": "Vérifier la position actuelle",
    "Verify your visit": "Vérifier votre visite",
    "Why this fits you": "Pourquoi ce choix vous correspond",
    "best window": "meilleur créneau",
    "crowd": "affluence",
    "distinct recommendation roles": "rôles de recommandation distincts",
    "duration": "durée",
    "stops": "étapes",
    "travel time": "temps de trajet",
  },
  sl: {
    "A comparable alternative is available. You remain in control.": "Na voljo je primerljiva alternativa. Odločitev ostaja vaša.",
    "A recommendation derived from your real constraints": "Priporočilo na podlagi vaših dejanskih omejitev",
    "Action restored": "Dejanje je obnovljeno",
    "Add to My Trip": "Dodaj v moje potovanje",
    "Alpine stops": "alpski postanki",
    "Alternative": "Alternativa",
    "Back to alternatives": "Nazaj k alternativam",
    "Best lower-pressure window:": "Najboljši čas z manjšo obremenitvijo:",
    "Checks whether you are within 2 km of": "Preveri, ali ste največ 2 km oddaljeni od",
    "Close expanded map": "Zapri povečan zemljevid",
    "Compatible and more transparent": "Ustrezno in preglednejše",
    "Complete an Alpine region": "Dokončaj alpsko regijo",
    "Contextual GemDrop": "Kontekstualni GemDrop",
    "Crowd rising": "Gneča narašča",
    "Demo GemPoints added": "Predstavitveni GemPoints dodani",
    "Demo balance is already ready": "Predstavitveno stanje je že pripravljeno",
    "Every verified visit advances the matching place, lake and castle collections. Categories appear only where the catalogue contains at least one qualifying place.": "Vsak potrjen obisk napreduje v ustrezni zbirki krajev, jezer in gradov. Kategorija se prikaže le, če katalog vsebuje vsaj en ustrezen kraj.",
    "GemGo alternative": "Alternativa GemGo",
    "Higher expected pressure": "Pričakovana večja obremenitev",
    "Honest comparison": "Pregledna primerjava",
    "Keep original plan": "Ohrani prvotni načrt",
    "List": "Seznam",
    "Live route times where available": "Časi poti v živo, kjer so na voljo",
    "Local benefit": "Lokalna korist",
    "Map": "Zemljevid",
    "Map areas": "Območja zemljevida",
    "More lakes": "Več jezer",
    "New active trip": "Novo aktivno potovanje",
    "New badge earned": "Pridobljena nova značka",
    "No saved places yet": "Ni še shranjenih krajev",
    "No saved trips": "Ni shranjenih potovanj",
    "Operational information": "Praktične informacije",
    "Original plan": "Prvotni načrt",
    "Partner QR code": "QR-koda partnerja",
    "Popular destination": "Priljubljena destinacija",
    "Regional collections": "Regionalne zbirke",
    "Restore original plan": "Obnovi prvotni načrt",
    "Restore trip": "Obnovi potovanje",
    "Results view": "Prikaz rezultatov",
    "Route and mobility": "Pot in mobilnost",
    "Safety and limits": "Varnost in omejitve",
    "Save for later": "Shrani za pozneje",
    "Saved Alpine places": "Shranjeni alpski kraji",
    "Saved ideas and active operational plans now live in one place.": "Shranjene zamisli in aktivni načrti potovanj so zdaj zbrani na enem mestu.",
    "Show another alternative": "Prikaži drugo alternativo",
    "Show more compatible results": "Prikaži več ustreznih rezultatov",
    "Show only the top three": "Prikaži le prve tri",
    "Standard reward": "Standardna nagrada",
    "Starting from": "Začetek v",
    "Switch my trip": "Spremeni moje potovanje",
    "This area is becoming crowded": "Na tem območju narašča gneča",
    "Unavailable": "Ni na voljo",
    "Updated": "Posodobljeno",
    "Use clearly labelled demo verification": "Uporabi jasno označeno predstavitveno potrditev",
    "Verification awards points and measures whether recommendations redistribute flows without retaining a detailed movement history.": "Potrditev dodeli točke in meri prerazporeditev tokov brez shranjevanja podrobne zgodovine gibanja.",
    "Verify code": "Potrdi kodo",
    "Verify current location": "Potrdi trenutno lokacijo",
    "Verify your visit": "Potrdi obisk",
    "Why this fits you": "Zakaj vam ustreza",
    "best window": "najboljši čas",
    "crowd": "gneča",
    "distinct recommendation roles": "različne vloge priporočil",
    "duration": "trajanje",
    "stops": "postanki",
    "travel time": "čas poti",
  },
};
const tr = (locale: Locale, english: string, italian: string) => {
  if (locale === "it") return italian;
  if (locale === "en") return english;
  return compactUiTranslations[locale][english] ?? english;
};
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
  const auth = useAuth();
  const persistenceIdentity = auth.user?.id ?? "guest";

  return (
    <IntegratedAppShellForIdentity
      key={persistenceIdentity}
      auth={auth}
      persistenceIdentity={persistenceIdentity}
    />
  );
}

function IntegratedAppShellForIdentity({
  auth,
  persistenceIdentity,
}: {
  auth: ReturnType<typeof useAuth>;
  persistenceIdentity: string;
}) {
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
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [collectionTargetTripId, setCollectionTargetTripId] = useState("active");
  const [activeTrip, setActiveTrip] = useState<SavedTrip | null>(null);
  const [buildingTripId, setBuildingTripId] = useState<string | null>(null);
  const [maxLegMinutes, setMaxLegMinutes] = useState(90);
  const [legTransport, setLegTransport] = useState<TransportMode>("car");
  const [originMode, setOriginMode] = useState<"far" | "gps" | "place">("far");
  const [originMessage, setOriginMessage] = useState("");
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [ledger, setLedger] = useState<GemPointEvent[]>([]);
  const [unlocks, setUnlocks] = useState<RewardUnlock[]>([]);
  const [rewardReceipt, setRewardReceipt] = useState<{ unlock: RewardUnlock; label: string } | null>(null);
  const [gemDropOpen, setGemDropOpen] = useState(false);
  const [verificationExperienceId, setVerificationExperienceId] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [toast, setToast] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [activeTransitPlan, setActiveTransitPlan] =
    useState<TransitAccessPlan | null>(null);
  const [interpretationSummary, setInterpretationSummary] = useState("");
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [conditionReminderVisible, setConditionReminderVisible] = useState(false);
  const [toastAction, setToastAction] = useState<"condition" | null>(null);
  const [hydratedPersistenceIdentity, setHydratedPersistenceIdentity] = useState<string | null>(null);

  const [tripMapExpanded, setTripMapExpanded] = useState(false);
  const [floatingTarget, setFloatingTarget] = useState<HTMLElement | null>(null);
  const [isProcessing, startProcessing] = useTransition();

  useEffect(() => {
    const examples = Object.values(promptExamples);
    setPromptDraft((current) => examples.includes(current) ? promptExamples[locale] : current);
    setPreferences((current) => examples.includes(current.prompt) ? { ...current, prompt: promptExamples[locale] } : current);
  }, [locale]);

  const t = copy[locale];
  const u = panUi[locale];
  const plannerText = plannerCopy[locale];
  const mvp = mvpCopy[locale];
  const activityText = activityCopy[locale];
  const originExperience = useMemo(
    () =>
      allExperiences.find(
        (experience) => experience.id === originExperienceId,
      ) ?? defaultOrigin,
    [defaultOrigin, originExperienceId],
  );
  const origin = useMemo(
    () =>
      originMode !== "far" && originExperience
        ? {
            label: originExperience.name,
            lat: originExperience.latitude,
            lng: originExperience.longitude,
          }
        : null,
    [originExperience, originMode],
  );
  const originStatus = origin ? "ready" : "not-found";
  const activeExperienceIds = useMemo(
    () => tripExperienceIds(activeTrip),
    [activeTrip],
  );
  const activeExperiences = useMemo(
    () =>
      activeExperienceIds
        .map((id) => allExperiences.find((experience) => experience.id === id))
        .filter((experience): experience is Experience => Boolean(experience)),
    [activeExperienceIds],
  );
  const activeExperience = activeExperiences.at(-1) ?? null;
  const activeTripTransport =
    activeTrip?.trip.legTransport ?? activeTrip?.preferences.transport ?? preferences.transport;
  const activeLegMinutes = activeExperiences.slice(1).map((experience, index) =>
    estimateLegMinutes(activeExperiences[index], experience, activeTripTransport),
  );
  const verificationExperience =
    activeExperiences.find((experience) => experience.id === verificationExperienceId) ?? null;
  const verifiedExperienceIds = new Set(
    activeTrip?.trip.verifiedExperienceIds ??
      (activeTrip?.trip.verified && activeTrip.trip.experienceId
        ? [activeTrip.trip.experienceId]
        : []),
  );
  const isBuildingTrip = Boolean(
    buildingTripId && activeTrip?.id === buildingTripId,
  );
  const tripPlanningOrigin = isBuildingTrip ? activeExperience : null;
  const tripPlanningName = tripPlanningOrigin?.name ?? "";
  const tripPlanningLat = tripPlanningOrigin?.latitude ?? null;
  const tripPlanningLng = tripPlanningOrigin?.longitude ?? null;
  const recommendationOrigin = useMemo(
    () =>
      tripPlanningLat !== null && tripPlanningLng !== null
        ? {
            label: tripPlanningName,
            lat: tripPlanningLat,
            lng: tripPlanningLng,
          }
        : origin,
    [origin, tripPlanningLat, tripPlanningLng, tripPlanningName],
  );
  const rankingPreferences = useMemo(
    () =>
      isBuildingTrip
        ? {
            ...preferences,
            maxTravelMinutes: maxLegMinutes,
            transport: legTransport,
          }
        : preferences,
    [isBuildingTrip, legTransport, maxLegMinutes, preferences],
  );
  const activeCuratedScenario = useMemo(
    () => curatedScenarioFor(rankingPreferences),
    [rankingPreferences],
  );
  const weather = useLiveWeather(
    recommendationOrigin,
    rankingPreferences.startsAt,
  );

  const initialRanked = useMemo(
    () =>
      rankExperiences(allExperiences, rankingPreferences, {
        origin: recommendationOrigin,
        weather,
      }).filter(
        (item) => !activeExperienceIds.includes(item.experience.id),
      ),
    [activeExperienceIds, rankingPreferences, recommendationOrigin, weather],
  );
  const roadCandidates = useMemo(
    () =>
      stage === "brief"
        ? EMPTY_EXPERIENCES
        : initialRanked.slice(0, 3).map((item) => item.experience),
    [initialRanked, stage],
  );
  const routeTimes = useRoadTimes(
    recommendationOrigin,
    roadCandidates,
    rankingPreferences.transport,
  );
  const ranked = useMemo(
    () =>
      rankExperiences(allExperiences, rankingPreferences, {
        origin: recommendationOrigin,
        weather,
        routeTimes,
      }).filter((item) => !activeExperienceIds.includes(item.experience.id)),
    [activeExperienceIds, rankingPreferences, recommendationOrigin, routeTimes, weather],
  );

  const selected =
    allExperiences.find((experience) => experience.id === selectedId) ??
    ranked[0]?.experience ??
    allExperiences[0];
  const selectedRoute = useSelectedRoute(
    recommendationOrigin,
    stage === "brief" ? null : (selected ?? null),
    rankingPreferences.transport,
  );
  const activeRoute = useSelectedRoute(
    activeExperiences.length > 1
      ? {
          label: activeExperiences.at(-2)?.name ?? "Previous stop",
          lat: activeExperiences.at(-2)?.latitude ?? activeExperience?.latitude ?? 0,
          lng: activeExperiences.at(-2)?.longitude ?? activeExperience?.longitude ?? 0,
        }
      : origin,
    section === "trip" ? activeExperience : null,
    activeTrip?.preferences.transport ?? preferences.transport,
  );
  const balance = pointBalance(ledger);
  const displayedBalance = auth.user ? auth.verifiedBalance : balance;
  const nearbyWaterAvailable = Boolean(
    activeExperience &&
      allExperiences.some(
        (experience) =>
          experience.id !== activeExperience.id &&
          experience.region === activeExperience.region &&
          experience.kind.includes("water") &&
          haversineKm(
            {
              label: activeExperience.name,
              lat: activeExperience.latitude,
              lng: activeExperience.longitude,
            },
            experience,
          ) <= 55,
      ),
  );

  const moreResults = useMemo(() => {
    const selectedIds = new Set(ranked.map((item) => item.experience.id));
    return getEligibleExperiences(allExperiences, rankingPreferences, {
      origin: recommendationOrigin,
      routeTimes,
    })
      .filter(
        (experience) =>
          !selectedIds.has(experience.id) &&
          !activeExperienceIds.includes(experience.id) &&
          overlap(experience.kind, rankingPreferences.kinds),
      )
      .slice(0, 6);
  }, [activeExperienceIds, ranked, rankingPreferences, recommendationOrigin, routeTimes]);

  const visibleResultExperiences = useMemo(
    () => [
      ...ranked.map((item) => item.experience),
      ...(showMore ? moreResults : EMPTY_EXPERIENCES),
    ],
    [moreResults, ranked, showMore],
  );
  const resultMapExperiences = useMemo(
    () =>
      [...new Map(
        [...visibleResultExperiences, ...activeExperiences].map((experience) => [
          experience.id,
          experience,
        ]),
      ).values()],
    [activeExperiences, visibleResultExperiences],
  );

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
    queueMicrotask(() => setFloatingTarget(document.body));
  }, []);

  const canPersist =
    !auth.loading && hydratedPersistenceIdentity === persistenceIdentity;

  useEffect(() => {
    if (auth.loading) return;
    const trips = loadSavedTrips();
    const active = loadActiveTrip();
    const migrated = migrateLegacyTrip(defaultPreferences);
    setSavedTrips(trips.length ? trips : migrated ? [migrated] : []);
    setActiveTrip(active ?? migrated);
    setLedger(loadLedger());
    setUnlocks(loadRewardUnlocks());
    setCollections(loadCollections());
    setPreferences((current) => {
      if (current.startsAt && current.endsAt) return current;
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start);
      end.setHours(17, 0, 0, 0);
      const localInput = (date: Date) => {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      };
      return { ...current, startsAt: localInput(start), endsAt: localInput(end) };
    });
    setHydratedPersistenceIdentity(persistenceIdentity);
  }, [auth.loading, persistenceIdentity]);

  useEffect(() => {
    if (!canPersist) return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared");
    if (!shared) return;
    const imported = decodeSharedTrip(shared);
    if (!imported) {
      setToast(mvp.invalidShare);
      return;
    }
    setSavedTrips((current) => [imported, ...current]);
    setActiveTrip(imported);
    setBuildingTripId(imported.id);
    setSection("trip");
    setTripMode("active");
    setToast(mvp.shared);
    window.history.replaceState(null, "", appPath.trip);
  }, [canPersist, mvp.invalidShare, mvp.shared]);

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
        setTripMode(path.endsWith("/saved") ? "saved" : params.get("view") === "collections" ? "collections" : "active");
        if (params.get("condition") === "1") {
          setConditionReminderVisible(true);
          setConditionModalOpen(true);
        }
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
    if (section !== "trip" || !activeExperience) {
      queueMicrotask(() =>
        setActiveTransitPlan((current) => (current ? null : current)),
      );
      return;
    }
    let active = true;
    import("../product/transit").then(({ transitAccessPlan }) => {
      if (active) setActiveTransitPlan(transitAccessPlan(activeExperience, origin));
    });
    return () => {
      active = false;
    };
  }, [activeExperience, origin, section]);

  useEffect(() => {
    if (canPersist) saveTrips(savedTrips);
  }, [canPersist, savedTrips]);
  useEffect(() => {
    if (canPersist) saveCollections(collections);
  }, [canPersist, collections]);
  useEffect(() => {
    if (canPersist) saveActiveTrip(activeTrip);
  }, [activeTrip, canPersist]);
  useEffect(() => {
    if (canPersist) saveLedger(ledger);
  }, [canPersist, ledger]);
  useEffect(() => {
    if (canPersist) saveRewardUnlocks(unlocks);
  }, [canPersist, unlocks]);

  useEffect(() => {
    if (!activeTrip || !("caches" in window)) return;
    caches
      .open("gemgo-trip-essentials-v2")
      .then((cache) =>
        cache.addAll([
          "/app/explore",
          "/app/results",
          "/app/my-trip",
          "/app/gempoints",
          "/manifest.webmanifest",
        ]),
      )
      .catch(() => {
        // Offline support remains best-effort on restricted browsers.
      });
  }, [activeTrip]);

  useEffect(() => {
    if (!activeTrip || tripExperienceIds(activeTrip).length === 0) return;
    const notificationId = `condition-${activeTrip.id}`;
    const firedKey = `gemgo-condition-fired-${activeTrip.id}`;
    if (window.localStorage.getItem(firedKey) === "1") {
      if (loadStoredNotifications().some((item) => item.id === notificationId)) {
        queueMicrotask(() => setConditionReminderVisible(true));
      }
      return;
    }
    const delay = 30000 + Math.round(Math.random() * 30000);
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(firedKey, "1");
      upsertStoredNotification({
        id: notificationId,
        title: mvp.conditionTitle,
        detail: mvp.conditionReminder,
        createdAt: new Date().toISOString(),
        kind: "alert",
        href: `${appPath.trip}?condition=1`,
      });
      setConditionReminderVisible(true);
      setToastAction("condition");
      setToast(mvp.conditionReminder);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [activeTrip, mvp.conditionReminder, mvp.conditionTitle]);

  useEffect(() => {
    if (!toast) return;
    const tone =
      /denied|unavailable|not available|invalid|could not|error/i.test(toast)
        ? "error"
        : /verified|saved|added|switched|unlocked|duplicated|congratulations|salvat|aggiunt|verificat|duplicat|gespeichert|hinzugef|bestätigt|enregistr|ajout|vérifi|shranj|dodan|potrjen/i.test(
              toast,
            )
          ? "success"
          : "info";
    window.dispatchEvent(new CustomEvent("gemgo:ui-sound", { detail: tone }));
    const timer = window.setTimeout(() => {
      setToast("");
      setToastAction(null);
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
      next === "saved"
        ? appPath.savedTrips
        : next === "collections"
          ? `${appPath.trip}?view=collections`
          : appPath.trip,
    );
  };

  const updatePreference = <K extends keyof SearchPreferences>(
    key: K,
    value: SearchPreferences[K],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const interpretedPreferences = () => {
    const interpreted = applyPromptToPreferences(promptDraft, {
      ...preferences,
      prompt: promptDraft,
    });
    const explicitOrigin = allExperiences.find((experience) => {
      const target = interpreted.origin.toLocaleLowerCase();
      const name = experience.name.toLocaleLowerCase();
      return name === target || name.includes(target) || target.includes(name);
    });
    const nextOriginExperience = explicitOrigin ?? originExperience;
    if (explicitOrigin) {
      setOriginExperienceId(explicitOrigin.id);
      setOriginMode("place");
      setOriginMessage(`${mvp.inside} ${explicitOrigin.name}`);
    }
    return {
      preferences: {
        ...interpreted,
        origin: explicitOrigin?.name ?? interpreted.origin,
        originMode: explicitOrigin ? "place" : originMode,
      },
      origin: (Boolean(explicitOrigin) || originMode !== "far") && nextOriginExperience
        ? {
            label: nextOriginExperience.name,
            lat: nextOriginExperience.latitude,
            lng: nextOriginExperience.longitude,
          }
        : origin,
    };
  };

  const interpretPrompt = () => {
    startProcessing(() => {
      const interpreted = interpretedPreferences();
      setPreferences(interpreted.preferences);
      const kindSummary = interpreted.preferences.requiredKinds
        .map((kind) => kindLabel(locale, kind))
        .join(", ");
      setInterpretationSummary(
        [
          interpreted.preferences.region ?? t.allRegions,
          u[interpreted.preferences.availableTime],
          kindSummary,
          interpreted.preferences.avoidCrowds ? t.quiet : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    });
  };

  const search = () => {
    const interpreted = interpretedPreferences();
    setPreferences(interpreted.preferences);
    const nextRanked = rankExperiences(
      allExperiences,
      interpreted.preferences,
      {
      origin: interpreted.origin,
      weather,
      routeTimes,
      },
    );
    if (nextRanked[0]) setSelectedId(nextRanked[0].experience.id);
    startProcessing(() => chooseExploreStage("results"));
  };

  const changeOrigin = (experienceId: string) => {
    const experience = allExperiences.find((item) => item.id === experienceId);
    if (!experience) return;
    setOriginExperienceId(experienceId);
    setOriginMode("place");
    setOriginMessage(`${mvp.inside} ${experience.name}`);
    setPreferences((current) => ({
      ...current,
      origin: experience.name,
      region: experience.region as SearchPreferences["region"],
    }));
  };

  const changeRegion = (region: SearchPreferences["region"]) => {
    setPreferences((current) => ({ ...current, region }));
  };

  const detectOrigin = () => {
    setOriginMode("gps");
    setLocatingOrigin(true);
    setOriginMessage(mvp.locating);
    if (!navigator.geolocation) {
      setOriginMode("far");
      setLocatingOrigin(false);
      setOriginMessage(mvp.outside);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          label: "GPS",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const nearest = [...allExperiences].sort(
          (first, second) => haversineKm(current, first) - haversineKm(current, second),
        )[0];
        const distance = nearest ? haversineKm(current, nearest) : Number.POSITIVE_INFINITY;
        if (!nearest || distance > 120) {
          setOriginMode("far");
          setOriginMessage(mvp.outside);
        } else {
          setOriginExperienceId(nearest.id);
          setOriginMode("gps");
          setOriginMessage(`${mvp.inside} ${nearest.name}`);
          setPreferences((currentPreferences) => ({
            ...currentPreferences,
            origin: nearest.name,
            originMode: "gps",
            region: nearest.region as SearchPreferences["region"],
          }));
        }
        setLocatingOrigin(false);
      },
      () => {
        setOriginMode("far");
        setLocatingOrigin(false);
        setOriginMessage(mvp.outside);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const focusMapRegion = (region: PilotRegion) => {
    setMapFocus((current) => ({
      region,
      requestId: current.requestId + 1,
    }));
  };

  const saveToCollection = (experience: Experience) => {
    const wasSaved = collections.some((collection) =>
      collection.experienceIds.includes(experience.id),
    );
    setCollections((current) =>
      toggleExperienceInCollection(current, experience.id, experience.region),
    );
    setToast(
      wasSaved
        ? mvp.removedCollection(experience.region)
        : mvp.savedCollection(experience.region),
    );
  };

  const addToTrip = (experience: Experience) => {
    let added = false;
    if (activeTrip && buildingTripId === activeTrip.id) {
      const ids = tripExperienceIds(activeTrip);
      if (!ids.includes(experience.id)) {
        const next: SavedTrip = {
          ...activeTrip,
          updatedAt: new Date().toISOString(),
          trip: {
            ...activeTrip.trip,
            experienceId: experience.id,
            experienceIds: [...ids, experience.id],
            maxLegMinutes,
            legTransport,
          },
        };
        updateActive(next);
        added = true;
      }
    } else {
      const trip = createSavedTrip(
        experience.id,
        `${experience.region} · ${new Date().toLocaleDateString(locale)}`,
        { ...preferences, maxTravelMinutes: maxLegMinutes, transport: legTransport },
        preferences.startsAt || preferences.availableFrom || "09:00",
      );
      setSavedTrips((current) => [trip, ...current]);
      setActiveTrip(trip);
      setBuildingTripId(trip.id);
      added = true;
    }
    if (added) {
      const notificationCreatedAt = new Date().toISOString();
      upsertStoredNotification({
        id: `trip-stop-${experience.id}-${notificationCreatedAt}`,
        title: mvp.addedTrip,
        detail: experience.name,
        createdAt: notificationCreatedAt,
        kind: "trip",
        href: appPath.trip,
      });
    }
    setToast(mvp.addedTrip);
    setSelectedId(experience.id);
    chooseExploreStage("results");
  };

  const addCollectionExperienceToTrip = (experience: Experience) => {
    const target =
      collectionTargetTripId === "active"
        ? activeTrip
        : savedTrips.find((trip) => trip.id === collectionTargetTripId) ?? null;
    if (!target) {
      addToTrip(experience);
      return;
    }
    const ids = tripExperienceIds(target);
    if (ids.includes(experience.id)) {
      setToast(mvp.addedTrip);
      return;
    }
    const next: SavedTrip = {
      ...target,
      updatedAt: new Date().toISOString(),
      trip: {
        ...target.trip,
        experienceId: experience.id,
        experienceIds: [...ids, experience.id],
      },
    };
    setSavedTrips((current) =>
      current.map((trip) => (trip.id === next.id ? next : trip)),
    );
    if (activeTrip?.id === next.id || collectionTargetTripId === "active") {
      setActiveTrip(next);
    }
    setToast(mvp.addedTrip);
  };

  const saveIdea = (experience: Experience, activate = false) => {
    if (!activate) {
      saveToCollection(experience);
      return;
    }
    addToTrip(experience);
  };

  const shareTrip = async (trip: SavedTrip) => {
    const url = new URL(window.location.origin + appPath.trip);
    url.searchParams.set("shared", encodeSharedTrip(trip));
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast(mvp.copied);
    } catch {
      setToast(url.toString());
    }
  };

  const refineTrip = (kind: "shorter" | "quiet" | "culture" | "easy" | "water") => {
    if (kind === "shorter") setMaxLegMinutes((value) => Math.max(15, value - 30));
    if (kind === "quiet") updatePreference("avoidCrowds", true);
    if (kind === "culture") {
      updatePreference("kinds", [
        ...new Set<ExperienceKind>([...preferences.kinds, "culture"]),
      ]);
    }
    if (kind === "water") {
      updatePreference("kinds", [
        ...new Set<ExperienceKind>([...preferences.kinds, "water"]),
      ]);
    }
    if (kind === "easy") updatePreference("difficulty", "easy");
    setBuildingTripId(activeTrip?.id ?? null);
    chooseExploreStage("results");
  };

  const updateActive = (next: SavedTrip) => {
    setActiveTrip(next);
    setSavedTrips((current) =>
      current.map((trip) => (trip.id === next.id ? next : trip)),
    );
  };

  const updateActiveTripTransport = (transport: TransportMode) => {
    setLegTransport(transport);
    if (!activeTrip) return;
    updateActive({
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      preferences: { ...activeTrip.preferences, transport },
      trip: { ...activeTrip.trip, legTransport: transport },
    });
  };

  const renameTrip = (trip: SavedTrip) => {
    const name = window.prompt(systemUi[locale].tripName, trip.name)?.trim();
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
    setToast(systemUi[locale].duplicated);
  };

  const deleteTrip = (trip: SavedTrip) => {
    setUndoSnapshot({
      savedTrips,
      activeTrip,
      label: tr(locale, "Restore trip", "Ripristina viaggio"),
    });
    setSavedTrips((current) => current.filter((item) => item.id !== trip.id));
    if (activeTrip?.id === trip.id) setActiveTrip(null);
    setToast(systemUi[locale].deleted);
  };

  const completeVerification = (
    status: "demo" | "verified",
    options: {
      source?: "gps" | "qr" | "manual-demo" | "activity-demo";
      provider?: ActivityProvider;
      actualTransport?: TransportMode;
    } = {},
  ) => {
    const experience = verificationExperience;
    if (!activeTrip || !experience || verifiedExperienceIds.has(experience.id)) return;
    const plannedTransport = activeTrip.trip.legTransport ?? activeTrip.preferences.transport;
    const adjustment = mobilityAdjustment(plannedTransport, options.actualTransport);
    const actualTransport = options.actualTransport ?? plannedTransport;
    const pointsBreakdown = calculateVisitPoints(experience, actualTransport, activeTrip.preferences.startsAt);
    const awardedPoints = pointsBreakdown.total;
    const nextVerifiedIds = [...verifiedExperienceIds, experience.id];
    const allStopsVerified = tripExperienceIds(activeTrip).every((id) => nextVerifiedIds.includes(id));
    const verifiedTrip: SavedTrip = {
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      trip: {
        ...activeTrip.trip,
        verified: status === "verified" && allStopsVerified,
        verifiedExperienceIds: nextVerifiedIds,
        verificationRecords: [
          ...(activeTrip.trip.verificationRecords ?? []).filter(
            (record) => record.experienceId !== experience.id,
          ),
          {
            experienceId: experience.id,
            verifiedAt: new Date().toISOString(),
            status,
            source: options.source ?? "manual-demo",
            provider: options.provider,
            actualTransport: options.actualTransport,
            awardedPoints,
          },
        ],
      },
    };
    updateActive(verifiedTrip);
    let nextLedger = appendPointEvent(ledger, {
      id: `visit-${activeTrip.id}-${experience.id}`,
      amount: awardedPoints,
      type: "visit",
      label: systemUi[locale].visitLedger(experience.name, adjustment.tone),
      createdAt: new Date().toISOString(),
      status,
      metadata: {
        transport: actualTransport,
        plannedTransport,
        activityProvider: options.provider,
        crowd: experience.crowd,
        experienceId: experience.id,
        region: experience.region,
        basePoints: pointsBreakdown.base,
        transportBonus: pointsBreakdown.transportBonus,
        offPeakBonus: pointsBreakdown.offPeakBonus,
      },
    });
    if (activeTrip.trip.acceptedGemDrop) {
      nextLedger = appendPointEvent(nextLedger, {
        id: `gemdrop-${activeTrip.id}`,
        amount: 20,
        type: "gemdrop",
        label: systemUi[locale].gemDropLedger,
        createdAt: new Date().toISOString(),
        status,
        metadata: {
          transport: options.actualTransport ?? plannedTransport,
          plannedTransport,
          activityProvider: options.provider,
          crowd: experience.crowd,
          experienceId: experience.id,
          region: experience.region,
          basePoints: pointsBreakdown.base,
          transportBonus: pointsBreakdown.transportBonus,
          offPeakBonus: pointsBreakdown.offPeakBonus,
        },
      });
    }
    setLedger(nextLedger);
    upsertStoredNotification({
      id: `visit-${activeTrip.id}-${experience.id}`,
      title: activityText.verified,
      detail: `${experience.name} · +${awardedPoints} GemPoints`,
      createdAt: new Date().toISOString(),
      kind: "points",
      href: appPath.points,
    });
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
            id: `badge-${activeTrip.id}-${unlockedIndex}`,
            title: badgeTitle,
            createdAt: new Date().toISOString(),
          },
          ...history,
        ]),
      );
      window.dispatchEvent(new Event("gemgo:badge-earned"));
      upsertStoredNotification({
        id: `badge-${activeTrip.id}-${unlockedIndex}`,
        title: badgeTitle,
        detail: tr(locale, "New badge earned", "Nuovo badge ottenuto"),
        createdAt: new Date().toISOString(),
        kind: "reward",
        href: appPath.points,
      });
      setToast(systemUi[locale].badge(badgeTitle));
    } else {
      setToast(`${activityText.verified} · +${awardedPoints} GemPoints`);
    }
    setVerificationExperienceId(null);
    setVerificationMessage("");
  };

  const verifyGps = () => {
    if (!verificationExperience || !navigator.geolocation) {
      setVerificationMessage(systemUi[locale].geoUnavailable);
      return;
    }
    setVerificationMessage(systemUi[locale].checkingLocation);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = haversineKm(
          {
            label: systemUi[locale].currentLocation,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          verificationExperience,
        );
        if (distance <= 2) completeVerification("demo", { source: "gps" });
        else
          setVerificationMessage(systemUi[locale].distanceArea(distance.toFixed(1)));
      },
      () => setVerificationMessage(systemUi[locale].geoDenied),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const verifyQr = () => {
    if (qrCode.trim().toUpperCase() === "GEMGO-DEMO-2026")
      completeVerification("demo", { source: "qr" });
    else setVerificationMessage(systemUi[locale].invalidQr);
  };

  const closeGemDrop = () => {
    setGemDropOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (!params.has("gemdrop")) return;
    params.delete("gemdrop");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
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
        experienceIds: [
          ...tripExperienceIds(activeTrip).slice(0, -1),
          gemDropAlternative.id,
        ],
        acceptedGemDrop: true,
      },
    });
    closeGemDrop();
    setToast(systemUi[locale].switched);
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
      label: systemUi[locale].rewardLedger(label),
      createdAt: new Date().toISOString(),
      status: "demo",
    });
    setLedger(nextLedger);
    setUnlocks((current) => [unlock, ...current]);
    setRewardReceipt({ unlock, label });
    upsertStoredNotification({
      id: `reward-${unlock.id}`,
      title: label,
      detail: unlock.code,
      createdAt: unlock.createdAt,
      kind: "reward",
      href: appPath.points,
    });
    setToast(systemUi[locale].rewardUnlocked(unlock.code));
  };

  const grantDemoPoints = () => {
    const amount = Math.max(0, 1000 - balance);
    if (amount === 0) {
      setToast(tr(locale, "Demo balance is already ready", "Il saldo demo è già pronto"));
      return;
    }
    setLedger(
      appendPointEvent(ledger, {
        id: `demo-balance-${Date.now()}`,
        amount,
        type: "demo",
        label: systemUi[locale].demoLedger,
        createdAt: new Date().toISOString(),
        status: "demo",
      }),
    );
    setToast(tr(locale, "Demo GemPoints added", "GemPoints demo aggiunti"));
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
      aria-busy={!canPersist}
      inert={!canPersist}
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
            <small>{u.tagline}</small>
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
            aria-label={`${displayedBalance.toLocaleString(locale)} GemPoints`}
            onClick={() => chooseSection("rewards")}
          >
            <Coins size={18} />
            <span>
              <strong>{displayedBalance.toLocaleString(locale)}</strong>
              <small>GemPoints</small>
            </span>
          </button>
          <Link
            href="/app/notifications"
            className="icon-button notification-page-link"
            aria-label={plannerText.notifications}
          >
            <Bell size={19} />
            <span className="header-notification-dot" aria-hidden="true" />
          </Link>
          <Link href="/app/profile" className="icon-text-button profile-page-link">
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
            <Link href="/app/profile">
              {t.account}
              <ChevronRight size={17} />
            </Link>
          </nav>
        )}
      </header>

      {activeTransitPlan && section === "trip" && (
        <aside className="gtfs-source-banner">
          <Bus size={18} />
          <span>
            <strong>{plannerText.transitAccess}</strong>
            {activeTransitPlan.status === "static-gtfs-access" ? (
              <>
                {activeTransitPlan.originStop && <small>{plannerText.transitOrigin}: {activeTransitPlan.originStop.name} · {activeTransitPlan.originStop.distanceKm.toFixed(1)} km</small>}
                {activeTransitPlan.destinationStop && <small>{plannerText.transitDestination}: {activeTransitPlan.destinationStop.name} · {activeTransitPlan.destinationStop.distanceKm.toFixed(1)} {plannerText.transitStatic}</small>}
                <small>{plannerText.transitBavaria}</small>
              </>
            ) : <small>{plannerText.transitAosta}</small>}
            <span className="gtfs-source-actions">
              <a href={activeTransitPlan.directionsUrl} target="_blank" rel="noreferrer noopener">{plannerText.transitGoogle}</a>
              <a href={activeTransitPlan.operatorUrl} target="_blank" rel="noreferrer noopener">{plannerText.transitOfficial}</a>
            </span>
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
                  <div className="prompt-action-row">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={interpretPrompt}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <LoaderCircle className="button-spinner" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}
                      {t.interpret}
                    </button>
                    {interpretationSummary && (
                      <p className="interpretation-status" role="status">
                        <CheckCircle2 size={16} />
                        <span>
                          <strong>{t.interpreted}</strong>
                          {interpretationSummary}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="form-section">
                    <div className="form-section-title">
                      <LocateFixed size={18} />
                      <div>
                        <strong>{t.origin}</strong>
                        <small>
                          {originMode === "far"
                            ? mvp.originModes[0]
                            : originStatus === "ready"
                              ? origin?.label
                              : u.notFound}
                        </small>
                      </div>
                    </div>
                    <div className="choice-grid origin-mode-grid">
                      <button
                        type="button"
                        className={originMode === "far" ? "is-selected" : ""}
                        aria-pressed={originMode === "far"}
                        onClick={() => {
                          setOriginMode("far");
                          setOriginMessage(mvp.farHelp);
                          updatePreference("originMode", "far");
                        }}
                      >
                        <Globe2 size={17} />{mvp.originModes[0]}
                      </button>
                      <button
                        type="button"
                        className={originMode === "gps" ? "is-selected" : ""}
                        aria-pressed={originMode === "gps"}
                        onClick={detectOrigin}
                        disabled={locatingOrigin}
                      >
                        {locatingOrigin ? <LoaderCircle className="button-spinner" size={17} /> : <LocateFixed size={17} />}{mvp.originModes[1]}
                      </button>
                      <button
                        type="button"
                        className={originMode === "place" ? "is-selected" : ""}
                        aria-pressed={originMode === "place"}
                        onClick={() => {
                          setOriginMode("place");
                          setOriginMessage(mvp.placeHelp);
                          updatePreference("originMode", "place");
                        }}
                      >
                        <MapPin size={17} />{mvp.originModes[2]}
                      </button>
                    </div>
                    <p className="alpine-origin-note">
                      {originMessage || (originMode === "far" ? mvp.farHelp : originMode === "gps" ? mvp.gpsHelp : mvp.placeHelp)}
                    </p>
                    <div className="region-filter" aria-label={t.region}>
                      <span>{t.region}</span>
                      <div className="choice-grid region-grid">
                        {(
                          [
                            [null, t.allRegions],
                            ["Bavaria", "Bavaria"],
                            ["Valle d’Aosta", "Valle d’Aosta"],
                          ] as const
                        ).map(([region, label]) => (
                          <button
                            type="button"
                            key={label}
                            className={
                              preferences.region === region ? "is-selected" : ""
                            }
                            aria-pressed={preferences.region === region}
                            onClick={() => changeRegion(region)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {originMode !== "far" && (
                    <div className="field-grid field-grid-location">
                      <label>
                        <span>{t.origin}</span>
                        <select
                          value={originExperienceId}
                          onChange={(event) => changeOrigin(event.target.value)}
                        >
                          {Object.keys(catalogueSummary).map((region) => (
                            <optgroup key={region} label={region}>
                              {catalogueExperiences
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
                    </div>
                    )}
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
                    <div className="field-grid time-grid date-time-grid">
                      <label>
                        <span>{mvp.startDate}</span>
                        <input
                          type="datetime-local"
                          value={preferences.startsAt ?? ""}
                          onChange={(event) =>
                            updatePreference("startsAt", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <span>{mvp.endDate}</span>
                        <input
                          type="datetime-local"
                          min={preferences.startsAt}
                          value={preferences.endsAt ?? ""}
                          onChange={(event) =>
                            updatePreference("endsAt", event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <p className="date-time-help"><CalendarClock size={16} />{mvp.dateHelp}</p>
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
                            setPreferences((current) => {
                              const selected = current.kinds.includes(option.id);
                              return {
                                ...current,
                                kinds: selected
                                  ? current.kinds.filter(
                                      (item) => item !== option.id,
                                    )
                                  : [...current.kinds, option.id],
                                requiredKinds: selected
                                  ? current.requiredKinds.filter(
                                      (item) => item !== option.id,
                                    )
                                  : [...new Set([...current.requiredKinds, option.id])],
                              };
                            })
                          }
                        >
                          {kindLabel(locale, option.id)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`quiet-toggle${preferences.avoidCrowds ? " is-selected" : ""}`}
                      aria-pressed={preferences.avoidCrowds}
                      onClick={() =>
                        updatePreference("avoidCrowds", !preferences.avoidCrowds)
                      }
                    >
                      <Users size={17} />
                      {t.quiet}
                    </button>
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
                        {weather.source !== "unavailable"
                          ? `${weather.temperature?.toFixed(0)}°C · ${weather.precipitationProbability ?? 0}% ${weatherUi[locale].rain}`
                          : weatherUi[locale].unavailable}
                      </strong>
                      <span>
                        {weather.source !== "unavailable"
                          ? `${weather.source === "forecast" ? weatherUi[locale].forecast : weatherUi[locale].current} · ${weatherUi[locale].influence}`
                          : weatherUi[locale].fallback}
                      </span>
                    </div>
                    <span className="data-source-chip">{weatherUi[locale].source[weather.source]}</span>
                  </div>
                  <button
                    type="submit"
                    className="button button-primary button-large"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <LoaderCircle className="button-spinner" size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                    {t.search}
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
                      experiences={catalogueExperiences}
                      origin={origin}
                      selectedId={selectedId}
                      routeCoordinates={selectedRoute}
                      routeMode={rankingPreferences.transport}
                      focusRegion={mapFocus.region}
                      focusRequestId={mapFocus.requestId}
                      onSelect={(experience) => setSelectedId(experience.id)}
                    />
                    <MapRegionControls
                      locale={locale}
                      activeRegion={mapFocus.region}
                      experiences={catalogueExperiences}
                      onSelect={focusMapRegion}
                    />
                  </div>
                  <div className="method-card">
                    <h3>{u.quality}</h3>
                    <p>{u.qualityBody}</p>
                  </div>
                  <div className="method-card activity-method-card">
                    <span className="ai-demo-pill"><Watch size={14} />{activityText.future}</span>
                    <h3>{activityText.title}</h3>
                    <p>{activityText.how}</p>
                  </div>
                </aside>
              </div>
            </>
          )}

          {stage === "results" && (
            <>
              {tripPlanningOrigin && (
                <section className="trip-refinement-panel" aria-label={mvp.refineTitle}>
                  <div>
                    <span className="eyebrow"><Route size={15} />{mvp.refineTitle}</span>
                    <h2>{tripPlanningOrigin.name}</h2>
                    <p>{mvp.refineBody}</p>
                  </div>
                  <label>
                    <span>{mvp.betweenStops}</span>
                    <strong>{formatDuration(maxLegMinutes)}</strong>
                    <input type="range" min="15" max="360" step="15" value={maxLegMinutes} onChange={(event) => setMaxLegMinutes(Number(event.target.value))} />
                  </label>
                  <div className="choice-grid transport-grid compact-transport-grid">
                    {transportOptions.map((option) => {
                      const Icon = option.icon;
                      return <button type="button" key={option.id} className={legTransport === option.id ? "is-selected" : ""} aria-pressed={legTransport === option.id} onClick={() => setLegTransport(option.id)}><Icon size={17} />{transportLabel(locale, option.id)}</button>;
                    })}
                  </div>
                </section>
              )}
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
                    {activeCuratedScenario
                      ? `${scenarioUi[locale].expert} · ${activeCuratedScenario.hotspot}`
                      : `${totalCatalogueEntries} ${scenarioUi[locale].catalogue}`}
                  </span>
                  <h1>{t.results}</h1>
                  <p>
                    {recommendationOrigin ? (
                      <>{tr(locale, "Starting from", "Partenza da")} <strong>{recommendationOrigin.label}</strong>.</>
                    ) : (
                      <>{mvp.originModes[0]} · {mvp.farHelp}</>
                    )}
                  </p>
                </div>
                <div className="results-summary">
                  <strong>{ranked.length}</strong>
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
                      key={`results-map-${resultsView}`}
                      locale={locale}
                      experiences={resultMapExperiences}
                      origin={recommendationOrigin}
                      selectedId={selectedId}
                      routeCoordinates={selectedRoute}
                      routeMode={rankingPreferences.transport}
                      focusRegion={mapFocus.region}
                      focusRequestId={mapFocus.requestId}
                      disableClustering
                      tripExperienceIds={activeExperienceIds}
                      onSelect={(experience) => setSelectedId(experience.id)}
                    />
                    <MapRegionControls
                      locale={locale}
                      activeRegion={mapFocus.region}
                      experiences={resultMapExperiences}
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
                  {ranked.length === 0 && (
                    <div className="empty-state results-empty-state" role="status">
                      <AlertTriangle size={34} />
                      <h2>{t.noMatches}</h2>
                      <p>{t.noMatchesBody}</p>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => chooseExploreStage("brief")}
                      >
                        <ArrowLeft size={17} /> {t.adjust}
                      </button>
                    </div>
                  )}
                  {ranked.map((item) => (
                    <IntegratedResultCard
                      locale={locale}
                      key={item.experience.id}
                      item={item}
                      visitDate={rankingPreferences.startsAt}
                      saved={collections.some((collection) =>
                        collection.experienceIds.includes(item.experience.id),
                      )}
                      onOpen={() => {
                        setSelectedId(item.experience.id);
                        chooseExploreStage("experience", item.experience.id);
                      }}
                      onSave={() => saveIdea(item.experience)}
                      onAdd={() => addToTrip(item.experience)}
                    />
                  ))}
                  {showMore &&
                    moreResults.map((experience) => (
                      <CompactResult
                        key={experience.id}
                        locale={locale}
                        experience={experience}
                        onOpen={() => {
                          setSelectedId(experience.id);
                          chooseExploreStage("experience", experience.id);
                        }}
                        onAdd={() => addToTrip(experience)}
                        onSave={() => saveToCollection(experience)}
                        saved={collections.some((collection) => collection.experienceIds.includes(experience.id))}
                      />
                    ))}
                  {moreResults.length > 0 && (
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
                  )}
                </div>
              </div>
              {activeExperiences.length > 0 && floatingTarget && createPortal(
                <button type="button" className="floating-open-trip" onClick={() => chooseSection("trip")}>
                  <Route size={19} />{activityText.openTrip} ({activeExperiences.length})
                </button>,
                floatingTarget,
              )}
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
              visitDate={rankingPreferences.startsAt}
              saved={collections.some((collection) =>
                collection.experienceIds.includes(selected.id),
              )}
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
              <button
                type="button"
                className={tripMode === "collections" ? "is-active" : ""}
                onClick={() => chooseTripMode("collections")}
              >
                {mvp.collections} ({collections.reduce((total, collection) => total + collection.experienceIds.length, 0)})
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
                <div className={`trip-main-card${tripMapExpanded ? " has-expanded-map" : ""}`}>
                  <div className={`trip-photo-puzzle count-${Math.min(3, activeExperiences.length)}`}>
                    {activeExperiences.slice(0, 3).map((experience) => (
                      <DestinationPhoto destinationId={experience.id} key={experience.id} name={experience.name} region={experience.region} className="trip-real-photo" compact />
                    ))}
                  </div>
                  <div className="trip-title-block">
                    <span className={`crowd-chip crowd-${activeExperience.crowd}`}>
                      {localizedExperienceNarrative(locale, activeExperience).crowd}
                    </span>
                    <h2>{activeTrip.name}</h2>
                    <p>{activeExperiences.length} {tr(locale, "Alpine stops", "tappe alpine")}</p>
                    <div className="trip-date-summary">
                      <span><CalendarClock size={18} /><small>{activityText.start}</small><strong>{formatDateTime(activeTrip.preferences.startsAt, locale)}</strong></span>
                      <span><CalendarDays size={18} /><small>{activityText.end}</small><strong>{formatDateTime(activeTrip.preferences.endsAt, locale)}</strong></span>
                    </div>
                  </div>

                  <section className="trip-route-settings" aria-label={activityText.routeSettings}>
                    <div><Route size={20} /><span><strong>{activityText.routeSettings}</strong><small>{activityText.routeHelp}</small></span></div>
                    <div className="trip-transport-options">
                      {transportOptions.map((option) => {
                        const Icon = option.icon;
                        return <button type="button" key={option.id} className={activeTripTransport === option.id ? "is-selected" : ""} aria-pressed={activeTripTransport === option.id} onClick={() => updateActiveTripTransport(option.id)}><Icon size={17} /><span>{transportLabel(locale, option.id)}</span></button>;
                      })}
                    </div>
                  </section>

                  {tripMapExpanded && <button type="button" className="trip-map-backdrop" aria-label={tr(locale, "Close expanded map", "Chiudi la mappa ampliata")} onClick={() => setTripMapExpanded(false)} />}
                  <div className={`trip-map-expand-shell${tripMapExpanded ? " is-expanded" : ""}`}>
                    <button type="button" className="trip-map-expand-button" aria-label={tripMapExpanded ? tr(locale, "Close expanded map", "Chiudi la mappa ampliata") : activityText.expandMap} title={tripMapExpanded ? tr(locale, "Close expanded map", "Chiudi la mappa ampliata") : activityText.expandMap} onClick={() => setTripMapExpanded((value) => !value)}>
                      {tripMapExpanded ? <X size={19} /> : <Maximize2 size={19} />}
                    </button>
                    <ExperienceMap
                      key={tripMapExpanded ? "trip-map-expanded" : "trip-map-inline"}
                      experiences={activeExperiences}
                      origin={origin}
                      selectedId={activeExperience.id}
                      routeCoordinates={activeExperiences.length === 1 ? activeRoute : []}
                      routeMode={activeTripTransport}
                      routeStops={activeExperiences}
                      routeModes={activeExperiences.slice(1).map(() => activeTripTransport)}
                    />
                  </div>

                  <div className="trip-timeline">
                    {activeExperiences.map((experience, index) => {
                      const previous = activeExperiences[index - 1];
                      const legMinutes = index > 0 ? activeLegMinutes[index - 1] : null;
                      const verified = verifiedExperienceIds.has(experience.id);
                      return (
                        <article className={`timeline-item${verified ? " is-verified" : ""}`} key={experience.id}>
                          <div className="timeline-marker">{verified ? <Check size={16} /> : index + 1}</div>
                          <div className="timeline-stop-copy">
                            <time>{index === 0 ? formatDateTime(activeTrip.preferences.startsAt, locale) : `${formatDuration(legMinutes ?? 0)} · ${activityText.estimated}`}</time>
                            <strong>{experience.name}</strong>
                            <small>{localizedExperienceCaption(locale, experience)}</small>
                            {index > 0 && <span><Navigation size={14} />{transportLabel(locale, activeTripTransport)} · {formatDuration(legMinutes ?? 0)}</span>}
                          </div>
                          <div className="timeline-stop-actions">
                            <button type="button" className={verified ? "is-verified" : ""} disabled={verified} onClick={() => { setVerificationMessage(""); setQrCode(""); setVerificationExperienceId(experience.id); }}>
                              <BadgeCheck size={16} />{verified ? activityText.verified : t.verify}
                            </button>
                            <a href={googleMapsDirectionsUrl(experience, activeTripTransport, previous)} target="_blank" rel="noreferrer"><Navigation size={16} />{activityText.openNavigation}</a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
                <aside className="trip-side">
                  <div className="activity-sync-card">
                    <span className="ai-demo-pill"><Activity size={14} />{activityText.future}</span>
                    <h3>{activityText.title}</h3>
                    <p>{activityText.body}</p>
                    <div className="activity-provider-row" aria-label={activityText.provider}><span>Strava</span><span>Garmin</span><span>Apple Health</span><span>Health Connect</span></div>
                    <small>{activityText.how}</small>
                  </div>
                  <div className="operational-card">
                    <h3>
                      {tr(
                        locale,
                        "Operational information",
                        "Informazioni operative",
                      )}
                    </h3>
                    {localizedExperienceNarrative(locale, activeExperience).mobility.map((item) => (
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
                    <CheckCircle2 size={22} />
                    <div>
                      <h3>{mvp.automaticOffline}</h3>
                      <p>{mvp.automaticOfflineBody}</p>
                    </div>
                  </div>
                  <div className="trip-reshape-card">
                    <h3>{mvp.tripTune}</h3>
                    <div>
                      <button type="button" onClick={() => refineTrip("shorter")}>{mvp.suggestions[0]}</button>
                      <button type="button" onClick={() => refineTrip("quiet")}>{mvp.suggestions[1]}</button>
                      <button type="button" onClick={() => refineTrip("culture")}>{mvp.suggestions[2]}</button>
                      <button type="button" onClick={() => refineTrip("easy")}>{mvp.suggestions[3]}</button>
                      {nearbyWaterAvailable && <button type="button" onClick={() => refineTrip("water")}>{tr(locale, "More lakes", "Più laghi")}</button>}
                    </div>
                  </div>
                  {conditionReminderVisible && (
                  <button
                    type="button"
                    className="condition-change-card"
                    onClick={() => setConditionModalOpen(true)}
                  >
                    <Sparkles size={22} />
                    <span>
                      <strong>{mvp.conditionTitle}</strong>
                      <small>{mvp.conditionReminder}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                  )}
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
                  const tripExperiences = tripExperienceIds(trip)
                    .map((id) => allExperiences.find((item) => item.id === id))
                    .filter((item): item is Experience => Boolean(item));
                  const experience = tripExperiences.at(-1);
                  return (
                    <article className="saved-trip-card" key={trip.id}>
                      <div className={`saved-trip-photo-puzzle count-${Math.min(3, tripExperiences.length)}`}>
                        {tripExperiences.slice(0, 3).map((item) => <DestinationPhoto destinationId={item.id} key={item.id} name={item.name} region={item.region} compact />)}
                      </div>
                      <div className="saved-trip-copy">
                        <span>{experience?.region ?? "Alps"}</span>
                        <h3>{trip.name}</h3>
                        <p>{tripExperiences.length} {tr(locale, "stops", "tappe")} · {experience ? localizedExperienceCaption(locale, experience) : ""}</p>
                        <small>
                          {tr(locale, "Updated", "Aggiornato")}{" "}
                          {new Date(trip.updatedAt).toLocaleDateString(locale)}
                        </small>
                      </div>
                      <div className="saved-trip-actions">
                        <div className="saved-trip-primary-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTrip(trip);
                            chooseTripMode("active");
                          }}
                        >
                          <ArrowRight size={16} /> {mvp.open}
                        </button>
                        <button type="button" onClick={() => renameTrip(trip)}>
                          <Pencil size={16} /> {mvp.rename}
                        </button>
                        </div>
                        <div className="saved-trip-icon-actions">
                        <button type="button" onClick={() => void shareTrip(trip)} aria-label={mvp.share} title={mvp.share}>
                          <Share2 size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateTrip(trip)}
                          aria-label={mvp.duplicate}
                          title={mvp.duplicate}
                        >
                          <Copy size={17} />
                        </button>
                        <button type="button" onClick={() => deleteTrip(trip)} aria-label={mvp.remove} title={mvp.remove}>
                          <Trash2 size={17} />
                        </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
          {tripMode === "collections" && (
            <section className="collection-library">
              <div className="collection-target-row">
                <div><span className="eyebrow"><Heart size={15} />{mvp.collections}</span><h2>{tr(locale, "Saved Alpine places", "Località alpine salvate")}</h2></div>
                <label><span>{mvp.addTrip}</span><select value={collectionTargetTripId} onChange={(event) => setCollectionTargetTripId(event.target.value)}><option value="active">{activeTrip?.name ?? tr(locale, "New active trip", "Nuovo viaggio attivo")}</option>{savedTrips.filter((trip) => trip.id !== activeTrip?.id).map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>
              </div>
              {collections.length === 0 ? <div className="empty-state"><Heart size={34} /><h2>{tr(locale, "No saved places yet", "Nessuna località salvata")}</h2></div> : collections.map((collection) => (
                <section key={collection.id} className="collection-group">
                  <header><div><span>{collection.region}</span><h3>{collection.name}</h3></div><strong>{collection.experienceIds.length}</strong></header>
                  <div className="collection-card-grid">
                    {collection.experienceIds
                      .map((id) => allExperiences.find((experience) => experience.id === id))
                      .filter((experience): experience is Experience => Boolean(experience))
                      .map((experience) => {
                        const narrative = localizedExperienceNarrative(locale, experience);
                        return <article className="collection-location-card" key={experience.id}><DestinationPhoto destinationId={experience.id} name={experience.name} region={experience.region} compact /><div><span className={`crowd-chip crowd-${experience.crowd}`}>{narrative.crowd}</span><h3>{experience.name}</h3><p>{localizedExperienceCaption(locale, experience)}</p><button type="button" className="button button-primary" onClick={() => addCollectionExperienceToTrip(experience)}>{mvp.addTrip}<ArrowRight size={16} /></button></div></article>;
                      })}
                  </div>
                </section>
              ))}
            </section>
          )}
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
          verifiedBalance={auth.user ? auth.verifiedBalance : null}
          ledger={ledger}
          unlocks={unlocks}
          activeTrip={activeTrip}
          savedTrips={savedTrips}
          onUnlock={unlockReward}
          onDemoPoints={grantDemoPoints}
          onShowCode={(unlock, label) => setRewardReceipt({ unlock, label })}
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
          onClose={closeGemDrop}
          onSwitch={switchGemDrop}
        />
      )}
      {conditionModalOpen && activeExperience && (
        <ConditionChangeModal
          locale={locale}
          experience={activeExperience}
          onClose={() => setConditionModalOpen(false)}
          onKeep={() => {
            setConditionModalOpen(false);
            setConditionReminderVisible(true);
          }}
          onChange={() => {
            setConditionModalOpen(false);
            setConditionReminderVisible(false);
            setBuildingTripId(activeTrip?.id ?? null);
            chooseExploreStage("results");
          }}
        />
      )}
      {verificationExperience && (
        <VerificationModal
          locale={locale}
          experience={verificationExperience}
          plannedTransport={activeTripTransport}
          visitDate={activeTrip?.preferences.startsAt}
          message={verificationMessage}
          qrCode={qrCode}
          onQrCode={setQrCode}
          onGps={verifyGps}
          onQr={verifyQr}
          onDemo={() => completeVerification("demo", { source: "manual-demo" })}
          onActivity={(provider, actualTransport) =>
            completeVerification("demo", {
              source: "activity-demo",
              provider,
              actualTransport,
            })
          }
          onClose={() => setVerificationExperienceId(null)}
        />
      )}
      {rewardReceipt && (
        <RewardQrModal locale={locale} unlock={rewardReceipt.unlock} label={rewardReceipt.label} onClose={() => setRewardReceipt(null)} />
      )}
      {toast && (
        <div className="action-toast">
          <CheckCircle2 size={18} />
          {toastAction === "condition" ? (
            <button type="button" className="action-toast-link" onClick={() => {
              setToast("");
              setToastAction(null);
              chooseSection("trip");
              setConditionReminderVisible(true);
              setConditionModalOpen(true);
            }}>{toast}</button>
          ) : <span>{toast}</span>}
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
  experiences = allExperiences,
  onSelect,
}: {
  locale: Locale;
  activeRegion: PilotRegion | null;
  experiences?: Experience[];
  onSelect: (region: PilotRegion) => void;
}) {
  const visibleCounts = new Map<PilotRegion, number>(
    pilotRegions.map((region) => [
      region,
      experiences.filter((experience) => experience.region === region).length,
    ]),
  );
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
          <strong>{visibleCounts.get(region) ?? 0}</strong>
        </button>
      ))}
    </div>
  );
}

function CompactResult({
  locale,
  experience,
  onOpen,
  onAdd,
  onSave,
  saved,
}: {
  locale: Locale;
  experience: Experience;
  onOpen: () => void;
  onAdd: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const view = {
    en: "View",
    it: "Vedi",
    de: "Ansehen",
    fr: "Voir",
    sl: "Ogled",
  }[locale];
  return (
    <article className="compact-result">
      <MapPin size={18} />
      <span>
        <strong>{experience.name}</strong>
        <small>
          {experience.region} · {experience.kind.slice(0, 2).map((kind) => kindLabel(locale, kind)).join(" · ")}
        </small>
      </span>
      <div><button type="button" onClick={onOpen}>{view}<ChevronRight size={17} /></button><button type="button" onClick={onAdd}>{mvpCopy[locale].addTrip}</button><button type="button" className="compact-heart" onClick={onSave} aria-pressed={saved} aria-label={saved ? mvpCopy[locale].removedCollection(experience.region) : mvpCopy[locale].savedCollection(experience.region)}><Heart size={16} fill={saved ? "currentColor" : "none"} /></button></div>
    </article>
  );
}

function ExperienceDetail({
  locale,
  experience,
  ranked,
  origin,
  route,
  transport,
  visitDate,
  saved,
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
  visitDate?: string;
  saved: boolean;
  onBack: () => void;
  onSave: () => void;
  onAdd: () => void;
}) {
  const travel = ranked?.travelMinutes ?? experience.travel[transport];
  const text = detailCopy[locale];
  const narrative = localizedExperienceNarrative(locale, experience);
  const caption = localizedExperienceCaption(locale, experience);
  const reasons = localizedExperienceReasons(locale, experience, travel, visitDate);
  const practical = localizedPracticalInfo(locale, experience);
  return (
    <div className="experience-detail">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={17} />
        {tr(locale, "Back to alternatives", "Torna alle alternative")}
      </button>
      <div className="integrated-detail-hero">
        <DestinationPhoto destinationId={experience.id} name={experience.name} region={experience.region} layout="puzzle" />
        <div className="detail-hero-copy">
          <div>
            <span>{narrative.validation}</span>
            <span className={`crowd-chip crowd-${experience.crowd}`}>
              {narrative.crowd}
            </span>
          </div>
          <p>
            {experience.region} · {narrative.country}
          </p>
          <h1>{caption}</h1>
          <strong>{experience.name}</strong>
          {experience.seasons && <div className="season-tag-list" aria-label={seasonUi[locale].label}>{experience.seasons.map((season) => <span key={season}>{seasonLabel(locale, season)}</span>)}</div>}
          {experience.editorialSourceUrl && <a className="editorial-source-link" href={experience.editorialSourceUrl} target="_blank" rel="noreferrer">{seasonUi[locale].source}: {experience.editorialSourceLabel}</a>}
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
          <small>{activityCopy[locale].basePoints}</small>
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
            <p>{reasons.join(". ") || caption}</p>
          </section>
          <section className="content-card route-and-attention-card">
            <h2>{tr(locale, "Route and mobility", "Percorso e mobilità")}</h2>
            <ExperienceMap
              locale={locale}
              experiences={[experience]}
              origin={origin}
              selectedId={experience.id}
              routeCoordinates={route}
              routeMode={transport}
            />
            <div className="attention-panel">
              <AlertTriangle size={22} />
              <div>
                <span>{text.attention}</span>
                <p>{text.attentionBody}</p>
                <ul>{narrative.mobility.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul>
              </div>
            </div>
            {practical && (
              <div className="practical-info-grid" aria-label={practical.checked}>
                <span><strong>{practical.access}</strong></span>
                <span><strong>{practical.opening}</strong></span>
                <span><strong>{practical.booking}</strong></span>
                <span><strong>{practical.price}</strong></span>
                <a href={practical.sourceUrl} target="_blank" rel="noreferrer">
                  {practical.source} · {practical.checked}
                </a>
              </div>
            )}
          </section>
          <section className="content-card">
            <h2>{text.plan}</h2>
            <p className="section-support-copy">{text.planBody}</p>
            <div className="mini-itinerary">
              {experience.itinerary.map((item, index) => (
                <div key={`${item.time}-${item.label}`}>
                  <i>{index + 1}</i>
                  <time>{item.time}</time>
                  <span><strong>{narrative.itinerary[index] ?? item.label}</strong><small>{index === 0 ? transportLabel(locale, transport) : `${experience.name} · ${formatDuration(experience.durationMinutes)}`}</small></span>
                </div>
              ))}
            </div>
          </section>
          <section className="content-card comparison-card">
            <h2>{tr(locale, "Honest comparison", "Confronto trasparente")}</h2>
            <div className="comparison-columns">
              <div className="original-comparison-option">
                <small>{tr(locale, "Original plan", "Piano originale")}</small>
                <strong>{narrative.comparison.original}</strong>
                <span>{narrative.comparison.reachDifference}</span>
              </div>
              <ArrowRight size={22} />
              <div className="gemgo-comparison-option">
                <small>
                  {tr(locale, "GemGo alternative", "Alternativa GemGo")}
                </small>
                <h3>{text.alternative}</h3>
                <strong>{experience.name}</strong>
                {narrative.comparison.advantages.map((item) => (
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
                <strong>{text.tradeoff}</strong>
                {narrative.tradeoffs.map((item) => (
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
            <p>{narrative.localBenefit}</p>
            {experience.partner && <span>{experience.partner}</span>}
          </section>
          <section className="content-card safety-card">
            <h3>{tr(locale, "Safety and limits", "Sicurezza e limiti")}</h3>
            {narrative.safety.map((item) => (
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
              className={`button button-secondary button-full${saved ? " is-saved" : ""}`}
              onClick={onSave}
              aria-pressed={saved}
            >
              <Heart size={17} fill={saved ? "currentColor" : "none"} />
              {saved
                ? mvpCopy[locale].removedCollection(experience.region)
                : tr(locale, "Save for later", "Salva per dopo")}
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

function ConditionChangeModal({
  locale,
  experience,
  onClose,
  onKeep,
  onChange,
}: {
  locale: Locale;
  experience: Experience;
  onClose: () => void;
  onKeep: () => void;
  onChange: () => void;
}) {
  useModalA11y(onClose);
  const text = mvpCopy[locale];
  const disclosure = {
    en: "This alert demonstrates the intended post-funding AI crowd predictor. It is not a live production prediction.",
    it: "Questo avviso simula il Crowd Predictor AI previsto dopo il finanziamento. Non è una previsione live di produzione.",
    de: "Dieser Hinweis simuliert die nach einer Finanzierung geplante KI-Besucherprognose. Er ist keine Live-Produktionsprognose.",
    fr: "Cette alerte simule le prédicteur d’affluence IA prévu après financement. Il ne s’agit pas d’une prévision de production en direct.",
    sl: "To opozorilo simulira napovedovalnik gneče AI, načrtovan po financiranju. Ne gre za produkcijsko napoved v živo.",
  }[locale];
  return (
    <div className="modal-backdrop condition-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="condition-change-title">
      <section className="condition-change-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="condition-modal-heading">
          <span className="ai-feature-pill"><Sparkles size={15} />{text.aiDemo}</span>
          <AlertTriangle size={34} />
          <div><span>{experience.region}</span><h2 id="condition-change-title">{text.conditionTitle}</h2><p><strong>{experience.name}</strong> · {text.conditionBody}</p></div>
        </div>
        <div className="condition-reason-grid">
          {text.conditionReasons.map((reason, index) => (
            <span key={reason}>{index === 0 ? <CloudRain size={18} /> : index === 1 ? <Clock3 size={18} /> : index === 2 ? <Waves size={18} /> : <CalendarDays size={18} />}{reason}</span>
          ))}
        </div>
        <p className="condition-demo-disclosure"><Info size={17} />{disclosure}</p>
        <div className="condition-modal-actions">
          <button type="button" className="button button-secondary" onClick={onKeep}>{text.keepStop}</button>
          <button type="button" className="button button-primary" onClick={onChange}>{text.changeStop}<ArrowRight size={17} /></button>
        </div>
      </section>
    </div>
  );
}

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
              destinationId={original.id}
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
              destinationId={alternative.id}
              name={alternative.name}
              region={alternative.region}
              compact
              className="gemdrop-destination-gallery is-alternative"
            />
            <small>{tr(locale, "Alternative", "Alternativa")}</small>
            <h3>{alternative.name}</h3>
            <p>
              <Users size={16} />
              {gemDropUi[locale].crowd[alternative.crowd]}
            </p>
            <p>
              <Coins size={16} />
              {gemDropUi[locale].bonus}
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
  plannedTransport,
  visitDate,
  message,
  qrCode,
  onQrCode,
  onGps,
  onQr,
  onDemo,
  onActivity,
  onClose,
}: {
  locale: Locale;
  experience: Experience;
  plannedTransport: TransportMode;
  visitDate?: string;
  message: string;
  qrCode: string;
  onQrCode: (value: string) => void;
  onGps: () => void;
  onQr: () => void;
  onDemo: () => void;
  onActivity: (provider: ActivityProvider, actualTransport: TransportMode) => void;
  onClose: () => void;
}) {
  useModalA11y(onClose);
  const [provider, setProvider] = useState<ActivityProvider>("strava");
  const [actualTransport, setActualTransport] = useState<TransportMode>(plannedTransport);
  const text = activityCopy[locale];
  const adjustment = mobilityAdjustment(plannedTransport, actualTransport);
  const pointsEstimate = calculateVisitPoints(experience, actualTransport, visitDate);
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
        <section className="activity-verification-demo">
          <div className="activity-verification-heading">
            <Activity size={23} />
            <div><span className="ai-demo-pill">{text.future}</span><h3>{text.title}</h3><p>{text.body}</p></div>
          </div>
          <fieldset>
            <legend>{text.provider}</legend>
            <div className="activity-provider-selector">
              {(["strava", "garmin", "apple-health", "health-connect"] as const).map((item) => (
                <button type="button" key={item} className={provider === item ? "is-selected" : ""} aria-pressed={provider === item} onClick={() => setProvider(item)}>
                  {item === "strava" ? "Strava" : item === "garmin" ? "Garmin" : item === "apple-health" ? "Apple Health" : "Health Connect"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="activity-mode-comparison">
            <span><small>{text.planned}</small><strong>{transportLabel(locale, plannedTransport)}</strong></span>
            <ArrowRight size={18} />
            <fieldset>
              <legend>{text.actual}</legend>
              <div>
                {transportOptions.map((option) => {
                  const Icon = option.icon;
                  return <button type="button" key={option.id} className={actualTransport === option.id ? "is-selected" : ""} aria-pressed={actualTransport === option.id} onClick={() => setActualTransport(option.id)}><Icon size={16} /><span>{transportLabel(locale, option.id)}</span></button>;
                })}
              </div>
            </fieldset>
          </div>
          <p className={`mobility-adjustment is-${adjustment.tone}`}>
            {adjustment.tone === "bonus" ? text.bonus : adjustment.tone === "malus" ? text.malus : text.standard}
          </p>
          <div className="verification-points-breakdown">
            <span><small>{text.basePoints}</small><strong>+{pointsEstimate.base}</strong></span>
            <span><small>{text.transportBonus}</small><strong>+{pointsEstimate.transportBonus}</strong></span>
            {pointsEstimate.offPeakBonus > 0 && <span><small>{text.offPeakBonus}</small><strong>+{pointsEstimate.offPeakBonus}</strong></span>}
            <span className="is-total"><small>{text.totalPoints}</small><strong>{pointsEstimate.total} GemPoints</strong></span>
          </div>
          <button type="button" className="button button-primary button-full" onClick={() => onActivity(provider, actualTransport)}><Watch size={17} />{text.import}</button>
        </section>
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

const rewardQrCopy = {
  en: { badge: "Simulated QR · jury demo", title: "Demo reward unlocked", body: "This pop-up demonstrates the partner hand-off. The code is interactive presentation data and cannot be redeemed for a real product or discount.", expires: "Demo code expires", close: "Close demo code", aria: "Simulated reward QR code" },
  it: { badge: "QR simulato · demo giuria", title: "Premio demo sbloccato", body: "Questo pop-up simula il passaggio al partner. Il codice è un dato interattivo per la presentazione e non può essere usato per un prodotto o uno sconto reale.", expires: "Il codice demo scade", close: "Chiudi il codice demo", aria: "Codice QR premio simulato" },
  de: { badge: "Simulierter QR · Jury-Demo", title: "Demo-Prämie freigeschaltet", body: "Dieses Fenster simuliert die Übergabe beim Partner. Der Code dient nur der interaktiven Präsentation und kann nicht für ein echtes Produkt oder einen Rabatt eingelöst werden.", expires: "Demo-Code gültig bis", close: "Demo-Code schließen", aria: "Simulierter QR-Code für die Prämie" },
  fr: { badge: "QR simulé · démo jury", title: "Récompense démo débloquée", body: "Cette fenêtre simule la remise chez le partenaire. Le code sert uniquement à la présentation interactive et ne peut pas être utilisé pour un produit ou une réduction réelle.", expires: "Le code démo expire", close: "Fermer le code démo", aria: "Code QR de récompense simulé" },
  sl: { badge: "Simulirani QR · predstavitev za žirijo", title: "Predstavitvena nagrada odklenjena", body: "To okno ponazarja predajo pri partnerju. Koda je namenjena interaktivni predstavitvi in je ni mogoče unovčiti za pravi izdelek ali popust.", expires: "Predstavitvena koda poteče", close: "Zapri predstavitveno kodo", aria: "Simulirana QR-koda nagrade" },
} as const;

const simulatedQrCells = (value: string, size = 29) => {
  let seed = [...value].reduce((total, character) => (total * 33 + character.charCodeAt(0)) >>> 0, 5381);
  const inFinder = (row: number, column: number, top: number, left: number) => {
    const y = row - top;
    const x = column - left;
    if (x < 0 || y < 0 || x > 6 || y > 6) return null;
    return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const finder = inFinder(row, column, 0, 0) ?? inFinder(row, column, 0, size - 7) ?? inFinder(row, column, size - 7, 0);
    if (finder !== null) return finder;
    if (row === 6 || column === 6) return (row + column) % 2 === 0;
    seed = (seed * 1664525 + 1013904223 + index) >>> 0;
    return ((seed >>> 28) & 1) === 1;
  });
};

function RewardQrModal({ locale, unlock, label, onClose }: { locale: Locale; unlock: RewardUnlock; label: string; onClose: () => void }) {
  useModalA11y(onClose);
  const text = rewardQrCopy[locale];
  const cells = useMemo(() => simulatedQrCells(unlock.code), [unlock.code]);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reward-demo-title">
      <div className="verification-card reward-qr-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label={text.close}><X size={20} /></button>
        <span className="ai-demo-pill">{text.badge}</span>
        <h2 id="reward-demo-title">{text.title}</h2>
        <strong className="reward-qr-title">{label}</strong>
        <div className="simulated-qr" role="img" aria-label={text.aria}>
          {cells.map((dark, index) => <i key={index} className={dark ? "is-dark" : ""} />)}
        </div>
        <code>{unlock.code}</code>
        <p>{text.body}</p>
        <small>{text.expires}: {new Date(unlock.expiresAt).toLocaleTimeString(locale)}</small>
        <button type="button" className="button button-primary button-full" onClick={onClose}>{text.close}</button>
      </div>
    </div>
  );
}

const rewardVisionCopy = {
  en: { title: "From actions to Alpine rewards", body: "Verified GemPoints are account events issued by the server. The offers below remain a separate local simulation until partner agreements are active.", verified: "Verified account balance", local: "Local demo balance", demo: "Load jury demo balance", decathlon: "€10 Decathlon gift card", ski: "Local Alpine ski shop voucher", food: "Regional Alpine food box", visit: "50% off a participating Alpine visit", disclosure: "Reward examples are a product simulation. No gift card or partner discount is issued until commercial agreements are active." },
  it: { title: "Dalle azioni ai premi alpini", body: "I GemPoints verificati sono eventi dell’account emessi dal server. Le offerte qui sotto restano una simulazione locale separata fino ad accordi attivi con i partner.", verified: "Saldo account verificato", local: "Saldo demo locale", demo: "Carica saldo demo per la giuria", decathlon: "Gift card Decathlon da 10 €", ski: "Buono negozio di sci alpino locale", food: "Box di prodotti alimentari alpini", visit: "50% su una visita alpina aderente", disclosure: "Gli esempi di premio sono una simulazione di prodotto. Nessuna gift card o sconto partner viene emesso prima di accordi commerciali attivi." },
  de: { title: "Von Aktionen zu Alpenprämien", body: "Bestätigte GemPoints sind serverseitig ausgestellte Kontoereignisse. Die folgenden Angebote bleiben bis zu aktiven Partnervereinbarungen eine getrennte lokale Simulation.", verified: "Bestätigter Kontostand", local: "Lokaler Demo-Kontostand", demo: "Demo-Punktestand laden", decathlon: "10-€-Decathlon-Gutschein", ski: "Gutschein eines lokalen Skigeschäfts", food: "Regionale Alpen-Genussbox", visit: "50 % auf einen teilnehmenden Alpenbesuch", disclosure: "Prämien sind eine Produktsimulation. Gutscheine und Rabatte werden erst nach aktiven Vereinbarungen ausgegeben." },
  fr: { title: "Des actions aux récompenses alpines", body: "Les GemPoints vérifiés sont des événements de compte émis par le serveur. Les offres ci-dessous restent une simulation locale distincte jusqu’à la conclusion d’accords partenaires.", verified: "Solde de compte vérifié", local: "Solde démo local", demo: "Charger le solde démo jury", decathlon: "Carte-cadeau Decathlon de 10 €", ski: "Bon d’un magasin de ski local", food: "Coffret de produits alpins", visit: "−50 % sur une visite alpine participante", disclosure: "Ces récompenses sont une simulation. Aucune carte-cadeau ni réduction n’est émise avant la conclusion d’accords." },
  sl: { title: "Od dejanj do alpskih nagrad", body: "Potrjeni GemPoints so dogodki računa, ki jih izda strežnik. Spodnje ponudbe ostajajo ločena lokalna predstavitev do sklenitve partnerstev.", verified: "Potrjeno stanje računa", local: "Lokalno predstavitveno stanje", demo: "Naloži demo stanje za žirijo", decathlon: "Darilna kartica Decathlon 10 €", ski: "Bon lokalne alpske smučarske trgovine", food: "Paket alpskih živil", visit: "50 % popusta za sodelujoči alpski obisk", disclosure: "Nagrade so simulacija izdelka. Kartice in popusti niso izdani brez aktivnih dogovorov." },
} as const;

const feedbackBadgeCopy = {
  en: { eyebrow: "Better recommendations through feedback", title: "Community feedback badges", body: "Only submitted feedback is counted. A detailed comment needs at least 15 words so that it can provide actionable context.", total: "Alpine Voice", totalDetail: "Send 3 post-visit feedback reports", detailed: "Thoughtful Trail Guide", detailedDetail: "Send 2 useful comments of at least 15 words" },
  it: { eyebrow: "Raccomandazioni migliori grazie ai feedback", title: "Badge feedback della comunità", body: "Contano solo i feedback inviati. Un commento dettagliato deve avere almeno 15 parole per offrire un contesto davvero utile.", total: "Voce delle Alpi", totalDetail: "Invia 3 feedback dopo una visita", detailed: "Guida attenta dei sentieri", detailedDetail: "Invia 2 commenti utili di almeno 15 parole" },
  de: { eyebrow: "Bessere Empfehlungen durch Rückmeldungen", title: "Community-Feedback-Abzeichen", body: "Nur gesendete Rückmeldungen zählen. Ein ausführlicher Kommentar braucht mindestens 15 Wörter.", total: "Stimme der Alpen", totalDetail: "3 Rückmeldungen nach einem Besuch senden", detailed: "Aufmerksamer Wegbegleiter", detailedDetail: "2 hilfreiche Kommentare mit mindestens 15 Wörtern senden" },
  fr: { eyebrow: "Améliorer les recommandations par les avis", title: "Badges de contribution", body: "Seuls les avis envoyés sont comptés. Un commentaire détaillé doit comporter au moins 15 mots pour être réellement exploitable.", total: "Voix des Alpes", totalDetail: "Envoyer 3 avis après une visite", detailed: "Guide attentif", detailedDetail: "Envoyer 2 commentaires utiles d’au moins 15 mots" },
  sl: { eyebrow: "Boljša priporočila s povratnimi informacijami", title: "Značke za odzive skupnosti", body: "Štejejo le poslani odzivi. Podroben komentar mora imeti najmanj 15 besed.", total: "Glas Alp", totalDetail: "Pošlji 3 odzive po obisku", detailed: "Pozorni vodnik", detailedDetail: "Pošlji 2 uporabna komentarja z najmanj 15 besedami" },
} as const;

const collectionUi = {
  en: { all: (region: string) => `All of ${region}`, allDetail: (region: string) => `Visit every prototype-catalogue place in ${region}`, lakes: (region: string) => `${region} lake collector`, lakesDetail: (region: string) => `Visit every lake destination in ${region}`, castles: (region: string) => `${region} castle keeper`, castlesDetail: (region: string) => `Visit every castle destination in ${region}` },
  it: { all: (region: string) => `Tutta ${region}`, allDetail: (region: string) => `Visita tutte le località del catalogo prototipo in ${region}`, lakes: (region: string) => `Collezionista di laghi · ${region}`, lakesDetail: (region: string) => `Visita tutte le destinazioni lacustri in ${region}`, castles: (region: string) => `Custode dei castelli · ${region}`, castlesDetail: (region: string) => `Visita tutte le destinazioni con castelli in ${region}` },
  de: { all: (region: string) => `Ganz ${region}`, allDetail: (region: string) => `Besuche jeden Ort im Prototypkatalog in ${region}`, lakes: (region: string) => `Seensammler · ${region}`, lakesDetail: (region: string) => `Besuche jedes Seeziel in ${region}`, castles: (region: string) => `Burgenhüter · ${region}`, castlesDetail: (region: string) => `Besuche jedes Burgziel in ${region}` },
  fr: { all: (region: string) => `Toute la région ${region}`, allDetail: (region: string) => `Visitez tous les lieux du catalogue prototype en ${region}`, lakes: (region: string) => `Collection de lacs · ${region}`, lakesDetail: (region: string) => `Visitez toutes les destinations lacustres en ${region}`, castles: (region: string) => `Gardien des châteaux · ${region}`, castlesDetail: (region: string) => `Visitez toutes les destinations de châteaux en ${region}` },
  sl: { all: (region: string) => `Celotna regija ${region}`, allDetail: (region: string) => `Obišči vsak kraj iz prototipnega kataloga v regiji ${region}`, lakes: (region: string) => `Zbiratelj jezer · ${region}`, lakesDetail: (region: string) => `Obišči vse jezerske destinacije v regiji ${region}`, castles: (region: string) => `Varuh gradov · ${region}`, castlesDetail: (region: string) => `Obišči vse grajske destinacije v regiji ${region}` },
} as const;

function RewardsPage({
  locale,
  balance,
  verifiedBalance,
  ledger,
  unlocks,
  activeTrip,
  savedTrips,
  onUnlock,
  onDemoPoints,
  onShowCode,
}: {
  locale: Locale;
  balance: number;
  verifiedBalance: number | null;
  ledger: GemPointEvent[];
  unlocks: RewardUnlock[];
  activeTrip: SavedTrip | null;
  savedTrips: SavedTrip[];
  onUnlock: (id: string, cost: number, label: string) => void;
  onDemoPoints: () => void;
  onShowCode: (unlock: RewardUnlock, label: string) => void;
}) {
  const text = gemPointsCopy[locale];
  const vision = rewardVisionCopy[locale];
  const rewardLabels: Record<string, string> = {
    "decathlon-gift-card": vision.decathlon,
    "local-ski-shop": vision.ski,
    "alpine-food": vision.food,
    "half-price-visit": vision.visit,
  };
  const feedbackText = feedbackBadgeCopy[locale];
  const collectionText = collectionUi[locale];
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, detailed: 0 });
  useEffect(() => {
    const refresh = () => setFeedbackStats(readFeedbackStats());
    queueMicrotask(refresh);
    window.addEventListener("gemgo:feedback-saved", refresh);
    return () => window.removeEventListener("gemgo:feedback-saved", refresh);
  }, []);
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
  const visitedIds = new Set(
    ledger
      .filter((event) => event.type === "visit")
      .map((event) => event.metadata?.experienceId)
      .filter((id): id is string => Boolean(id)),
  );
  const collectionBadges = pilotRegions.flatMap((region) => {
    const regional = allExperiences.filter(
      (experience) => experience.region === region && experience.catalogueSource !== "team-expert",
    );
    const matches = (experience: Experience, pattern: RegExp) =>
      pattern.test(
        [
          experience.name,
          experience.destinationType ?? "",
          ...(experience.tags ?? []),
        ].join(" "),
      );
    const lakes = regional.filter((experience) =>
      matches(experience, /\b(lake|lac|lago|see|reservoir)\b/i),
    );
    const castles = regional.filter((experience) =>
      matches(
        experience,
        /\b(castle|castello|château|schloss|burg|fortress|fortified)\b/i,
      ),
    );
    return [
      {
        id: `${region}-all`,
        name: collectionText.all(region),
        detail: collectionText.allDetail(region),
        experiences: regional,
        Icon: Mountain,
      },
      ...(lakes.length
        ? [
            {
              id: `${region}-lakes`,
              name: collectionText.lakes(region),
              detail: collectionText.lakesDetail(region),
              experiences: lakes,
              Icon: Waves,
            },
          ]
        : []),
      ...(castles.length
        ? [
            {
              id: `${region}-castles`,
              name: collectionText.castles(region),
              detail: collectionText.castlesDetail(region),
              experiences: castles,
              Icon: Castle,
            },
          ]
        : []),
    ];
  });

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
          <strong>{verifiedBalance ?? balance}</strong>
          <span>GemPoints</span>
          <small>{verifiedBalance === null ? vision.local : vision.verified}</small>
        </div>
      </div>
      <div className="reward-progress-card">
        <div>
          <strong>{Math.min(balance, 100)} / 100</strong>
          <span>{vision.local}</span>
        </div>
        <div className="progress-track large">
          <span style={{ width: `${Math.min(balance, 100)}%` }} />
        </div>
      </div>
      <section className="reward-vision-card">
        <div><span className="ai-demo-pill">{text.available}</span><h2>{vision.title}</h2><p>{vision.body}</p><small>{vision.disclosure}</small></div>
        <button type="button" className="button button-secondary" onClick={onDemoPoints}><Coins size={18} />{vision.demo}</button>
      </section>
      <div className="rewards-layout">
        <div className="reward-offers-section">
          <h2>{text.available}</h2>
          <div className="reward-list">
            <RewardCard
              id="decathlon-gift-card"
              title={vision.decathlon}
              cost={500}
              balance={balance}
              onUnlock={onUnlock}
              text={text}
            />
            <RewardCard
              id="local-ski-shop"
              title={vision.ski}
              cost={350}
              balance={balance}
              onUnlock={onUnlock}
              text={text}
            />
            <RewardCard id="alpine-food" title={vision.food} cost={280} balance={balance} onUnlock={onUnlock} text={text} />
            <RewardCard id="half-price-visit" title={vision.visit} cost={700} balance={balance} onUnlock={onUnlock} text={text} />
          </div>
          {unlocks.length > 0 && (
            <div className="unlocked-list">
              <h3>{text.codes}</h3>
              {unlocks.map((unlock) => (
                <button type="button" className="unlocked-code-row" key={unlock.id} onClick={() => onShowCode(unlock, rewardLabels[unlock.rewardId] ?? unlock.rewardId)}>
                  <QrCode size={16} />
                  <strong>{unlock.code}</strong>
                  <span>
                    {text.expires}{" "}
                    {new Date(unlock.expiresAt).toLocaleTimeString(locale)}
                  </span>
                </button>
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
      <section className="badge-showcase feedback-badge-showcase">
        <div className="badge-showcase-heading">
          <span className="eyebrow"><MessageSquareText size={15} />{feedbackText.eyebrow}</span>
          <h2>{feedbackText.title}</h2>
          <p>{feedbackText.body}</p>
        </div>
        <div className="badge-showcase-grid feedback-badge-grid">
          {[
            { id: "feedback-total", name: feedbackText.total, detail: feedbackText.totalDetail, value: feedbackStats.total, goal: 3, Icon: MessageSquareText },
            { id: "feedback-detailed", name: feedbackText.detailed, detail: feedbackText.detailedDetail, value: feedbackStats.detailed, goal: 2, Icon: Sparkles },
          ].map((badge) => {
            const state = badge.value >= badge.goal ? "earned" : badge.value > 0 ? "progress" : "locked";
            return <article key={badge.id} className={`achievement-badge is-${state}`}><div className="achievement-medallion"><badge.Icon size={25} /></div><div><span>{state === "earned" ? text.earned : state === "progress" ? text.inProgress : text.notStarted}</span><h3>{badge.name}</h3><p>{badge.detail}</p><div className="badge-progress"><i style={{ width: `${Math.min(100, badge.value / badge.goal * 100)}%` }} /></div><small>{Math.min(badge.value, badge.goal)} / {badge.goal}</small></div></article>;
          })}
        </div>
      </section>
      <section className="badge-showcase collection-badge-showcase">
        <div className="badge-showcase-heading">
          <span className="eyebrow">
            <MapPin size={15} />
            {tr(locale, "Regional collections", "Collezioni regionali")}
          </span>
          <h2>
            {tr(locale, "Complete an Alpine region", "Completa una regione alpina")}
          </h2>
          <p>
            {tr(
              locale,
              "Every verified visit advances the matching place, lake and castle collections. Categories appear only where the catalogue contains at least one qualifying place.",
              "Ogni visita verificata fa avanzare le collezioni di località, laghi e castelli. Una categoria appare solo se il catalogo contiene almeno una meta valida.",
            )}
          </p>
        </div>
        <div className="badge-showcase-grid">
          {collectionBadges.map((badge) => {
            const value = badge.experiences.filter((experience) =>
              visitedIds.has(experience.id),
            ).length;
            const goal = badge.experiences.length;
            const state =
              value >= goal ? "earned" : value > 0 ? "progress" : "locked";
            const Icon = badge.Icon;
            return (
              <article
                key={badge.id}
                className={`achievement-badge is-${state}`}
              >
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
                  <h3>{badge.name}</h3>
                  <p>{badge.detail}</p>
                  <div className="badge-progress">
                    <i style={{ width: `${(value / goal) * 100}%` }} />
                  </div>
                  <small>
                    {value} / {goal}
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
        onClick={() => onUnlock(id, cost, title)}
      >
        {text.unlock}
      </button>
    </article>
  );
}
