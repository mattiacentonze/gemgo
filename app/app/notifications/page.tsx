"use client";

import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Coins,
  Gift,
  MapPin,
  Route,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";
import {
  loadReadNotificationIds,
  loadStoredNotifications,
  markNotificationsRead,
  getDeviceNotificationState,
  requestDeviceNotifications,
  showDeviceNotification,
  type DeviceNotificationState,
  type StoredNotification,
} from "../../product/notifications";
import type {
  GemPointEvent,
  RewardUnlock,
  SavedTrip,
} from "../../product/storage";

type NotificationItem = StoredNotification;

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
    empty: "Nothing to report yet.",
    markAll: "Mark all as read",
    allRead: "Everything is already read",
    system: "Prototype data remains clearly labelled.",
    systemBody: "Live, estimated and demonstrative information are kept distinct.",
    tripSaved: "Trip saved on this device",
    visitVerified: "Visit verified",
    reward: "Demonstration reward",
    deviceTitle: "Notifications that reach this device",
    deviceEyebrow: "System permission",
    deviceBody: "Allow GemGo to show real system notifications on this computer or phone when an in-app event occurs.",
    devicePrivacy: "Permission is requested by your browser. GemGo does not receive your notification settings.",
    enableDevice: "Enable device notifications",
    testDevice: "Send a test notification",
    deviceEnabled: "Device notifications are enabled.",
    deviceDenied: "Notifications are blocked. Re-enable them in this site’s browser settings.",
    deviceUnsupported: "This browser cannot show web notifications. On iPhone or iPad, first add GemGo to the Home Screen and open it there.",
    testTitle: "GemGo notifications are active",
    testBody: "Future trip, crowd and GemPoints updates can now appear on this device.",
  },
  it: {
    eyebrow: "Cronologia sul dispositivo",
    title: "Notifiche",
    intro: "Attività di viaggi, GemPoints e badge salvata in questo browser.",
    empty: "Niente da segnalare.",
    markAll: "Segna tutto come già letto",
    allRead: "Hai già letto tutto",
    system: "I dati del prototipo restano chiaramente indicati.",
    systemBody: "Le informazioni live, stimate e dimostrative rimangono distinte.",
    tripSaved: "Viaggio salvato su questo dispositivo",
    visitVerified: "Visita verificata",
    reward: "Premio dimostrativo",
    deviceTitle: "Notifiche che arrivano su questo dispositivo",
    deviceEyebrow: "Permesso di sistema",
    deviceBody: "Consenti a GemGo di mostrare vere notifiche di sistema su questo computer o telefono quando avviene un evento nell’app.",
    devicePrivacy: "Il permesso viene gestito dal browser. GemGo non riceve le tue impostazioni di notifica.",
    enableDevice: "Attiva notifiche sul dispositivo",
    testDevice: "Invia una notifica di prova",
    deviceEnabled: "Le notifiche sul dispositivo sono attive.",
    deviceDenied: "Le notifiche sono bloccate. Riattivale nelle impostazioni del browser per questo sito.",
    deviceUnsupported: "Questo browser non supporta le notifiche web. Su iPhone o iPad, aggiungi prima GemGo alla schermata Home e aprila da lì.",
    testTitle: "Le notifiche GemGo sono attive",
    testBody: "Gli aggiornamenti su viaggio, affollamento e GemPoints possono ora comparire su questo dispositivo.",
  },
  de: {
    eyebrow: "Lokaler Verlauf",
    title: "Benachrichtigungen",
    intro: "Reise-, GemPoints- und Abzeichenaktivität in diesem Browser.",
    empty: "Noch nichts zu melden.",
    markAll: "Alle als gelesen markieren",
    allRead: "Alles ist bereits gelesen",
    system: "Prototypdaten bleiben klar gekennzeichnet.",
    systemBody: "Live-, Schätz- und Demodaten bleiben getrennt.",
    tripSaved: "Reise auf diesem Gerät gespeichert",
    visitVerified: "Besuch bestätigt",
    reward: "Demo-Prämie",
    deviceTitle: "Benachrichtigungen auf diesem Gerät",
    deviceEyebrow: "Systemberechtigung",
    deviceBody: "Erlaube GemGo, echte Systembenachrichtigungen auf diesem Computer oder Telefon anzuzeigen, wenn in der App etwas passiert.",
    devicePrivacy: "Die Berechtigung wird vom Browser verwaltet. GemGo erhält deine Benachrichtigungseinstellungen nicht.",
    enableDevice: "Gerätebenachrichtigungen aktivieren",
    testDevice: "Testbenachrichtigung senden",
    deviceEnabled: "Gerätebenachrichtigungen sind aktiv.",
    deviceDenied: "Benachrichtigungen sind blockiert. Aktiviere sie in den Browser-Einstellungen dieser Website.",
    deviceUnsupported: "Dieser Browser unterstützt keine Web-Benachrichtigungen. Auf iPhone oder iPad GemGo zuerst zum Home-Bildschirm hinzufügen und von dort öffnen.",
    testTitle: "GemGo-Benachrichtigungen sind aktiv",
    testBody: "Reise-, Besucher- und GemPoints-Updates können jetzt auf diesem Gerät erscheinen.",
  },
  fr: {
    eyebrow: "Historique local",
    title: "Notifications",
    intro: "Activité des voyages, GemPoints et badges enregistrée dans ce navigateur.",
    empty: "Rien à signaler pour le moment.",
    markAll: "Tout marquer comme lu",
    allRead: "Tout est déjà lu",
    system: "Les données du prototype restent clairement indiquées.",
    systemBody: "Les informations en direct, estimées et de démonstration restent distinctes.",
    tripSaved: "Voyage enregistré sur cet appareil",
    visitVerified: "Visite vérifiée",
    reward: "Récompense de démonstration",
    deviceTitle: "Notifications reçues sur cet appareil",
    deviceEyebrow: "Autorisation système",
    deviceBody: "Autorisez GemGo à afficher de vraies notifications système sur cet ordinateur ou téléphone lorsqu’un événement survient dans l’app.",
    devicePrivacy: "L’autorisation est gérée par votre navigateur. GemGo ne reçoit pas vos réglages de notification.",
    enableDevice: "Activer les notifications de l’appareil",
    testDevice: "Envoyer une notification test",
    deviceEnabled: "Les notifications de l’appareil sont activées.",
    deviceDenied: "Les notifications sont bloquées. Réactivez-les dans les réglages du navigateur pour ce site.",
    deviceUnsupported: "Ce navigateur ne prend pas en charge les notifications web. Sur iPhone ou iPad, ajoutez d’abord GemGo à l’écran d’accueil et ouvrez-le depuis celui-ci.",
    testTitle: "Les notifications GemGo sont actives",
    testBody: "Les mises à jour de voyage, d’affluence et de GemPoints peuvent maintenant apparaître sur cet appareil.",
  },
  sl: {
    eyebrow: "Lokalna zgodovina",
    title: "Obvestila",
    intro: "Dejavnost poti, GemPoints in značk v tem brskalniku.",
    empty: "Za zdaj ni ničesar za sporočiti.",
    markAll: "Označi vse kot prebrano",
    allRead: "Vse je že prebrano",
    system: "Podatki prototipa ostajajo jasno označeni.",
    systemBody: "Podatki v živo, ocene in predstavitveni podatki so ločeni.",
    tripSaved: "Potovanje shranjeno v tej napravi",
    visitVerified: "Obisk potrjen",
    reward: "Predstavitvena nagrada",
    deviceTitle: "Obvestila na tej napravi",
    deviceEyebrow: "Sistemsko dovoljenje",
    deviceBody: "Dovoli GemGo, da ob dogodku v aplikaciji prikaže prava sistemska obvestila na tem računalniku ali telefonu.",
    devicePrivacy: "Dovoljenje upravlja brskalnik. GemGo ne prejme tvojih nastavitev obvestil.",
    enableDevice: "Vključi obvestila naprave",
    testDevice: "Pošlji preskusno obvestilo",
    deviceEnabled: "Obvestila naprave so vključena.",
    deviceDenied: "Obvestila so blokirana. Ponovno jih vključi v nastavitvah brskalnika za to stran.",
    deviceUnsupported: "Ta brskalnik ne podpira spletnih obvestil. Na iPhonu ali iPadu najprej dodaj GemGo na začetni zaslon in ga odpri od tam.",
    testTitle: "Obvestila GemGo so vključena",
    testBody: "Posodobitve poti, gneče in GemPoints se lahko zdaj prikažejo na tej napravi.",
  },
} as const;

