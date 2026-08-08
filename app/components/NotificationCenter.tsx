"use client";

import { Bell, Check, Coins, Gift, MapPin, Route, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GemPointEvent, RewardUnlock, SavedTrip } from "../product/storage";
import type { Locale } from "../domain";
import { msg } from "../i18n/catalogs";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "trip" | "points" | "reward" | "badge" | "system";
};

type BadgeHistoryItem = { id: string; title: string; createdAt: string };

const READ_KEY = "gemgo-notifications-read-at-v1";
const ACTIVE_TRIP_KEY = "gemgo-active-trip-v3";
const LEDGER_KEY = "gemgo-points-ledger-v3";
const REWARDS_KEY = "gemgo-reward-unlocks-v1";
const BADGE_HISTORY_KEY = "gemgo-badge-history-v1";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const buildNotifications = (locale: Locale): NotificationItem[] => {
  const activeTrip = readJson<SavedTrip | null>(ACTIVE_TRIP_KEY, null);
  const ledger = readJson<GemPointEvent[]>(LEDGER_KEY, []);
  const rewards = readJson<RewardUnlock[]>(REWARDS_KEY, []);
  const badgeHistory = readJson<BadgeHistoryItem[]>(BADGE_HISTORY_KEY, []);
  const items: NotificationItem[] = [
    {
      id: "system-data-honesty",
      title: msg(locale, "how.threeTitle"),
      detail: msg(locale, "how.threeBody"),
      createdAt: "2026-08-07T00:00:00.000Z",
      kind: "system",
    },
  ];

  if (activeTrip) {
    items.push({
      id: `trip-${activeTrip.id}`,
      title: activeTrip.trip.verified ? msg(locale, "points.earnedVisit") : msg(locale, "plan.saved"),
      detail: activeTrip.trip.verified
        ? `${activeTrip.name} · ${msg(locale, "notifications.intro")}`
        : `${activeTrip.name} · ${msg(locale, "plan.savedDevice")}`,
      createdAt: activeTrip.updatedAt,
      kind: "trip",
    });
  }

  ledger.forEach((event) => {
    items.push({
      id: `ledger-${event.id}`,
      title: event.amount >= 0 ? msg(locale, "notifications.earned", { count: event.amount }) : msg(locale, "notifications.used", { count: Math.abs(event.amount) }),
      detail: `${event.type === "visit" ? msg(locale, "points.earnedVisit") : event.type === "gemdrop" ? msg(locale, "gemdrop.alternative") : event.type === "mobility" ? msg(locale, "points.earnedTravel") : event.type === "partner" ? msg(locale, "points.earnedPartner") : event.label}${event.status === "demo" ? ` · ${msg(locale, "settings.simulated")}` : ""}`,
      createdAt: event.createdAt,
      kind: "points",
    });
  });

  rewards.forEach((reward) => {
    items.push({
      id: `reward-${reward.id}`,
      title: msg(locale, "points.getCredits"),
      detail: `${reward.code} · ${new Date(reward.expiresAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`,
      createdAt: reward.createdAt,
      kind: "reward",
    });
  });

  badgeHistory.forEach((badge) => {
    items.push({
      id: badge.id,
      title: locale === "it" ? "Congratulazioni! Nuovo badge" : "Congratulations! New badge",
      detail: badge.title,
      createdAt: badge.createdAt,
      kind: "badge",
    });
  });

  return items.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
};

const iconFor = (kind: NotificationItem["kind"]) => {
  if (kind === "trip") return <Route size={18} />;
  if (kind === "points") return <Coins size={18} />;
  if (kind === "reward") return <Gift size={18} />;
  if (kind === "badge") return <Check size={18} />;
  return <MapPin size={18} />;
};

export default function NotificationCenter() {
  const [target, setTarget] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readAt, setReadAt] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const resolveTarget = () => {
      const next = document.querySelector(".integrated-app .header-actions");
      if (next) setTarget(next);
    };
    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    const refreshBadges = () => setItems(buildNotifications((document.documentElement.lang || "en") as Locale));
    window.addEventListener("gemgo:badge-earned", refreshBadges);
    return () => {
      observer.disconnect();
      window.removeEventListener("gemgo:badge-earned", refreshBadges);
    };
  }, []);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("gemgo:close-overlays", close);
    return () => window.removeEventListener("gemgo:close-overlays", close);
  }, []);

  useEffect(() => {
    const storedReadAt = Number(window.localStorage.getItem(READ_KEY) ?? 0);
    setReadAt(Number.isFinite(storedReadAt) ? storedReadAt : 0);
    const currentLocale = (document.documentElement.lang || "en") as Locale;
    setLocale(currentLocale);
    setItems(buildNotifications(currentLocale));
    const observer = new MutationObserver(() => {
      const next = (document.documentElement.lang || "en") as Locale;
      setLocale(next);
      setItems(buildNotifications(next));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const unread = useMemo(
    () => items.filter((item) => Date.parse(item.createdAt) > readAt).length,
    [items, readAt],
  );

  const toggle = () => {
    const nextOpen = !open;
    if (nextOpen) window.dispatchEvent(new Event("gemgo:close-overlays"));
    setItems(buildNotifications(locale));
    setOpen(nextOpen);
    if (nextOpen) {
      const now = Date.now();
      setReadAt(now);
      window.localStorage.setItem(READ_KEY, String(now));
    }
  };

  if (!target) return null;

  const button = createPortal(
    <div className="notification-center">
      <button
        type="button"
        className="icon-button notification-button"
        aria-label={msg(locale, "notifications.title")}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={19} />
        {unread > 0 && <span className="notification-badge">{Math.min(unread, 9)}</span>}
      </button>
    </div>,
    target,
  );

  const popover = open ? createPortal(
        <div className="notification-popover notification-popover-portal" role="dialog" aria-label={msg(locale, "notifications.title")}>
          <div className="notification-heading">
            <div>
              <span>{msg(locale, "notifications.eyebrow")}</span>
              <strong>{msg(locale, "notifications.title")}</strong>
            </div>
            <button type="button" className="icon-button" aria-label={msg(locale, "global.close")} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="notification-list">
            {items.length === 0 ? (
              <div className="notification-empty"><Check size={22} /><span>{msg(locale, "notifications.emptyTitle")}</span></div>
            ) : (
              items.map((item) => (
                <article key={item.id} className={`notification-item notification-${item.kind}`}>
                  <span className="notification-icon">{iconFor(item.kind)}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</time>
                  </div>
                </article>
              ))
            )}
          </div>
          <small className="notification-footnote">{msg(locale, "notifications.intro")}</small>
        </div>,
    document.body,
  ) : null;

  return <>{button}{popover}</>;
}
