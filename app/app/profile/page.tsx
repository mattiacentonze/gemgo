"use client";

import { Award, BadgeCheck, Bike, Compass, Download, Fingerprint, Footprints, History, KeyRound, LogOut, Mail, Mountain, Route, ShieldCheck, UserRound, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";
import GemContributionForm from "../../components/GemContributionForm";
import { appendPointEvent, loadCollections, loadLedger, loadSavedTrips, pointBalance, saveLedger, type GemPointEvent, type SavedTrip } from "../../product/storage";
import {
  getCurrentUser,
  getValidSession,
  passkeysSupported,
  readSession,
  registerPasskey,
  requestEmailOtp,
  signInWithGoogle,
  signInWithPasskey,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  syncAccountData,
  verifyEmailOtp,
  type SupabaseUser,
} from "../../product/supabase";

type BadgeHistoryItem = { id: string; title: string; createdAt: string };
const SOUND_KEY = "gemgo-sound";
const BADGE_HISTORY_KEY = "gemgo-badge-history-v1";

const ui = {
  en: { title: "Your profile", intro: "Your GemGo account syncs trips, GemPoints and preferences across devices.", secure: "Secure GemGo account", create: "Create account", signin: "Sign in", name: "Name", email: "Email", password: "Password", passwordHint: "Password is a fallback. Use Google, a passkey or email code when possible.", stats: ["GemPoints", "verified visits", "saved trips", "badges"], badges: "Badge journey", history: "Achievement history", empty: "No badges earned yet.", settings: "Profile settings", sound: "Interface sounds", soundHelp: "Short feedback sounds. Off by default.", export: "Export local cache", congrats: "Congratulations! Your latest badge is", signout: "Sign out", google: "Continue with Google", passkey: "Sign in with passkey", addPasskey: "Add a passkey", passkeyHelp: "Use fingerprint, Face ID, device PIN or your password manager.", emailCode: "Email me a 6-digit code", code: "6-digit code", verify: "Verify code", fallback: "Use password instead", sync: "Sync data now", synced: "Account data synced", otpSent: "Code sent. Check your email.", accountCreated: "Account created. Check your email if confirmation is required.", notConfigured: "This sign-in method is not configured yet.", data: "Your account data", auth: "Sign-in & security" },
  it: { title: "Il tuo profilo", intro: "Il tuo account GemGo sincronizza viaggi, GemPoints e preferenze tra i dispositivi.", secure: "Account GemGo sicuro", create: "Crea account", signin: "Accedi", name: "Nome", email: "Email", password: "Password", passwordHint: "La password è un ripiego. Preferisci Google, passkey o codice email.", stats: ["GemPoints", "visite verificate", "viaggi salvati", "badge"], badges: "Percorso badge", history: "Storico traguardi", empty: "Nessun badge ancora ottenuto.", settings: "Impostazioni profilo", sound: "Suoni dell’interfaccia", soundHelp: "Brevi suoni discreti. Disattivati per impostazione predefinita.", export: "Esporta cache locale", congrats: "Congratulazioni! Il tuo ultimo badge è", signout: "Esci", google: "Continua con Google", passkey: "Accedi con passkey", addPasskey: "Aggiungi una passkey", passkeyHelp: "Usa impronta, Face ID, PIN del dispositivo o password manager.", emailCode: "Inviami un codice a 6 cifre", code: "Codice a 6 cifre", verify: "Verifica codice", fallback: "Usa invece la password", sync: "Sincronizza ora", synced: "Dati account sincronizzati", otpSent: "Codice inviato. Controlla la tua email.", accountCreated: "Account creato. Controlla l'email se è richiesta la conferma.", notConfigured: "Questo metodo di accesso non è ancora configurato.", data: "I dati del tuo account", auth: "Accesso e sicurezza" },
  de: { title: "Dein Profil", intro: "Dein GemGo-Konto synchronisiert Reisen, GemPoints und Einstellungen geräteübergreifend.", secure: "Sicheres GemGo-Konto", create: "Konto erstellen", signin: "Anmelden", name: "Name", email: "E-Mail", password: "Passwort", passwordHint: "Das Passwort ist nur eine Ausweichoption. Nutze möglichst Google, Passkey oder E-Mail-Code.", stats: ["GemPoints", "bestätigte Besuche", "gespeicherte Reisen", "Abzeichen"], badges: "Abzeichen-Reise", history: "Erfolgsverlauf", empty: "Noch keine Abzeichen erhalten.", settings: "Profileinstellungen", sound: "Oberflächentöne", soundHelp: "Kurze Rückmeldetöne. Standardmäßig ausgeschaltet.", export: "Lokalen Cache exportieren", congrats: "Glückwunsch! Dein neuestes Abzeichen ist", signout: "Abmelden", google: "Mit Google fortfahren", passkey: "Mit Passkey anmelden", addPasskey: "Passkey hinzufügen", passkeyHelp: "Fingerabdruck, Face ID, Geräte-PIN oder Passwortmanager verwenden.", emailCode: "6-stelligen Code per E-Mail senden", code: "6-stelliger Code", verify: "Code bestätigen", fallback: "Stattdessen Passwort verwenden", sync: "Jetzt synchronisieren", synced: "Kontodaten synchronisiert", otpSent: "Code gesendet. Prüfe deine E-Mails.", accountCreated: "Konto erstellt. Prüfe bei Bedarf deine E-Mails zur Bestätigung.", notConfigured: "Diese Anmeldemethode ist noch nicht konfiguriert.", data: "Deine Kontodaten", auth: "Anmeldung & Sicherheit" },
  fr: { title: "Votre profil", intro: "Votre compte GemGo synchronise voyages, GemPoints et préférences entre vos appareils.", secure: "Compte GemGo sécurisé", create: "Créer un compte", signin: "Se connecter", name: "Nom", email: "E-mail", password: "Mot de passe", passwordHint: "Le mot de passe est une solution de secours. Préférez Google, une passkey ou un code e-mail.", stats: ["GemPoints", "visites vérifiées", "voyages enregistrés", "badges"], badges: "Parcours de badges", history: "Historique des réussites", empty: "Aucun badge obtenu.", settings: "Paramètres du profil", sound: "Sons de l’interface", soundHelp: "Sons brefs et discrets. Désactivés par défaut.", export: "Exporter le cache local", congrats: "Félicitations ! Votre dernier badge est", signout: "Se déconnecter", google: "Continuer avec Google", passkey: "Se connecter avec une passkey", addPasskey: "Ajouter une passkey", passkeyHelp: "Utilisez empreinte, Face ID, PIN de l’appareil ou gestionnaire de mots de passe.", emailCode: "Recevoir un code à 6 chiffres", code: "Code à 6 chiffres", verify: "Vérifier le code", fallback: "Utiliser le mot de passe", sync: "Synchroniser maintenant", synced: "Données du compte synchronisées", otpSent: "Code envoyé. Consultez vos e-mails.", accountCreated: "Compte créé. Consultez vos e-mails si une confirmation est requise.", notConfigured: "Cette méthode de connexion n’est pas encore configurée.", data: "Les données de votre compte", auth: "Connexion et sécurité" },
  sl: { title: "Vaš profil", intro: "Vaš račun GemGo sinhronizira poti, GemPoints in nastavitve med napravami.", secure: "Varen račun GemGo", create: "Ustvari račun", signin: "Prijava", name: "Ime", email: "E-pošta", password: "Geslo", passwordHint: "Geslo je rezervna možnost. Raje uporabite Google, passkey ali e-poštno kodo.", stats: ["GemPoints", "potrjeni obiski", "shranjena potovanja", "značke"], badges: "Pot značk", history: "Zgodovina dosežkov", empty: "Značk še niste pridobili.", settings: "Nastavitve profila", sound: "Zvoki vmesnika", soundHelp: "Kratki, nevpadljivi zvoki. Privzeto izključeni.", export: "Izvozi lokalni predpomnilnik", congrats: "Čestitamo! Vaša najnovejša značka je", signout: "Odjava", google: "Nadaljuj z Googlom", passkey: "Prijava s passkey", addPasskey: "Dodaj passkey", passkeyHelp: "Uporabite prstni odtis, Face ID, PIN naprave ali upravljalnik gesel.", emailCode: "Pošlji 6-mestno kodo", code: "6-mestna koda", verify: "Potrdi kodo", fallback: "Uporabi geslo", sync: "Sinhroniziraj zdaj", synced: "Podatki računa sinhronizirani", otpSent: "Koda poslana. Preverite e-pošto.", accountCreated: "Račun ustvarjen. Po potrebi potrdite e-pošto.", notConfigured: "Ta način prijave še ni nastavljen.", data: "Podatki vašega računa", auth: "Prijava in varnost" },
} as const;

const badges = [
  { id: "first-gem", title: "First Gem", goal: 1, icon: BadgeCheck, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit").length; } },
  { id: "alpine-explorer", title: "Alpine Explorer", goal: 5, icon: Mountain, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit").length; } },
  { id: "bike-hero", title: "Bike Trail Hero", goal: 3, icon: Bike, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && e.metadata?.transport === "bicycle").length; } },
  { id: "green-traveller", title: "Green Traveller", goal: 5, icon: Footprints, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && ["walking", "bicycle", "public"].includes(e.metadata?.transport ?? "")).length; } },
  { id: "hidden-gem-hunter", title: "Hidden Gem Hunter", goal: 3, icon: Compass, value: (l: GemPointEvent[], t: SavedTrip[]) => { void t; return l.filter((e) => e.type === "visit" && e.metadata?.crowd === "low").length; } },
  { id: "route-builder", title: "Route Builder", goal: 3, icon: Route, value: (l: GemPointEvent[], t: SavedTrip[]) => { void l; return t.length; } },
] as const;

