"use client";

import {
  Award,
  Bike,
  Check,
  Compass,
  Footprints,
  Gift,
  LockKeyhole,
  LogIn,
  Medal,
  Mountain,
  Route,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GemPointEvent, RewardUnlock, SavedTrip } from "../product/storage";
import type { Locale } from "../domain";

type LocalAccount = {
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type Props = {
  locale: Locale;
  ledger: GemPointEvent[];
  savedTrips: SavedTrip[];
  unlocks: RewardUnlock[];
};

const ACCOUNT_KEY = "gemgo-local-profile-v1";
const SESSION_KEY = "gemgo-local-session-v1";
const SOUND_KEY = "gemgo-sound";

const text = {
  en: { profile: "Profile", create: "Create profile", signIn: "Sign in", name: "Name", email: "Email", password: "Password", device: "Demo profile · saved only on this device", privacy: "Your password is converted to a one-way local hash and is never sent anywhere.", badges: "Your badges", earned: "Earned", progress: "In progress", locked: "Not started", settings: "Profile settings", sound: "Interface sounds", soundHelp: "Short, unobtrusive feedback sounds. Off by default.", signOut: "Sign out", delete: "Delete local profile", invalid: "Email or password is incorrect.", short: "Use at least 8 characters for the password.", welcome: "Welcome back", signup: "Create device-only profile", signin: "Sign in on this device" },
  it: { profile: "Profilo", create: "Crea profilo", signIn: "Accedi", name: "Nome", email: "Email", password: "Password", device: "Profilo demo · salvato solo su questo dispositivo", privacy: "La password viene convertita in un hash locale non reversibile e non viene mai inviata.", badges: "I tuoi badge", earned: "Ottenuti", progress: "In corso", locked: "Non iniziati", settings: "Impostazioni profilo", sound: "Suoni dell’interfaccia", soundHelp: "Brevi suoni discreti. Disattivati per impostazione predefinita.", signOut: "Esci", delete: "Elimina profilo locale", invalid: "Email o password non corretti.", short: "Usa almeno 8 caratteri per la password.", welcome: "Bentornato", signup: "Crea profilo solo sul dispositivo", signin: "Accedi su questo dispositivo" },
  de: { profile: "Profil", create: "Profil erstellen", signIn: "Anmelden", name: "Name", email: "E-Mail", password: "Passwort", device: "Demo-Profil · nur auf diesem Gerät gespeichert", privacy: "Das Passwort wird lokal in einen nicht umkehrbaren Hash umgewandelt und nie übertragen.", badges: "Deine Abzeichen", earned: "Erhalten", progress: "In Arbeit", locked: "Noch nicht begonnen", settings: "Profileinstellungen", sound: "Oberflächentöne", soundHelp: "Kurze, dezente Töne. Standardmäßig ausgeschaltet.", signOut: "Abmelden", delete: "Lokales Profil löschen", invalid: "E-Mail oder Passwort ist falsch.", short: "Verwende mindestens 8 Zeichen.", welcome: "Willkommen zurück", signup: "Geräteprofil erstellen", signin: "Auf diesem Gerät anmelden" },
  fr: { profile: "Profil", create: "Créer un profil", signIn: "Se connecter", name: "Nom", email: "E-mail", password: "Mot de passe", device: "Profil de démonstration · enregistré uniquement sur cet appareil", privacy: "Le mot de passe est transformé en empreinte locale irréversible et n’est jamais envoyé.", badges: "Vos badges", earned: "Obtenus", progress: "En cours", locked: "Non commencés", settings: "Paramètres du profil", sound: "Sons de l’interface", soundHelp: "Sons courts et discrets. Désactivés par défaut.", signOut: "Se déconnecter", delete: "Supprimer le profil local", invalid: "E-mail ou mot de passe incorrect.", short: "Utilisez au moins 8 caractères.", welcome: "Bon retour", signup: "Créer un profil sur cet appareil", signin: "Se connecter sur cet appareil" },
  sl: { profile: "Profil", create: "Ustvari profil", signIn: "Prijava", name: "Ime", email: "E-pošta", password: "Geslo", device: "Predstavitveni profil · shranjen samo v tej napravi", privacy: "Geslo se pretvori v nepovratni lokalni povzetek in se nikoli ne pošlje.", badges: "Vaše značke", earned: "Pridobljene", progress: "V teku", locked: "Še ne začete", settings: "Nastavitve profila", sound: "Zvoki vmesnika", soundHelp: "Kratki, nevsiljivi zvoki. Privzeto izklopljeni.", signOut: "Odjava", delete: "Izbriši lokalni profil", invalid: "E-pošta ali geslo ni pravilno.", short: "Geslo naj ima vsaj 8 znakov.", welcome: "Dobrodošli nazaj", signup: "Ustvari profil v tej napravi", signin: "Prijava v tej napravi" },
} as const;

const readAccount = (): LocalAccount | null => {
  try {
    const value = window.localStorage.getItem(ACCOUNT_KEY);
    return value ? (JSON.parse(value) as LocalAccount) : null;
  } catch {
    return null;
  }
};

const passwordHash = async (password: string, salt: string) => {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export default function LocalProfilePanel({ locale, ledger, savedTrips, unlocks }: Props) {
  const t = text[locale];
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const stored = readAccount();
    queueMicrotask(() => {
      setAccount(stored);
      setSignedIn(Boolean(stored && window.localStorage.getItem(SESSION_KEY) === stored.email));
      setMode(stored ? "signin" : "signup");
      setSound(window.localStorage.getItem(SOUND_KEY) === "on");
    });
    const close = () => setOpen(false);
    window.addEventListener("gemgo:close-overlays", close);
    return () => window.removeEventListener("gemgo:close-overlays", close);
  }, []);

  const counts = useMemo(() => {
    const visits = ledger.filter((event) => event.type === "visit");
    const gemdrops = ledger.filter((event) => event.type === "gemdrop");
    const mobility = ledger.filter((event) => event.type === "mobility");
    const bikes = ledger.filter((event) => event.metadata?.transport === "bicycle");
    const green = ledger.filter((event) => ["walking", "bicycle", "public"].includes(event.metadata?.transport ?? ""));
    const lowCrowd = ledger.filter((event) => event.metadata?.crowd === "low");
    return { visits: visits.length, gemdrops: gemdrops.length, mobility: mobility.length, bikes: bikes.length, green: green.length, lowCrowd: lowCrowd.length, trips: savedTrips.length, rewards: unlocks.length };
  }, [ledger, savedTrips.length, unlocks.length]);

  const badges = [
    { id: "first-gem", label: "First Gem", detail: "Verify your first Alpine visit", value: counts.visits, goal: 1, icon: MapBadge },
    { id: "alpine-explorer", label: "Alpine Explorer", detail: "Complete 5 verified visits", value: counts.visits, goal: 5, icon: Mountain },
    { id: "bike-hero", label: "Bike Trail Hero", detail: "Complete 3 visits by bicycle", value: counts.bikes, goal: 3, icon: Bike },
    { id: "green-traveller", label: "Green Traveller", detail: "Make 5 lower-impact journeys", value: counts.green, goal: 5, icon: Footprints },
    { id: "hidden-gem", label: "Hidden Gem Hunter", detail: "Visit 3 lower-pressure places", value: counts.lowCrowd, goal: 3, icon: Compass },
    { id: "crowd-balancer", label: "Crowd Balancer", detail: "Accept 3 contextual GemDrops", value: counts.gemdrops, goal: 3, icon: Sparkles },
    { id: "route-builder", label: "Route Builder", detail: "Save 3 Alpine trips", value: counts.trips, goal: 3, icon: Route },
    { id: "local-supporter", label: "Local Supporter", detail: "Unlock a local reward", value: counts.rewards, goal: 1, icon: Gift },
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t.short);
      return;
    }
    if (mode === "signup") {
      const salt = crypto.randomUUID();
      const next: LocalAccount = { name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await passwordHash(password, salt), salt, createdAt: new Date().toISOString() };
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
      window.localStorage.setItem(SESSION_KEY, next.email);
      setAccount(next);
      setSignedIn(true);
      setPassword("");
      return;
    }
    if (!account || email.trim().toLowerCase() !== account.email || await passwordHash(password, account.salt) !== account.passwordHash) {
      setError(t.invalid);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, account.email);
    setSignedIn(true);
    setPassword("");
  };

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
      <button type="button" className="icon-text-button profile-button" onClick={toggle} aria-expanded={open}>
        {signedIn ? <User size={18} /> : <UserPlus size={18} />}
        <span>{signedIn ? account?.name.split(" ")[0] : t.profile}</span>
      </button>
      {open && (
        <div className="profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="profile-panel" role="dialog" aria-modal="true" aria-label={t.profile}>
            <header className="profile-panel-header">
              <div><span>{t.device}</span><h2>{signedIn ? `${t.welcome}, ${account?.name}` : t.profile}</h2></div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button>
            </header>
            {!signedIn ? (
              <div className="profile-auth">
                <div className="profile-auth-tabs">
                  <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")} disabled={Boolean(account)}>{t.create}</button>
                  <button type="button" className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")} disabled={!account}>{t.signIn}</button>
                </div>
                <form onSubmit={submit}>
                  {mode === "signup" && <label><span>{t.name}</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>}
                  <label><span>{t.email}</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                  <label><span>{t.password}</span><input required type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                  {error && <p className="profile-error">{error}</p>}
                  <button type="submit" className="button button-primary">{mode === "signup" ? <UserPlus size={17} /> : <LogIn size={17} />}{mode === "signup" ? t.signup : t.signin}</button>
                </form>
                <p className="profile-privacy"><LockKeyhole size={17} />{t.privacy}</p>
              </div>
            ) : (
              <>
                <div className="profile-summary"><div className="profile-avatar">{account?.name.slice(0, 1).toUpperCase()}</div><div><strong>{account?.name}</strong><span>{account?.email}</span></div><ShieldCheck size={22} /></div>
                <div className="profile-stat-row"><span><strong>{counts.visits}</strong>visits</span><span><strong>{counts.trips}</strong>trips</span><span><strong>{counts.bikes}</strong>bike trips</span><span><strong>{badges.filter((badge) => badge.value >= badge.goal).length}</strong>badges</span></div>
                <section className="badge-section"><div className="profile-section-heading"><Award size={20} /><div><h3>{t.badges}</h3><span>{t.earned} · {t.progress} · {t.locked}</span></div></div><div className="badge-grid">{badges.map((badge) => <BadgeCard key={badge.id} {...badge} labels={t} />)}</div></section>
                <section className="profile-settings"><div className="profile-section-heading"><Medal size={20} /><div><h3>{t.settings}</h3><span>{t.soundHelp}</span></div></div><button type="button" className="profile-setting" onClick={toggleSound} aria-pressed={sound}><span>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}<strong>{t.sound}</strong></span><i className={sound ? "is-on" : ""}><b /></i></button></section>
                <div className="profile-danger-actions"><button type="button" onClick={() => { window.localStorage.removeItem(SESSION_KEY); setSignedIn(false); setMode("signin"); }}>{t.signOut}</button><button type="button" onClick={() => { window.localStorage.removeItem(ACCOUNT_KEY); window.localStorage.removeItem(SESSION_KEY); setAccount(null); setSignedIn(false); setMode("signup"); }}>{t.delete}</button></div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MapBadge({ size = 20 }: { size?: number }) {
  return <Trophy size={size} />;
}

function BadgeCard({ label, detail, value, goal, icon: Icon, labels }: { label: string; detail: string; value: number; goal: number; icon: typeof Trophy; labels: typeof text.en | typeof text.it | typeof text.de | typeof text.fr | typeof text.sl }) {
  const state = value >= goal ? "earned" : value > 0 ? "progress" : "locked";
  const status = state === "earned" ? labels.earned : state === "progress" ? labels.progress : labels.locked;
  return <article className={`badge-card is-${state}`}><div className="badge-emblem"><Icon size={23} />{state === "earned" && <Check size={13} />}</div><div><span>{status}</span><strong>{label}</strong><p>{detail}</p><div className="badge-progress"><i style={{ width: `${Math.min(100, (value / goal) * 100)}%` }} /></div><small>{Math.min(value, goal)} / {goal}</small></div></article>;
}