const buildNotifications = (locale: keyof typeof copy): NotificationItem[] => {
  const text = copy[locale];
  const activeTrip = readJson<SavedTrip | null>("gemgo-active-trip-v3", null);
  const ledger = readJson<GemPointEvent[]>("gemgo-points-ledger-v3", []);
  const rewards = readJson<RewardUnlock[]>("gemgo-reward-unlocks-v1", []);
  const items: NotificationItem[] = [
    ...loadStoredNotifications(),
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
      detail: activeTrip.trip.verified ? text.visitVerified : text.tripSaved,
      createdAt: activeTrip.updatedAt,
      kind: "trip",
      href: "/app/my-trip",
    });
  ledger.forEach((event) =>
    items.push({
      id: event.id,
      title: `${event.amount > 0 ? "+" : ""}${event.amount} GemPoints`,
      detail: event.label,
      createdAt: event.createdAt,
      kind: "points",
      href: "/app/gempoints",
    }),
  );
  rewards.forEach((reward) =>
    items.push({
      id: reward.id,
      title: reward.code,
      detail: text.reward,
      createdAt: reward.createdAt,
      kind: "reward",
      href: "/app/gempoints",
    }),
  );
  return [...new Map(items.map((item) => [item.id, item])).values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
};

export default function NotificationsPage() {
  const { locale } = usePersistentLocale();
  const text = copy[locale];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deviceState, setDeviceState] = useState<DeviceNotificationState>("default");

  const refresh = useCallback(() => {
    setItems(buildNotifications(locale));
    setReadIds(loadReadNotificationIds());
  }, [locale]);

  useEffect(() => {
    queueMicrotask(refresh);
    queueMicrotask(() => setDeviceState(getDeviceNotificationState()));
    window.addEventListener("gemgo:notifications-changed", refresh);
    return () => window.removeEventListener("gemgo:notifications-changed", refresh);
  }, [refresh]);

  const unreadIds = useMemo(
    () => items.filter((item) => !readIds.has(item.id)).map((item) => item.id),
    [items, readIds],
  );

  const markAll = () => {
    if (!unreadIds.length) return;
    markNotificationsRead(unreadIds);
    setReadIds((current) => new Set([...current, ...unreadIds]));
    window.dispatchEvent(new CustomEvent("gemgo:ui-sound", { detail: "success" }));
  };

  const enableDeviceNotifications = async () => {
    if (deviceState === "granted") {
      await showDeviceNotification({
        id: `gemgo-notification-test-${Date.now()}`,
        title: text.testTitle,
        detail: text.testBody,
        kind: "system",
        href: "/app/notifications",
      });
      return;
    }
    const next = await requestDeviceNotifications(text.testTitle, text.testBody);
    setDeviceState(next);
  };

  const icon = (kind: NotificationItem["kind"]) =>
    kind === "trip" ? <Route />
      : kind === "points" ? <Coins />
        : kind === "reward" ? <Gift />
          : kind === "alert" ? <TriangleAlert />
            : <MapPin />;

  return (
    <main className="standalone-info-page notifications-page">
      <section className="info-page-hero notification-hero">
        <div className="notification-top-actions is-single">
          <button
            type="button"
            className="button button-secondary mark-all-read"
            onClick={markAll}
            disabled={!unreadIds.length}
            title={!unreadIds.length ? text.allRead : text.markAll}
          >
            <CheckCheck size={18} />{text.markAll}
          </button>
        </div>
        <span className="eyebrow"><Bell size={15} />{text.eyebrow}</span>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </section>
      <section className={`device-notification-card is-${deviceState}`} aria-live="polite">
        <span className="device-notification-icon"><Smartphone size={24} /><BellRing size={16} /></span>
        <div>
          <span className="eyebrow"><ShieldCheck size={15} />{text.deviceEyebrow}</span>
          <h2>{text.deviceTitle}</h2>
          <p>{text.deviceBody}</p>
          <small>{deviceState === "granted" ? text.deviceEnabled : deviceState === "denied" ? text.deviceDenied : deviceState === "unsupported" ? text.deviceUnsupported : text.devicePrivacy}</small>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void enableDeviceNotifications()}
          disabled={deviceState === "unsupported" || deviceState === "denied"}
        >
          <Bell size={18} />{deviceState === "granted" ? text.testDevice : text.enableDevice}
        </button>
      </section>
      <section className="notification-history-page">
        {items.length ? items.map((item) => {
          const unread = !readIds.has(item.id);
          const content = (
            <>
              <span>{icon(item.kind)}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale)}</time>
              </div>
              {unread && <i className="notification-unread-dot" aria-label="Unread" />}
            </>
          );
          return item.href ? (
            <Link
              href={item.href}
              className={`notification-item${unread ? " is-unread" : ""}`}
              key={item.id}
              onClick={() => markNotificationsRead([item.id])}
            >{content}</Link>
          ) : (
            <article className={unread ? "is-unread" : ""} key={item.id}>{content}</article>
          );
        }) : (
          <div className="empty-state"><CheckCircle2 /><p>{text.empty}</p></div>
        )}
      </section>
    </main>
  );
}
