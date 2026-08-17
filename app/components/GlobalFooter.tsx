"use client";

import Link from "next/link";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import { buildInfo } from "../generated/build-info";
import { usePersistentLocale } from "../hooks/usePersistentLocale";

const copy = {
  en: {
    tagline: "Better Alpine choices",
    home: "GemGo home",
    nav: "Footer links",
    body: "Pan-Alpine recommendations, visit verification and better visitor-flow distribution.",
    about: "About",
    privacy: "Privacy",
    app: "Open GemGo",
    reset: "Reset demo data",
    confirm: "Reset all GemGo demo data stored in this browser and start again?",
    version: "Version",
    updated: "Last updated",
    demo: "Prototype · live, estimated and demonstrative data are labelled in context.",
  },
  it: {
    tagline: "Scelte alpine migliori",
    home: "Homepage GemGo",
    nav: "Link a piè di pagina",
    body: "Raccomandazioni pan-alpine, verifica delle visite e migliore distribuzione dei flussi.",
    about: "Informazioni",
    privacy: "Privacy",
    app: "Apri GemGo",
    reset: "Reimposta dati demo",
    confirm: "Reimpostare tutti i dati demo GemGo salvati in questo browser e ricominciare?",
    version: "Versione",
    updated: "Ultimo aggiornamento",
    demo: "Prototipo · dati live, stimati e dimostrativi sono indicati nel contesto.",
  },
  de: {
    tagline: "Bessere Entscheidungen in den Alpen",
    home: "GemGo-Startseite",
    nav: "Links im Seitenfuß",
    body: "Alpenweite Empfehlungen, Besuchsbestätigung und bessere Verteilung der Besucherströme.",
    about: "Über GemGo",
    privacy: "Datenschutz",
    app: "GemGo öffnen",
    reset: "Demodaten zurücksetzen",
    confirm: "Alle in diesem Browser gespeicherten GemGo-Demodaten löschen und neu beginnen?",
    version: "Version",
    updated: "Zuletzt aktualisiert",
    demo: "Prototyp · Live-, Schätz- und Demodaten sind im Kontext gekennzeichnet.",
  },
  fr: {
    tagline: "De meilleurs choix alpins",
    home: "Accueil GemGo",
    nav: "Liens de pied de page",
    body: "Recommandations panalpines, vérification des visites et meilleure répartition des flux.",
    about: "À propos",
    privacy: "Confidentialité",
    app: "Ouvrir GemGo",
    reset: "Réinitialiser les données démo",
    confirm: "Effacer toutes les données de démonstration GemGo de ce navigateur et recommencer ?",
    version: "Version",
    updated: "Dernière mise à jour",
    demo: "Prototype · les données en direct, estimées et de démonstration sont signalées dans leur contexte.",
  },
  sl: {
    tagline: "Boljše izbire v Alpah",
    home: "Domača stran GemGo",
    nav: "Povezave v nogi",
    body: "Vsealpska priporočila, potrjevanje obiskov in boljša porazdelitev obiskovalcev.",
    about: "O projektu",
    privacy: "Zasebnost",
    app: "Odpri GemGo",
    reset: "Ponastavi predstavitvene podatke",
    confirm: "Izbrišem vse predstavitvene podatke GemGo v tem brskalniku in začnem znova?",
    version: "Različica",
    updated: "Nazadnje posodobljeno",
    demo: "Prototip · podatki v živo, ocene in predstavitveni podatki so označeni v kontekstu.",
  },
} as const;

const clearDemoData = async () => {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.filter((key): key is string => Boolean(key?.startsWith("gemgo"))).forEach((key) => storage.removeItem(key));
  }
  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith("gemgo")).map((name) => window.caches.delete(name)));
  }
};

export default function GlobalFooter() {
  const { locale } = usePersistentLocale();
  const text = copy[locale];
  const updatedAt = new Date(buildInfo.updatedAt);
  const localizedDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" }).format(updatedAt);
  const localizedTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZoneName: "short", timeZone: "Europe/Rome" }).format(updatedAt);

  const reset = async () => {
    if (!window.confirm(text.confirm)) return;
    await clearDemoData();
    window.location.assign("/");
  };

  return (
    <footer className="global-site-footer">
      <div className="global-footer-main">
        <Link href="/" className="global-footer-brand" aria-label={text.home}>
          <img src="/assets/gemgo-logo-green.svg?v=2" alt="" />
          <span><strong>GemGo</strong><small>{text.tagline}</small></span>
        </Link>
        <p>{text.body}</p>
        <nav aria-label={text.nav}>
          <Link href="/app/explore">{text.app}</Link>
          <Link href="/about">{text.about}</Link>
          <Link href="/privacy"><ShieldCheck size={15} />{text.privacy}</Link>
        </nav>
      </div>
      <div className="global-footer-meta">
        <small>{text.demo}</small>
        <button type="button" onClick={() => void reset()}><RefreshCcw size={15} />{text.reset}</button>
        <code title={buildInfo.updatedAt}>{text.version} {buildInfo.version} · {text.updated} {localizedDate}, {localizedTime}</code>
      </div>
    </footer>
  );
}
