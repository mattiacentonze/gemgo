"use client";

import { Award, Bike, Check, Compass, Footprints, Gift, LogOut, Medal, Mountain, Route, ShieldCheck, Sparkles, Trophy, User, UserPlus, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { createPortal } from "react-dom";
import type { GemPointEvent, RewardUnlock, SavedTrip } from "../product/storage";
import type { Locale } from "../domain";
import { getCurrentUser, getValidSession, signOut, type SupabaseUser } from "../product/supabase";

type Props = {
  locale: Locale;
  ledger: GemPointEvent[];
  savedTrips: SavedTrip[];
  unlocks: RewardUnlock[];
};

const SOUND_KEY = "gemgo-sound";

const text = {
  en: { profile: "Profile", device: "Secure GemGo account", badges: "Your badges", earned: "Earned", progress: "In progress", locked: "Not started", settings: "Profile settings", sound: "Interface sounds", soundHelp: "Short, unobtrusive feedback sounds. Off by default.", signOut: "Sign out", visits: "visits", trips: "trips", bikes: "bike trips", badgeCount: "badges", close: "Close profile", openAccount: "Sign in or manage account", signedOut: "Sign in to sync trips, GemPoints and preferences across devices." },
  it: { profile: "Profilo", device: "Account GemGo sicuro", badges: "I tuoi badge", earned: "Ottenuti", progress: "In corso", locked: "Non iniziati", settings: "Impostazioni profilo", sound: "Suoni dell’interfaccia", soundHelp: "Brevi suoni discreti. Disattivati per impostazione predefinita.", signOut: "Esci", visits: "visite", trips: "viaggi", bikes: "viaggi in bici", badgeCount: "badge", close: "Chiudi profilo", openAccount: "Accedi o gestisci account", signedOut: "Accedi per sincronizzare viaggi, GemPoints e preferenze tra i dispositivi." },
  de: { profile: "Profil", device: "Sicheres GemGo-Konto", badges: "Deine Abzeichen", earned: "Erhalten", progress: "In Arbeit", locked: "Noch nicht begonnen", settings: "Profileinstellungen", sound: "Oberflächentöne", soundHelp: "Kurze, dezente Töne. Standardmäßig ausgeschaltet.", signOut: "Abmelden", visits: "Besuche", trips: "Reisen", bikes: "Radfahrten", badgeCount: "Abzeichen", close: "Profil schließen", openAccount: "Anmelden oder Konto verwalten", signedOut: "Melde dich an, um Reisen, GemPoints und Einstellungen zu synchronisieren." },
  fr: { profile: "Profil", device: "Compte GemGo sécurisé", badges: "Vos badges", earned: "Obtenus", progress: "En cours", locked: "Non commencés", settings: "Paramètres du profil", sound: "Sons de l’interface", soundHelp: "Sons courts et discrets. Désactivés par défaut.", signOut: "Se déconnecter", visits: "visites", trips: "voyages", bikes: "trajets à vélo", badgeCount: "badges", close: "Fermer le profil", openAccount: "Se connecter ou gérer le compte", signedOut: "Connectez-vous pour synchroniser voyages, GemPoints et préférences." },
  sl: { profile: "Profil", device: "Varen račun GemGo", badges: "Vaše značke", earned: "Pridobljene", progress: "V teku", locked: "Še ne začete", settings: "Nastavitve profila", sound: "Zvoki vmesnika", soundHelp: "Kratki, nevsiljivi zvoki. Privzeto izklopljeni.", signOut: "Odjava", visits: "obiski", trips: "potovanja", bikes: "kolesarske poti", badgeCount: "značke", close: "Zapri profil", openAccount: "Prijava ali upravljanje računa", signedOut: "Prijavite se za sinhronizacijo poti, GemPoints in nastavitev." },
} as const;

const badgeText = {
  en: [["First Gem", "Verify your first Alpine visit"], ["Alpine Explorer", "Complete 5 verified visits"], ["Bike Trail Hero", "Complete 3 visits by bicycle"], ["Green Traveller", "Make 5 lower-impact journeys"], ["Hidden Gem Hunter", "Visit 3 lower-pressure places"], ["Crowd Balancer", "Accept 3 contextual GemDrops"], ["Route Builder", "Save 3 Alpine trips"], ["Local Supporter", "Unlock a local reward"]],
  it: [["Prima gemma", "Verifica la prima visita alpina"], ["Esploratore alpino", "Completa 5 visite verificate"], ["Eroe della bici", "Completa 3 visite in bicicletta"], ["Viaggiatore green", "Fai 5 viaggi a minore impatto"], ["Cacciatore di gemme", "Visita 3 luoghi a minore pressione"], ["Equilibratore dei flussi", "Accetta 3 GemDrop contestuali"], ["Creatore di itinerari", "Salva 3 viaggi alpini"], ["Sostenitore locale", "Sblocca un premio locale"]],
  de: [["Erstes Juwel", "Bestätige deinen ersten Alpenbesuch"], ["Alpenentdecker", "Schließe 5 bestätigte Besuche ab"], ["Radweg-Held", "Schließe 3 Besuche mit dem Fahrrad ab"], ["Grüner Reisender", "Unternimm 5 umweltschonende Reisen"], ["Geheimtipp-Jäger", "Besuche 3 weniger belastete Orte"], ["Besucherlenker", "Akzeptiere 3 kontextuelle GemDrops"], ["Routenplaner", "Speichere 3 Alpenreisen"], ["Lokaler Unterstützer", "Schalte eine lokale Prämie frei"]],
  fr: [["Première pépite", "Validez votre première visite alpine"], ["Explorateur alpin", "Effectuez 5 visites vérifiées"], ["Héros du vélo", "Effectuez 3 visites à vélo"], ["Voyageur responsable", "Effectuez 5 trajets à faible impact"], ["Chasseur de pépites", "Visitez 3 lieux moins fréquentés"], ["Équilibreur de flux", "Acceptez 3 GemDrops contextuels"], ["Créateur d’itinéraires", "Enregistrez 3 voyages alpins"], ["Soutien local", "Débloquez une récompense locale"]],
  sl: [["Prvi dragulj", "Potrdite prvi alpski obisk"], ["Alpski raziskovalec", "Opravite 5 potrjenih obiskov"], ["Kolesarski junak", "Opravite 3 obiske s kolesom"], ["Zeleni popotnik", "Opravite 5 poti z manjšim vplivom"], ["Lovec na skrite dragulje", "Obiščite 3 manj obremenjene kraje"], ["Uravnoteževalec obiska", "Sprejmite 3 kontekstualne GemDrope"], ["Načrtovalec poti", "Shranite 3 alpska potovanja"], ["Lokalni podpornik", "Odklenite lokalno nagrado"]],
} as const;

export default function LocalProfilePanel({ locale, ledger, savedTrips, unlocks }: Props) {
  const t = text[locale];
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sound, setSound] = useState(false);

  const refreshUser = async () => {
    const session = await getValidSession();
    setUser(session ? await getCurrentUser(session) : null);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refreshUser();
      setSound(window.localStorage.getItem(SOUND_KEY) === "on");
    });
    const close = () => setOpen(false);
    const authChanged = () => { void refreshUser(); };
    window.addEventListener("gemgo:close-overlays", close);
    window.addEventListener("gemgo:auth-changed", authChanged);
    return () => {
      window.removeEventListener("gemgo:close-overlays", close);
      window.removeEventListener("gemgo:auth-changed", authChanged);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("has-open-profile", open);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.documentElement.classList.remove("has-open-profile");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const counts = useMemo(() => {
    const visits = ledger.filter((event) => event.type === "visit");
    const gemdrops = ledger.filter((event) => event.type === "gemdrop");
    const bikes = ledger.filter((event) => event.metadata?.transport === "bicycle");
    const green = ledger.filter((event) => ["walking", "bicycle", "public"].includes(event.metadata?.transport ?? ""));
    const lowCrowd = ledger.filter((event) => event.metadata?.crowd === "low");
    return { visits: visits.length, gemdrops: gemdrops.length, bikes: bikes.length, green: green.length, lowCrowd: lowCrowd.length, trips: savedTrips.length, rewards: unlocks.length };
  }, [ledger, savedTrips.length, unlocks.length]);

  const localizedBadges = badgeText[locale];
  const badges = [
    { id: "first-gem", label: localizedBadges[0][0], detail: localizedBadges[0][1], value: counts.visits, goal: 1, icon: MapBadge },
    { id: "alpine-explorer", label: localizedBadges[1][0], detail: localizedBadges[1][1], value: counts.visits, goal: 5, icon: Mountain },
    { id: "bike-hero", label: localizedBadges[2][0], detail: localizedBadges[2][1], value: counts.bikes, goal: 3, icon: Bike },
    { id: "green-traveller", label: localizedBadges[3][0], detail: localizedBadges[3][1], value: counts.green, goal: 5, icon: Footprints },
    { id: "hidden-gem", label: localizedBadges[4][0], detail: localizedBadges[4][1], value: counts.lowCrowd, goal: 3, icon: Compass },
    { id: "crowd-balancer", label: localizedBadges[5][0], detail: localizedBadges[5][1], value: counts.gemdrops, goal: 3, icon: Sparkles },
    { id: "route-builder", label: localizedBadges[6][0], detail: localizedBadges[6][1], value: counts.trips, goal: 3, icon: Route },
    { id: "local-supporter", label: localizedBadges[7][0], detail: localizedBadges[7][1], value: counts.rewards, goal: 1, icon: Gift },
  ];
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || t.profile;

  const toggle = () => {
    if (!open) window.dispatchEvent(new Event("gemgo:close-overlays"));
    setOpen((value) => !value);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    window.dispatchEvent(new CustomEvent("gemgo:sound-setting", { detail: next }));
  };

  return (
    <div className="local-profile-control">
      <button type="button" className="icon-text-button profile-button" onClick={toggle} aria-label={t.profile} aria-expanded={open}>
        {user ? <User size={18} /> : <UserPlus size={18} />}
        <span>{user ? displayName.split(" ")[0] : t.profile}</span>
      </button>
      {open && createPortal(
        <div className="profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="profile-panel" role="dialog" aria-modal="true" aria-label={t.profile}>
            <header className="profile-panel-header">
              <div><span>{t.device}</span><h2>{user ? displayName : t.profile}</h2></div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t.close}><X size={19} /></button>
            </header>
            {!user ? (
              <div className="profile-auth">
                <p className="profile-privacy"><ShieldCheck size={17} />{t.signedOut}</p>
                <button type="button" className="button button-primary" onClick={() => { window.location.assign("/app/profile"); }}>{t.openAccount}</button>
              </div>
            ) : (
              <>
                <div className="profile-summary"><div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><strong>{displayName}</strong><span>{user.email}</span></div><ShieldCheck size={22} /></div>
                <div className="profile-stat-row"><span><strong>{counts.visits}</strong>{t.visits}</span><span><strong>{counts.trips}</strong>{t.trips}</span><span><strong>{counts.bikes}</strong>{t.bikes}</span><span><strong>{badges.filter((badge) => badge.value >= badge.goal).length}</strong>{t.badgeCount}</span></div>
                <section className="badge-section"><div className="profile-section-heading"><Award size={20} /><div><h3>{t.badges}</h3><span>{t.earned} · {t.progress} · {t.locked}</span></div></div><div className="badge-grid">{badges.map((badge) => <BadgeCard key={badge.id} {...badge} labels={t} />)}</div></section>
                <section className="profile-settings"><div className="profile-section-heading"><Medal size={20} /><div><h3>{t.settings}</h3><span>{t.soundHelp}</span></div></div><button type="button" className="profile-setting" onClick={toggleSound} aria-pressed={sound}><span>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}<strong>{t.sound}</strong></span><i className={sound ? "is-on" : ""}><b /></i></button></section>
                <div className="profile-danger-actions"><button type="button" onClick={() => { window.location.assign("/app/profile"); }}>{t.openAccount}</button><button type="button" onClick={() => { void signOut().then(() => setUser(null)); }}><LogOut size={16} />{t.signOut}</button></div>
              </>
            )}
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

function MapBadge({ size = 20 }: { size?: number }) { return <Trophy size={size} />; }

function BadgeCard({ label, detail, value, goal, icon: Icon, labels }: { label: string; detail: string; value: number; goal: number; icon: ComponentType<{ size?: number }>; labels: typeof text.en | typeof text.it | typeof text.de | typeof text.fr | typeof text.sl }) {
  const state = value >= goal ? "earned" : value > 0 ? "progress" : "locked";
  const status = state === "earned" ? labels.earned : state === "progress" ? labels.progress : labels.locked;
  return <article className={`badge-card is-${state}`}><div className="badge-emblem"><Icon size={23} />{state === "earned" && <Check size={13} />}</div><div><span>{status}</span><strong>{label}</strong><p>{detail}</p><div className="badge-progress"><i style={{ width: `${Math.min(100, (value / goal) * 100)}%` }} /></div><small>{Math.min(value, goal)} / {goal}</small></div></article>;
}
