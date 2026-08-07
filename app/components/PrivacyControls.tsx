"use client";

import { Download, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "../domain";

const GEMGO_KEYS = [
  "gemgo-trips-v3",
  "gemgo-active-trip-v3",
  "gemgo-multiday-itinerary-v1",
  "gemgo-points-ledger-v3",
  "gemgo-reward-unlocks-v1",
  "gemgo-visit-feedback-v1",
  "gemgo-locale-v3",
  "gemgo-sound",
  "gemgo-notifications-read-at-v1",
  "gemgo-demo-trip",
  "gemgo-demo-points",
  "gemgo-demo-saved",
  "gemgo-saved-plans",
  "gemgo-saved-plans-v2",
  "gemgo-saved-plan",
  "gemgo-location-consent",
  "gemgo-account-prompt-next",
  "gemgo-local-profile-v1",
  "gemgo-local-session-v1",
];

const privacyText = {
  en: { title: "Your local data", body: "Export it or remove only GemGo data from this browser.", export: "Export JSON", remove: "Delete local data", dialog: "Confirm deletion of local GemGo data", question: "Delete GemGo data from this browser?", warning: "Saved trips, multi-day plans, GemPoints history, feedback, reward codes, profile and local preferences will be removed. This cannot be undone.", cancel: "Cancel", confirm: "Delete data", close: "Cancel deletion" },
  it: { title: "I tuoi dati locali", body: "Esportali oppure rimuovi solo i dati GemGo da questo browser.", export: "Esporta JSON", remove: "Elimina dati locali", dialog: "Conferma eliminazione dei dati locali GemGo", question: "Eliminare i dati GemGo da questo browser?", warning: "Viaggi, piani, storico GemPoints, feedback, codici premio, profilo e preferenze locali verranno rimossi. L’azione non è reversibile.", cancel: "Annulla", confirm: "Elimina dati", close: "Annulla eliminazione" },
  de: { title: "Deine lokalen Daten", body: "Exportiere sie oder entferne nur GemGo-Daten aus diesem Browser.", export: "JSON exportieren", remove: "Lokale Daten löschen", dialog: "Löschen lokaler GemGo-Daten bestätigen", question: "GemGo-Daten aus diesem Browser löschen?", warning: "Gespeicherte Reisen, Pläne, GemPoints-Verlauf, Feedback, Prämiencodes, Profil und lokale Einstellungen werden entfernt. Dies kann nicht rückgängig gemacht werden.", cancel: "Abbrechen", confirm: "Daten löschen", close: "Löschen abbrechen" },
  fr: { title: "Vos données locales", body: "Exportez-les ou supprimez uniquement les données GemGo de ce navigateur.", export: "Exporter en JSON", remove: "Supprimer les données locales", dialog: "Confirmer la suppression des données locales GemGo", question: "Supprimer les données GemGo de ce navigateur ?", warning: "Les voyages, plans, historique GemPoints, avis, codes de récompense, profil et préférences locales seront supprimés. Cette action est irréversible.", cancel: "Annuler", confirm: "Supprimer", close: "Annuler la suppression" },
  sl: { title: "Vaši lokalni podatki", body: "Izvozite jih ali iz tega brskalnika odstranite samo podatke GemGo.", export: "Izvozi JSON", remove: "Izbriši lokalne podatke", dialog: "Potrditev izbrisa lokalnih podatkov GemGo", question: "Izbrisati podatke GemGo iz tega brskalnika?", warning: "Shranjena potovanja, načrti, zgodovina GemPoints, odzivi, kode nagrad, profil in lokalne nastavitve bodo odstranjeni. Tega ni mogoče razveljaviti.", cancel: "Prekliči", confirm: "Izbriši podatke", close: "Prekliči izbris" },
} as const;

const collectLocalData = () => {
  const data: Record<string, unknown> = {};
  GEMGO_KEYS.forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value === null) return;
    try {
      data[key] = JSON.parse(value) as unknown;
    } catch {
      data[key] = value;
    }
  });
  return {
    exportedAt: new Date().toISOString(),
    product: "GemGo",
    scope: "device-local data",
    data,
  };
};

export default function PrivacyControls() {
  const [target, setTarget] = useState<Element | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const t = privacyText[locale];

  useEffect(() => {
    const resolve = () => setTarget(document.querySelector(".integrated-app .privacy-hero"));
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setLocale((document.documentElement.lang || "en") as Locale);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const exportData = () => {
    const payload = JSON.stringify(collectLocalData(), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gemgo-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const deleteData = () => {
    GEMGO_KEYS.forEach((key) => window.localStorage.removeItem(key));
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("gemgo-commons-")) window.sessionStorage.removeItem(key);
    }
    setConfirming(false);
    window.location.assign("/app");
  };

  if (!target) return null;

  return createPortal(
    <div className="privacy-controls">
      <div className="privacy-control-heading">
        <ShieldCheck size={20} />
        <div>
          <strong>{t.title}</strong>
          <span>{t.body}</span>
        </div>
      </div>
      <div className="privacy-control-actions">
        <button type="button" className="button button-secondary" onClick={exportData}>
          <Download size={17} />
          {t.export}
        </button>
        <button type="button" className="button privacy-delete-button" onClick={() => setConfirming(true)}>
          <Trash2 size={17} />
          {t.remove}
        </button>
      </div>
      {confirming && (
        <div className="privacy-confirm" role="alertdialog" aria-label={t.dialog}>
          <button type="button" className="icon-button" aria-label={t.close} onClick={() => setConfirming(false)}>
            <X size={17} />
          </button>
          <strong>{t.question}</strong>
          <p>{t.warning}</p>
          <div>
            <button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>{t.cancel}</button>
            <button type="button" className="button privacy-delete-confirm" onClick={deleteData}>{t.confirm}</button>
          </div>
        </div>
      )}
    </div>,
    target,
  );
}
