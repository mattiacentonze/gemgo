"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Coins, Gift, MapPin, Route } from "lucide-react";
import { useEffect, useState } from "react";
import MarketingHeader from "../components/MarketingHeader";
import { usePersistentLocale } from "../hooks/usePersistentLocale";
import { marketingCopy } from "../i18n/marketing";
import type {
  GemPointEvent,
  RewardUnlock,
  SavedTrip,
} from "../product/storage";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "trip" | "points" | "reward" | "system";
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const copy = {
  en: {
    eyebrow: "Device-local history",
    title: "Notifications",
    intro: "Trip, GemPoints and badge activity stored in this browser.",
    empty: "No activity yet.",
    back: "Back to the app",
    system: "Prototype data remains clearly labelled.",
    systemBody:
      "Live, estimated and demonstrative information are kept distinct.",
  },
  it: {
    eyebrow: "Cronologia sul dispositivo",
    title: "Notifiche",
    intro: "Attività di viaggi, GemPoints e badge salvata in questo browser.",
    empty: "Nessuna attività.",
    back: "Torna all’app",
    system: "I dati del prototipo restano chiaramente indicati.",
    systemBody:
      "Le informazioni live, stimate e dimostrative rimangono distinte.",
  },
  de: {
    eyebrow: "Lokaler Verlauf",
    title: "Benachrichtigungen",
    intro: "Reise-, GemPoints- und Abzeichenaktivität in diesem Browser.",
    empty: "Noch keine Aktivität.",
    back: "Zurück zur App",
    system: "Prototypdaten bleiben klar gekennzeichnet.",
    systemBody: "Live-, Schätz- und Demodaten bleiben getrennt.",
  },
  fr: {
    eyebrow: "Historique local",
    title: "Notifications",
    intro:
      "Activité des voyages, GemPoints et badges enregistrée dans ce navigateur.",
    empty: "Aucune activité.",
    back: "Retour à l’app",
    system: "Les données du prototype restent clairement indiquées.",
    systemBody:
      "Les informations en direct, estimées et de démonstration restent distinctes.",
  },
  sl: {
    eyebrow: "Lokalna zgodovina",
    title: "Obvestila",
    intro: "Dejavnost poti, GemPoints in značk v tem brskalniku.",
    empty: "Dejavnosti še ni.",
    back: "Nazaj v aplikacijo",
    system: "Podatki prototipa ostajajo jasno označeni.",
    systemBody: "Podatki v živo, ocene in predstavitveni podatki so ločeni.",
  },
} as const;

const buildNotifications = (locale: keyof typeof copy): NotificationItem[] => {
  const text = copy[locale];
  const activeTrip = readJson<SavedTrip | null>("gemgo-active-trip-v3", null);
  const ledger = readJson<GemPointEvent[]>("gemgo-points-ledger-v3", []);
  const rewards = readJson<RewardUnlock[]>("gemgo-reward-unlocks-v1", []);
  const items: NotificationItem[] = [
    {
      id: "system",
      title: text.system,
      detail: text.systemBody,
      createdAt: "2026-08-07T00:00:00.000Z",
      kind: "system",
    },
  ];
  if (activeTrip)
    items.push({
      id: activeTrip.id,
      title: activeTrip.name,
      detail: activeTrip.trip.verified
        ? "Visit verified"
        : "Trip saved on this device",
      createdAt: activeTrip.updatedAt,
      kind: "trip",
    });
  ledger.forEach((event) =>
    items.push({
      id: event.id,
      title: `${event.amount > 0 ? "+" : ""}${event.amount} GemPoints`,
      detail: event.label,
      createdAt: event.createdAt,
      kind: "points",
    }),
  );
  rewards.forEach((reward) =>
    items.push({
      id: reward.id,
      title: reward.code,
      detail: "Demonstration reward",
      createdAt: reward.createdAt,
      kind: "reward",
    }),
  );
  return items.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
};

export default function NotificationsPage() {
  const { locale, setLocale } = usePersistentLocale();
  const text = copy[locale];
  const [items, setItems] = useState<NotificationItem[]>([]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setItems(buildNotifications(locale));
    });
    return () => {
      active = false;
    };
  }, [locale]);
  const icon = (kind: NotificationItem["kind"]) =>
    kind === "trip" ? (
      <Route />
    ) : kind === "points" ? (
      <Coins />
    ) : kind === "reward" ? (
      <Gift />
    ) : (
      <MapPin />
    );
  return (
    <main className="marketing-page standalone-info-page notifications-page">
      <MarketingHeader
        locale={locale}
        onLocaleChange={setLocale}
        copy={marketingCopy[locale]}
      />
      <section className="info-page-hero">
        <span className="eyebrow">
          <Bell size={15} />
          {text.eyebrow}
        </span>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </section>
      <section className="notification-history-page">
        {items.length ? (
          items.map((item) => (
            <article key={item.id}>
              <span>{icon(item.kind)}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString(locale)}
                </time>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <CheckCircle2 />
            <p>{text.empty}</p>
          </div>
        )}
      </section>
      <Link href="/app/explore" className="button button-primary notification-back">
        {text.back}
      </Link>
    </main>
  );
}
