"use client";

import Link from "next/link";
import { Award, BadgeCheck, Bike, ChevronLeft, Compass, Download, Footprints, History, LockKeyhole, Mountain, Route, ShieldCheck, Trash2, UserRound, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePersistentLocale } from "../hooks/usePersistentLocale";
import GemContributionForm from "../components/GemContributionForm";
import { appendPointEvent, loadLedger, loadSavedTrips, pointBalance, saveLedger, type GemPointEvent, type SavedTrip } from "../product/storage";

type LocalAccount = { name: string; email: string; passwordHash: string; salt: string; createdAt: string };
type BadgeHistoryItem = { id: string; title: string; createdAt: string };

const ACCOUNT_KEY = "gemgo-local-profile-v1";
const SESSION_KEY = "gemgo-local-session-v1";
const SOUND_KEY = "gemgo-sound";
const BADGE_HISTORY_KEY = "gemgo-badge-history-v1";

const ui = {
  en: { title: "Your profile", intro: "A device-only demo profile for GemPoints, badges and trip history.", local: "Saved only on this device", create: "Create profile", signin: "Sign in", name: "Name", email: "Email", password: "Password", submit: "Create device profile", login: "Sign in on this device", privacy: "The password is converted into a salted one-way hash locally and is never sent.", stats: ["GemPoints", "verified visits", "saved trips", "badges"], badges: "Badge journey", history: "Achievement history", empty: "No badges earned yet.", settings: "Profile settings", sound: "Interface sounds", soundHelp: "Short feedback sounds. Off by default.", export: "Export local data", remove: "Delete local profile", back: "Back to GemGo", congrats: "Congratulations! Your latest badge is", signout: "Sign out" },
  it: { title: "Il tuo profilo", intro: "Profilo demo locale per GemPoints, badge e storico dei viaggi.", local: "Salvato solo su questo dispositivo", create: "Crea profilo", signin: "Accedi", name: "Nome", email: "Email", password: "Password", submit: "Crea profilo sul dispositivo", login: "Accedi su questo dispositivo", privacy: "La password viene trasformata localmente in un hash con salt non reversibile e non viene mai inviata.", stats: ["GemPoints", "visite verificate", "viaggi salvati", "badge"], badges: "Percorso badge", history: "Storico traguardi", empty: "Nessun badge ancora ottenuto.", settings: "Impostazioni profilo", sound: "Suoni dell’interfaccia", soundHelp: "Brevi suoni discreti. Disattivati per impostazione predefinita.", export: "Esporta dati locali", remove: "Elimina profilo locale", back: "Torna a GemGo", congrats: "Congratulazioni! Il tuo ultimo badge è", signout: "Esci" },
  de: { title: "Dein Profil", intro: "Ein lokales Demo-Profil für GemPoints, Abzeichen und Reiseverlauf.", local: "Nur auf diesem Gerät gespeichert", create: "Profil erstellen", signin: "Anmelden", name: "Name", email: "E-Mail", password: "Passwort", submit: "Geräteprofil erstellen", login: "Auf diesem Gerät anmelden", privacy: "Das Passwort wird lokal in einen gesalzenen Einweg-Hash umgewandelt und nie übertragen.", stats: ["GemPoints", "bestätigte Besuche", "gespeicherte Reisen", "Abzeichen"], badges: "Abzeichen-Reise", history: "Erfolgsverlauf", empty: "Noch keine Abzeichen erhalten.", settings: "Profileinstellungen", sound: "Oberflächentöne", soundHelp: "Kurze Rückmeldetöne. Standardmäßig ausgeschaltet.", export: "Lokale Daten exportieren", remove: "Lokales Profil löschen", back: "Zurück zu GemGo", congrats: "Glückwunsch! Dein neuestes Abzeichen ist", signout: "Abmelden" },
  fr: { title: "Votre profil", intro: "Un profil de démonstration local pour les GemPoints, badges et voyages.", local: "Enregistré uniquement sur cet appareil", create: "Créer un profil", signin: "Se connecter", name: "Nom", email: "E-mail", password: "Mot de passe", submit: "Créer le profil local", login: "Se connecter sur cet appareil", privacy: "Le mot de passe est transformé localement en empreinte salée irréversible et n’est jamais envoyé.", stats: ["GemPoints", "visites vérifiées", "voyages enregistrés", "badges"], badges: "Parcours de badges", history: "Historique des réussites", empty: "Aucun badge obtenu.", settings: "Paramètres du profil", sound: "Sons de l’interface", soundHelp: "Sons brefs et discrets. Désactivés par défaut.", export: "Exporter les données locales", remove: "Supprimer le profil local", back: "Retour à GemGo", congrats: "Félicitations ! Votre dernier badge est", signout: "Se déconnecter" },
  sl: { title: "Vaš profil", intro: "Lokalni predstavitveni profil za GemPoints, značke in zgodovino poti.", local: "Shranjeno samo v tej napravi", create: "Ustvari profil", signin: "Prijava", name: "Ime", email: "E-pošta", password: "Geslo", submit: "Ustvari profil v napravi", login: "Prijavi se v tej napravi", privacy: "Geslo se lokalno pretvori v enosmerno zgoščeno vrednost s soljo in se nikoli ne pošlje.", stats: ["GemPoints", "potrjeni obiski", "shranjena potovanja", "značke"], badges: "Pot značk", history: "Zgodovina dosežkov", empty: "Značk še niste pridobili.", settings: "Nastavitve profila", sound: "Zvoki vmesnika", soundHelp: "Kratki, nevpadljivi zvoki. Privzeto izključeni.", export: "Izvozi lokalne podatke", remove: "Izbriši lokalni profil", back: "Nazaj na GemGo", congrats: "Čestitamo! Vaša najnovejša značka je", signout: "Odjava" },
} as const;