export default function ProfilePage() {
  const { locale } = usePersistentLocale();
  const t = ui[locale];
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [otpRequested, setOtpRequested] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"signup" | "signin">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ledger, setLedger] = useState<GemPointEvent[]>([]);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [history, setHistory] = useState<BadgeHistoryItem[]>([]);

  const refreshLocalData = useCallback(() => {
    setLedger(loadLedger());
    setTrips(loadSavedTrips());
    setSoundOn(localStorage.getItem(SOUND_KEY) === "on");
    try { setHistory(JSON.parse(localStorage.getItem(BADGE_HISTORY_KEY) ?? "[]")); } catch { setHistory([]); }
  }, []);

  const syncNow = useCallback(async (nextUser: SupabaseUser, preferredName?: string) => {
    const savedTrips = loadSavedTrips();
    const collections = loadCollections();
    const localLedger = loadLedger();
    const displayName = preferredName?.trim() || nextUser.user_metadata?.full_name || nextUser.user_metadata?.name || nextUser.email?.split("@")[0] || "GemGo traveller";
    await syncAccountData({ user: nextUser, displayName, avatarUrl: nextUser.user_metadata?.avatar_url, savedTrips, collections, ledger: localLedger });
    setNotice(t.synced);
  }, [t.synced]);

  const loadAccount = useCallback(async () => {
    refreshLocalData();
    const session = await getValidSession();
    if (!session) { setUser(null); return; }
    const current = await getCurrentUser(session);
    setUser(current);
    if (current) await syncNow(current).catch(() => undefined);
  }, [refreshLocalData, syncNow]);

  useEffect(() => {
    void loadAccount();
    const authChanged = () => { void loadAccount(); };
    window.addEventListener("gemgo:auth-changed", authChanged);
    return () => window.removeEventListener("gemgo:auth-changed", authChanged);
  }, [loadAccount]);

  const progress = useMemo(() => badges.map((badge) => ({ ...badge, current: badge.value(ledger, trips) })), [ledger, trips]);
  const earned = progress.filter((badge) => badge.current >= badge.goal).length;
  const visits = ledger.filter((event) => event.type === "visit").length;

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true); setError(""); setNotice("");
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : "Authentication failed."); }
    finally { setBusy(false); }
  };

  const sendOtp = () => run(async () => {
    await requestEmailOtp(form.email);
    setOtpRequested(true);
    setNotice(t.otpSent);
  });

  const verifyOtp = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      await verifyEmailOtp(form.email, form.code);
      const current = await getCurrentUser(readSession());
      setUser(current);
      if (current) await syncNow(current, form.name);
    });
  };

  const passwordSubmit = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      if (form.password.length < 8) throw new Error("Use at least 8 characters.");
      if (passwordMode === "signup") {
        const result = await signUpWithPassword(form.name, form.email, form.password);
        setNotice(t.accountCreated);
        if (!result.access_token) return;
      } else {
        await signInWithPassword(form.email, form.password);
      }
      const current = await getCurrentUser(readSession());
      setUser(current);
      if (current) await syncNow(current, form.name);
    });
  };

  const exportData = () => {
    const payload = { profile: user ? { id: user.id, email: user.email, name: user.user_metadata?.full_name ?? user.user_metadata?.name } : null, ledger, trips, collections: loadCollections(), badges: history };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "gemgo-account-cache.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  const acceptContribution = ({ id, name, reward }: { id: string; name: string; reward: number }) => {
    const next = appendPointEvent(ledger, { id: `contribution-${id}`, amount: reward, type: "contribution", label: `Hidden gem suggestion: ${name}`, createdAt: new Date().toISOString(), status: "demo" });
    setLedger(next); saveLedger(next);
    if (user) void syncNow(user);
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "GemGo traveller";

  return (
    <main className="profile-page-v2">
      <section className="profile-hero-v2">
        <div><span className="eyebrow"><ShieldCheck size={15} />{t.secure}</span><h1>{t.title}</h1><p>{t.intro}</p></div>
        {user && <div className="profile-identity"><span>{displayName.slice(0,1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{user.email}</small></div><button type="button" onClick={() => void run(async () => { await signOut(); setUser(null); })}><LogOut size={15} />{t.signout}</button></div>}
      </section>

      {!user && <section className="profile-auth-card">
        <div className="section-intro"><span className="eyebrow"><KeyRound size={15} />{t.auth}</span><h2>{t.signin}</h2><p>{t.passkeyHelp}</p></div>
        <div className="profile-data-actions">
          <button disabled={busy || !passkeysSupported()} onClick={() => void run(async () => { await signInWithPasskey(); const current = await getCurrentUser(readSession()); setUser(current); if (current) await syncNow(current); })}><Fingerprint size={18} />{t.passkey}</button>
          <button disabled={busy} onClick={signInWithGoogle}><UserRound size={18} />{t.google}</button>
        </div>
        <form onSubmit={verifyOtp}>
          <label><span>{t.email}</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          {!otpRequested ? <button type="button" className="button button-primary" disabled={busy || !form.email} onClick={() => void sendOtp()}><Mail size={17} />{t.emailCode}</button> : <><label><span>{t.code}</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })} /></label><button className="button button-primary" disabled={busy || form.code.length !== 6} type="submit">{t.verify}</button></>}
        </form>
        <button type="button" className="button" onClick={() => setShowPassword((value) => !value)}>{t.fallback}</button>
        {showPassword && <form onSubmit={passwordSubmit}>
          <div className="profile-auth-tabs"><button type="button" className={passwordMode === "signin" ? "is-active" : ""} onClick={() => setPasswordMode("signin")}>{t.signin}</button><button type="button" className={passwordMode === "signup" ? "is-active" : ""} onClick={() => setPasswordMode("signup")}>{t.create}</button></div>
          {passwordMode === "signup" && <label><span>{t.name}</span><input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}
          <label><span>{t.email}</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label><span>{t.password}</span><input required type="password" minLength={8} autoComplete={passwordMode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <p className="profile-privacy"><ShieldCheck size={18} />{t.passwordHint}</p>
          <button className="button button-primary" disabled={busy} type="submit">{passwordMode === "signup" ? t.create : t.signin}</button>
        </form>}
        {notice && <p className="profile-privacy"><ShieldCheck size={18} />{notice}</p>}
        {error && <p className="profile-error">{error}</p>}
      </section>}

      {user && <section className="profile-auth-card">
        <div className="section-intro"><span className="eyebrow"><Fingerprint size={15} />{t.auth}</span><h2>{t.addPasskey}</h2><p>{t.passkeyHelp}</p></div>
        <div className="profile-data-actions"><button disabled={busy || !passkeysSupported()} onClick={() => void run(async () => { const passkey = await registerPasskey(); setNotice(`${t.addPasskey}: ${passkey.friendly_name ?? "Passkey"}`); })}><Fingerprint size={18} />{t.addPasskey}</button><button disabled={busy} onClick={() => void run(async () => { await syncNow(user); })}><ShieldCheck size={18} />{t.sync}</button></div>
        {notice && <p className="profile-privacy"><ShieldCheck size={18} />{notice}</p>}
        {error && <p className="profile-error">{error}</p>}
      </section>}

      {history[0] && <section className="badge-congratulations"><Award size={31} /><div><span>{t.congrats}</span><strong>{history[0].title}</strong></div></section>}
      <section className="profile-stat-grid">{[[pointBalance(ledger),t.stats[0]],[visits,t.stats[1]],[trips.length,t.stats[2]],[earned,t.stats[3]]].map(([value,label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
      <section className="profile-badges-v2"><div className="section-intro"><span className="eyebrow"><BadgeCheck size={15} />GemGo</span><h2>{t.badges}</h2></div><div className="badge-showcase-grid">{progress.map((badge) => { const Icon = badge.icon; const state = badge.current >= badge.goal ? "earned" : badge.current > 0 ? "progress" : "locked"; return <article key={badge.id} className={`achievement-badge is-${state}`}><div className="achievement-medallion">{state === "locked" ? <KeyRound /> : <Icon />}</div><div><span>{state}</span><h3>{badge.title}</h3><div className="badge-progress"><i style={{ width: `${Math.min(100,badge.current/badge.goal*100)}%` }} /></div><small>{Math.min(badge.current,badge.goal)} / {badge.goal}</small></div></article>; })}</div></section>
      <GemContributionForm locale={locale} onAccepted={acceptContribution} />
      <div className="profile-lower-grid"><section><h2><History size={21} />{t.history}</h2>{history.length === 0 ? <p>{t.empty}</p> : history.map((item) => <article className="profile-history-item" key={item.id}><Award size={19} /><span><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleString(locale)}</small></span></article>)}</section><section><h2>{t.settings}</h2><button className="profile-setting-v2" onClick={() => { const next = !soundOn; setSoundOn(next); localStorage.setItem(SOUND_KEY,next ? "on" : "off"); window.dispatchEvent(new CustomEvent("gemgo:sound-setting", { detail: next })); }}>{soundOn ? <Volume2 /> : <VolumeX />}<span><strong>{t.sound}</strong><small>{t.soundHelp}</small></span></button><div className="profile-data-actions"><button onClick={exportData}><Download size={17} />{t.export}</button></div></section></div>
    </main>
  );
}
