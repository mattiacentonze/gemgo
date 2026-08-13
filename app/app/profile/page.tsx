"use client";

import {
  Award,
  BadgeCheck,
  Bike,
  Compass,
  Footprints,
  LogOut,
  Mountain,
  Route,
  ShieldCheck,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "../../../lib/supabase/client";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import GemContributionForm from "../../components/GemContributionForm";
import { useAuth } from "../../components/AuthProvider";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";
import {
  loadLedger,
  loadSavedTrips,
  pointBalance,
  type GemPointEvent,
  type SavedTrip,
} from "../../product/storage";

const copy = {
  en: {
    title: "Your profile", intro: "Keep trips in sync and earn verified GemPoints after moderation.", guest: "Continue as guest", create: "Create account", signin: "Sign in", name: "Name", email: "Email", password: "Password", signup: "Create account", login: "Sign in", google: "Continue with Google", googleUnavailable: "Google sign-in is not configured yet", divider: "or use email", authHelp: "Passwords are handled by Supabase Auth and are never stored by GemGo in this browser.", checkEmail: "Check your inbox to confirm the account, then sign in.", authError: "Sign-in could not be completed. Check the details or try again.", signedIn: "Signed in", signout: "Sign out", role: "Role", verified: "Verified balance", demo: "Local demo balance", demoHelp: "Demo activity stays on this device and is never converted into verified GemPoints.", trips: "saved trips", badges: "Local badge progress", status: { earned: "earned", progress: "in progress", locked: "locked" }, admin: "Moderation and roles", syncError: "Cloud sync is temporarily unavailable; local account data was preserved.", stats: ["GemPoints", "verified account", "saved trips", "local badges"], roles: { member: "Member", content_editor: "Content editor", admin: "Admin", owner: "Owner" }, badgeNames: ["First Gem", "Alpine Explorer", "Bike Trail Hero", "Green Traveller", "Hidden Gem Hunter", "Route Builder"],
  },
  it: {
    title: "Il tuo profilo", intro: "Sincronizza i viaggi e ottieni GemPoints verificati dopo la moderazione.", guest: "Continua come ospite", create: "Crea account", signin: "Accedi", name: "Nome", email: "Email", password: "Password", signup: "Crea account", login: "Accedi", google: "Continua con Google", googleUnavailable: "L’accesso con Google non è ancora configurato", divider: "oppure usa l’email", authHelp: "Le password sono gestite da Supabase Auth e GemGo non le salva mai in questo browser.", checkEmail: "Controlla la posta per confermare l’account, poi accedi.", authError: "Impossibile completare l’accesso. Controlla i dati o riprova.", signedIn: "Accesso effettuato", signout: "Esci", role: "Ruolo", verified: "Saldo verificato", demo: "Saldo demo locale", demoHelp: "Le attività demo restano sul dispositivo e non diventano mai GemPoints verificati.", trips: "viaggi salvati", badges: "Progressi badge locali", status: { earned: "ottenuto", progress: "in corso", locked: "bloccato" }, admin: "Moderazione e ruoli", syncError: "Sincronizzazione cloud temporaneamente non disponibile; i dati locali dell’account sono stati conservati.", stats: ["GemPoints", "account verificato", "viaggi salvati", "badge locali"], roles: { member: "Membro", content_editor: "Editor contenuti", admin: "Admin", owner: "Owner" }, badgeNames: ["Prima Gemma", "Esploratore alpino", "Eroe dei sentieri in bici", "Viaggiatore verde", "Cacciatore di gemme nascoste", "Creatore di itinerari"],
  },
  de: {
    title: "Dein Profil", intro: "Synchronisiere Reisen und erhalte bestätigte GemPoints nach der Moderation.", guest: "Als Gast fortfahren", create: "Konto erstellen", signin: "Anmelden", name: "Name", email: "E-Mail", password: "Passwort", signup: "Konto erstellen", login: "Anmelden", google: "Mit Google fortfahren", googleUnavailable: "Google-Anmeldung ist noch nicht konfiguriert", divider: "oder E-Mail verwenden", authHelp: "Passwörter werden von Supabase Auth verarbeitet und von GemGo nie in diesem Browser gespeichert.", checkEmail: "Bestätige das Konto über die E-Mail und melde dich dann an.", authError: "Die Anmeldung konnte nicht abgeschlossen werden. Prüfe die Angaben oder versuche es erneut.", signedIn: "Angemeldet", signout: "Abmelden", role: "Rolle", verified: "Bestätigter Kontostand", demo: "Lokaler Demo-Kontostand", demoHelp: "Demo-Aktivitäten bleiben auf diesem Gerät und werden nie in bestätigte GemPoints umgewandelt.", trips: "gespeicherte Reisen", badges: "Lokaler Abzeichenfortschritt", status: { earned: "erreicht", progress: "in Arbeit", locked: "gesperrt" }, admin: "Moderation und Rollen", syncError: "Cloud-Synchronisierung ist vorübergehend nicht verfügbar; lokale Kontodaten wurden bewahrt.", stats: ["GemPoints", "bestätigtes Konto", "gespeicherte Reisen", "lokale Abzeichen"], roles: { member: "Mitglied", content_editor: "Inhaltsredaktion", admin: "Admin", owner: "Owner" }, badgeNames: ["Erster Gem", "Alpenentdecker", "Bike-Trail-Held", "Grüner Reisender", "Hidden-Gem-Jäger", "Routenbauer"],
  },
  fr: {
    title: "Votre profil", intro: "Synchronisez vos voyages et gagnez des GemPoints vérifiés après modération.", guest: "Continuer en tant qu’invité", create: "Créer un compte", signin: "Se connecter", name: "Nom", email: "E-mail", password: "Mot de passe", signup: "Créer le compte", login: "Se connecter", google: "Continuer avec Google", googleUnavailable: "La connexion Google n’est pas encore configurée", divider: "ou utiliser l’e-mail", authHelp: "Les mots de passe sont gérés par Supabase Auth et ne sont jamais stockés par GemGo dans ce navigateur.", checkEmail: "Consultez votre messagerie pour confirmer le compte, puis connectez-vous.", authError: "La connexion n’a pas pu aboutir. Vérifiez les informations ou réessayez.", signedIn: "Connecté", signout: "Se déconnecter", role: "Rôle", verified: "Solde vérifié", demo: "Solde de démonstration local", demoHelp: "L’activité de démonstration reste sur cet appareil et ne devient jamais des GemPoints vérifiés.", trips: "voyages enregistrés", badges: "Progression locale des badges", status: { earned: "obtenu", progress: "en cours", locked: "verrouillé" }, admin: "Modération et rôles", syncError: "La synchronisation cloud est momentanément indisponible ; les données locales du compte sont conservées.", stats: ["GemPoints", "compte vérifié", "voyages enregistrés", "badges locaux"], roles: { member: "Membre", content_editor: "Éditeur de contenu", admin: "Admin", owner: "Owner" }, badgeNames: ["Premier Gem", "Explorateur alpin", "Héros des pistes cyclables", "Voyageur vert", "Chasseur de joyaux cachés", "Créateur d’itinéraires"],
  },
  sl: {
    title: "Vaš profil", intro: "Sinhronizirajte poti in po moderiranju pridobite potrjene GemPoints.", guest: "Nadaljuj kot gost", create: "Ustvari račun", signin: "Prijava", name: "Ime", email: "E-pošta", password: "Geslo", signup: "Ustvari račun", login: "Prijava", google: "Nadaljuj z Googlom", googleUnavailable: "Prijava z Googlom še ni nastavljena", divider: "ali uporabi e-pošto", authHelp: "Gesla obravnava Supabase Auth; GemGo jih nikoli ne shrani v ta brskalnik.", checkEmail: "V e-pošti potrdite račun in se nato prijavite.", authError: "Prijave ni bilo mogoče dokončati. Preverite podatke ali poskusite znova.", signedIn: "Prijavljeni", signout: "Odjava", role: "Vloga", verified: "Potrjeno stanje", demo: "Lokalno predstavitveno stanje", demoHelp: "Predstavitvena dejavnost ostane v tej napravi in se nikoli ne pretvori v potrjene GemPoints.", trips: "shranjene poti", badges: "Lokalni napredek značk", status: { earned: "pridobljeno", progress: "v teku", locked: "zaklenjeno" }, admin: "Moderiranje in vloge", syncError: "Sinhronizacija z oblakom trenutno ni na voljo; lokalni podatki računa so ohranjeni.", stats: ["GemPoints", "potrjen račun", "shranjene poti", "lokalne značke"], roles: { member: "Član", content_editor: "Urednik vsebin", admin: "Admin", owner: "Owner" }, badgeNames: ["Prvi Gem", "Alpski raziskovalec", "Junak kolesarskih poti", "Zeleni popotnik", "Lovec na skrite bisere", "Načrtovalec poti"],
  },
} as const;

const badgeDefinitions = [
  { id: "first-gem", goal: 1, icon: BadgeCheck, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void trips; return events.filter((item) => item.type === "visit").length; } },
  { id: "alpine-explorer", goal: 5, icon: Mountain, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void trips; return events.filter((item) => item.type === "visit").length; } },
  { id: "bike-hero", goal: 3, icon: Bike, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void trips; return events.filter((item) => item.type === "visit" && item.metadata?.transport === "bicycle").length; } },
  { id: "green-traveller", goal: 5, icon: Footprints, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void trips; return events.filter((item) => item.type === "visit" && ["walking", "bicycle", "public"].includes(item.metadata?.transport ?? "")).length; } },
  { id: "hidden-gem-hunter", goal: 3, icon: Compass, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void trips; return events.filter((item) => item.type === "visit" && item.metadata?.crowd === "low").length; } },
  { id: "route-builder", goal: 3, icon: Route, value: (events: GemPointEvent[], trips: SavedTrip[]) => { void events; return trips.length; } },
] as const;