const badges = [
  { id: "first-gem", title: "First Gem", goal: 1, icon: BadgeCheck, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit").length; } },
  { id: "alpine-explorer", title: "Alpine Explorer", goal: 5, icon: Mountain, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit").length; } },
  { id: "bike-hero", title: "Bike Trail Hero", goal: 3, icon: Bike, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && e.metadata?.transport === "bicycle").length; } },
  { id: "green-traveller", title: "Green Traveller", goal: 5, icon: Footprints, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && ["walking", "bicycle", "public"].includes(e.metadata?.transport ?? "")).length; } },
  { id: "hidden-gem-hunter", title: "Hidden Gem Hunter", goal: 3, icon: Compass, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && e.metadata?.crowd === "low").length; } },
  { id: "route-builder", title: "Route Builder", goal: 3, icon: Route, value: (l: GemPointEvent[], t: SavedTrip[]) => { void l; return t.length; } },
] as const;

const hashPassword = async (password: string, salt: string) => {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export default function ProfilePage() {
  const { locale } = usePersistentLocale();
  const t = ui[locale];
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [ledger, setLedger] = useState<GemPointEvent[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [history, setHistory] = useState<BadgeHistoryItem[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(ACCOUNT_KEY);
        setAccount(raw ? JSON.parse(raw) : null);
        setSignedIn(localStorage.getItem(SESSION_KEY) === "active");
        setSoundOn(localStorage.getItem(SOUND_KEY) === "on");
        setHistory(JSON.parse(localStorage.getItem(BADGE_HISTORY_KEY) ?? "[]"));
      } catch { /* local state is optional */ }
      setLedger(loadLedger());
      setTrips(loadSavedTrips());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const progress = useMemo(() => badges.map((badge) => ({ ...badge, current: badge.value(ledger, trips) })), [ledger, trips]);
  const earned = progress.filter((badge) => badge.current >= badge.goal).length;
  const visits = ledger.filter((event) => event.type === "visit").length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Use at least 8 characters."); return; }
    if (authMode === "signup") {
      const salt = crypto.randomUUID();
      const next = { name: form.name.trim() || "GemGo traveller", email: form.email.trim().toLowerCase(), salt, passwordHash: await hashPassword(form.password, salt), createdAt: new Date().toISOString() };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
      localStorage.setItem(SESSION_KEY, "active");
      setAccount(next); setSignedIn(true); setForm({ name: "", email: "", password: "" });
      return;
    }
    if (!account || form.email.trim().toLowerCase() !== account.email || await hashPassword(form.password, account.salt) !== account.passwordHash) { setError("Email or password is incorrect."); return; }
    localStorage.setItem(SESSION_KEY, "active"); setSignedIn(true); setForm({ name: "", email: "", password: "" });
  };

  const exportData = () => {
    const payload = { profile: account ? { name: account.name, email: account.email, createdAt: account.createdAt } : null, ledger, trips, badges: history };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "gemgo-local-data.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  const remove = () => {
    if (!window.confirm(t.remove + "?")) return;
    localStorage.removeItem(ACCOUNT_KEY); localStorage.removeItem(SESSION_KEY); setAccount(null); setSignedIn(false);
  };

  const acceptContribution = ({ id, name, reward }: { id: string; name: string; reward: number }) => {
    const next = appendPointEvent(ledger, {
      id: `contribution-${id}`,
      amount: reward,
      type: "contribution",
      label: `Hidden gem suggestion: ${name}`,
      createdAt: new Date().toISOString(),
      status: "demo",
    });
    setLedger(next);
    saveLedger(next);
  };

  return (
    <main className="profile-page-v2">
      <header className="simple-page-header"><Link href="/" className="brand"><img src="/assets/gemgo-logo-green.svg?v=2" alt="" /><span><strong>GemGo</strong><small>Better Alpine Choices</small></span></Link><Link href="/app" className="button button-secondary"><ChevronLeft size={17} />{t.back}</Link></header>
      <section className="profile-hero-v2"><div><span className="eyebrow"><UserRound size={15} />{t.local}</span><h1>{t.title}</h1><p>{t.intro}</p></div>{signedIn && account && <div className="profile-identity"><span>{account.name.slice(0,1).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.email}</small></div><button type="button" onClick={() => { localStorage.removeItem(SESSION_KEY); setSignedIn(false); }}>{t.signout}</button></div>}</section>
      {!signedIn && <section className="profile-auth-card"><div className="profile-auth-tabs"><button className={authMode === "signup" ? "is-active" : ""} onClick={() => setAuthMode("signup")}>{t.create}</button><button className={authMode === "signin" ? "is-active" : ""} onClick={() => setAuthMode("signin")}>{t.signin}</button></div><form onSubmit={submit}>{authMode === "signup" && <label><span>{t.name}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}<label><span>{t.email}</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label><span>{t.password}</span><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{error && <p className="profile-error">{error}</p>}<button className="button button-primary" type="submit">{authMode === "signup" ? t.submit : t.login}</button><p className="profile-privacy"><ShieldCheck size={18} />{t.privacy}</p></form></section>}
      {history[0] && <section className="badge-congratulations"><Award size={31} /><div><span>{t.congrats}</span><strong>{history[0].title}</strong></div></section>}
      <section className="profile-stat-grid">{[[pointBalance(ledger),t.stats[0]],[visits,t.stats[1]],[trips.length,t.stats[2]],[earned,t.stats[3]]].map(([value,label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
      <section className="profile-badges-v2"><div className="section-intro"><span className="eyebrow"><BadgeCheck size={15} />GemGo</span><h2>{t.badges}</h2></div><div className="badge-showcase-grid">{progress.map((badge) => { const Icon = badge.icon; const state = badge.current >= badge.goal ? "earned" : badge.current > 0 ? "progress" : "locked"; return <article key={badge.id} className={`achievement-badge is-${state}`}><div className="achievement-medallion">{state === "locked" ? <LockKeyhole /> : <Icon />}</div><div><span>{state}</span><h3>{badge.title}</h3><div className="badge-progress"><i style={{ width: `${Math.min(100,badge.current/badge.goal*100)}%` }} /></div><small>{Math.min(badge.current,badge.goal)} / {badge.goal}</small></div></article>; })}</div></section>
      <GemContributionForm locale={locale} onAccepted={acceptContribution} />
      <div className="profile-lower-grid"><section><h2><History size={21} />{t.history}</h2>{history.length === 0 ? <p>{t.empty}</p> : history.map((item) => <article className="profile-history-item" key={item.id}><Award size={19} /><span><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleString(locale)}</small></span></article>)}</section><section><h2>{t.settings}</h2><button className="profile-setting-v2" onClick={() => { const next = !soundOn; setSoundOn(next); localStorage.setItem(SOUND_KEY,next ? "on" : "off"); window.dispatchEvent(new Event("gemgo:sound-setting")); }}>{soundOn ? <Volume2 /> : <VolumeX />}<span><strong>{t.sound}</strong><small>{t.soundHelp}</small></span></button><div className="profile-data-actions"><button onClick={exportData}><Download size={17} />{t.export}</button><button onClick={remove}><Trash2 size={17} />{t.remove}</button></div></section></div>
    </main>
  );
}