const soundCopy = {
  en: { title: "Interface sounds", body: "Short optional feedback sounds. Off by default." },
  it: { title: "Suoni dell’interfaccia", body: "Brevi suoni facoltativi. Disattivati per impostazione predefinita." },
  de: { title: "Oberflächentöne", body: "Kurze optionale Rückmeldetöne. Standardmäßig ausgeschaltet." },
  fr: { title: "Sons de l’interface", body: "Sons brefs facultatifs. Désactivés par défaut." },
  sl: { title: "Zvoki vmesnika", body: "Kratki neobvezni zvoki. Privzeto izključeni." },
} as const;

const isAuthSettings = (
  value: unknown,
): value is { external?: { google?: unknown } } => {
  if (!value || typeof value !== "object") return false;
  const external = (value as { external?: unknown }).external;
  return external === undefined || Boolean(external && typeof external === "object");
};

export default function ProfilePage() {
  const { locale } = usePersistentLocale();
  const t = copy[locale];
  const auth = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ledger, setLedger] = useState<GemPointEvent[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLedger(loadLedger());
      setTrips(loadSavedTrips());
      setSoundOn(window.localStorage.getItem("gemgo-sound") === "on");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [auth.user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("auth_error")) return;
    const timeout = window.setTimeout(() => setError(t.authError), 0);
    return () => window.clearTimeout(timeout);
  }, [t.authError]);

  useEffect(() => {
    const controller = new AbortController();
    const { url, publishableKey } = getSupabaseConfig();
    fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((settings: unknown) => {
        setGoogleEnabled(
          isAuthSettings(settings) && settings.external?.google === true,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setGoogleEnabled(false);
      });
    return () => controller.abort();
  }, []);

  const progress = badgeDefinitions.map((badge, index) => ({
    ...badge,
    title: t.badgeNames[index],
    current: badge.value(ledger, trips),
  }));
  const earned = progress.filter((badge) => badge.current >= badge.goal).length;

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    const redirect = `${window.location.origin}/auth/callback?next=/app/profile`;
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password: form.password,
          options: { emailRedirectTo: redirect, data: { full_name: form.name.trim().slice(0, 120) } },
        })
      : await supabase.auth.signInWithPassword({ email, password: form.password });
    setSubmitting(false);
    if (result.error) {
      setError(t.authError);
      return;
    }
    setForm({ name: "", email: "", password: "" });
    if (mode === "signup" && !result.data.session) setMessage(t.checkEmail);
  };

  const continueWithGoogle = async () => {
    if (!googleEnabled) return;
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app/profile` },
    });
    if (oauthError) setError(t.authError);
  };

  return (
    <main className="profile-page-v2">
      <section className="profile-hero-v2">
        <div>
          <span className="eyebrow"><UserRound size={15} />{auth.user ? t.signedIn : t.guest}</span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        {auth.user && (
          <div className="profile-identity">
            <span>{auth.displayName.slice(0, 1).toUpperCase()}</span>
            <div><strong>{auth.displayName}</strong><small>{auth.user.email}</small></div>
            <button type="button" onClick={() => void auth.signOut()}><LogOut size={16} />{t.signout}</button>
          </div>
        )}
      </section>

      {!auth.loading && !auth.user && (
        <section className="profile-auth-card">
          <button className="button button-secondary" type="button" disabled={googleEnabled !== true} onClick={() => void continueWithGoogle()}>{googleEnabled === false ? t.googleUnavailable : t.google}</button>
          <p className="profile-auth-divider">{t.divider}</p>
          <div className="profile-auth-tabs">
            <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>{t.create}</button>
            <button type="button" className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")}>{t.signin}</button>
          </div>
          <form onSubmit={submitEmail}>
            {mode === "signup" && <label><span>{t.name}</span><input autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
            <label><span>{t.email}</span><input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label><span>{t.password}</span><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            {error && <p className="profile-error" role="alert">{error}</p>}
            {message && <p className="profile-success" role="status">{message}</p>}
            <button className="button button-primary" disabled={submitting} type="submit">{mode === "signup" ? t.signup : t.login}</button>
            <p className="profile-privacy"><ShieldCheck size={18} />{t.authHelp}</p>
            <Link href="/app/explore">{t.guest}</Link>
          </form>
        </section>
      )}

      {auth.syncError && <p className="profile-error" role="status">{t.syncError}</p>}

      <section className="profile-stat-grid">
        <article><strong>{auth.user ? auth.verifiedBalance : 0}</strong><span>{t.stats[0]}</span></article>
        <article><strong>{auth.user ? "✓" : "—"}</strong><span>{t.stats[1]}</span></article>
        <article><strong>{trips.length}</strong><span>{t.stats[2]}</span></article>
        <article><strong>{earned}</strong><span>{t.stats[3]}</span></article>
      </section>

      {auth.user && (
        <section className="profile-lower-grid">
          <article><h2>{t.verified}</h2><strong>{auth.verifiedBalance.toLocaleString(locale)} GemPoints</strong></article>
          <article><h2>{t.role}</h2><strong>{t.roles[auth.role]}</strong>{(auth.role === "admin" || auth.role === "owner" || auth.role === "content_editor") && <p><Link href="/app/admin">{t.admin}</Link></p>}</article>
        </section>
      )}

      <section className="profile-badges-v2">
        <div className="section-intro"><span className="eyebrow"><Award size={15} />{t.demo}</span><h2>{t.badges}</h2><p>{t.demoHelp} ({pointBalance(ledger).toLocaleString(locale)}.)</p></div>
        <div className="badge-showcase-grid">
          {progress.map((badge) => {
            const Icon = badge.icon;
            const state = badge.current >= badge.goal ? "earned" : badge.current > 0 ? "progress" : "locked";
            return <article key={badge.id} className={`achievement-badge is-${state}`}><div className="achievement-medallion"><Icon /></div><div><span>{t.status[state]}</span><h3>{badge.title}</h3><div className="badge-progress"><i style={{ width: `${Math.min(100, badge.current / badge.goal * 100)}%` }} /></div><small>{Math.min(badge.current, badge.goal)} / {badge.goal}</small></div></article>;
          })}
        </div>
      </section>

      <GemContributionForm locale={locale} />

      <section className="profile-badges-v2">
        <button className="profile-setting-v2" type="button" onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          window.localStorage.setItem("gemgo-sound", next ? "on" : "off");
          window.dispatchEvent(new CustomEvent("gemgo:sound-setting", { detail: next }));
          if (next) window.dispatchEvent(new CustomEvent("gemgo:ui-sound", { detail: "success" }));
        }}>
          {soundOn ? <Volume2 /> : <VolumeX />}
          <span><strong>{soundCopy[locale].title}</strong><small>{soundCopy[locale].body}</small></span>
        </button>
      </section>
    </main>
  );
}
