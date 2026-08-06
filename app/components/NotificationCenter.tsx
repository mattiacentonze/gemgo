"use client";

import { Bell, Check, Coins, Gift, MapPin, Route, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GemPointEvent, RewardUnlock, SavedTrip } from "../product/storage";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "trip" | "points" | "reward" | "system";
};

const READ_KEY = "gemgo-notifications-read-at-v1";
const ACTIVE_TRIP_KEY = "gemgo-active-trip-v3";
const LEDGER_KEY = "gemgo-points-ledger-v3";
const REWARDS_KEY = "gemgo-reward-unlocks-v1";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const buildNotifications = (): NotificationItem[] => {
  const activeTrip = readJson<SavedTrip | null>(ACTIVE_TRIP_KEY, null);
  const ledger = readJson<GemPointEvent[]>(LEDGER_KEY, []);
  const rewards = readJson<RewardUnlock[]>(REWARDS_KEY, []);
  const items: NotificationItem[] = [
    {
      id: "system-data-honesty",
      title: "Know what is live",
      detail: "Weather and supported road routes can be live. Crowd, parking, public transport and partner rewards remain estimated or demonstrative where labelled.",
      createdAt: "2026-08-07T00:00:00.000Z",
      kind: "system",
    },
  ];

  if (activeTrip) {
    items.push({
      id: `trip-${activeTrip.id}`,
      title: activeTrip.trip.verified ? "Visit verified" : "Your trip is ready",
      detail: activeTrip.trip.verified
        ? `${activeTrip.name} has been recorded on this device.`
        : `${activeTrip.name} is available in My Trip, including offline essentials and verification.`,
      createdAt: activeTrip.updatedAt,
      kind: "trip",
    });
  }

  ledger.forEach((event) => {
    items.push({
      id: `ledger-${event.id}`,
      title: event.amount >= 0 ? `${event.amount} GemPoints added` : `${Math.abs(event.amount)} GemPoints used`,
      detail: `${event.label}${event.status === "demo" ? " · Demonstration event" : ""}`,
      createdAt: event.createdAt,
      kind: "points",
    });
  });

  rewards.forEach((reward) => {
    items.push({
      id: `reward-${reward.id}`,
      title: "Reward code unlocked",
      detail: `${reward.code} · Expires ${new Date(reward.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      createdAt: reward.createdAt,
      kind: "reward",
    });
  });

  return items.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
};

const iconFor = (kind: NotificationItem["kind"]) => {
  if (kind === "trip") return <Route size={18} />;
  if (kind === "points") return <Coins size={18} />;
  if (kind === "reward") return <Gift size={18} />;
  return <MapPin size={18} />;
};

export default function NotificationCenter() {
  const [target, setTarget] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readAt, setReadAt] = useState(0);

  useEffect(() => {
    const resolveTarget = () => {
      const next = document.querySelector(".integrated-app .header-actions");
      if (next) setTarget(next);
    };
    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const storedReadAt = Number(window.localStorage.getItem(READ_KEY) ?? 0);
    setReadAt(Number.isFinite(storedReadAt) ? storedReadAt : 0);
    setItems(buildNotifications());
  }, []);

  const unread = useMemo(
    () => items.filter((item) => Date.parse(item.createdAt) > readAt).length,
    [items, readAt],
  );

  const toggle = () => {
    const nextOpen = !open;
    setItems(buildNotifications());
    setOpen(nextOpen);
    if (nextOpen) {
      const now = Date.now();
      setReadAt(now);
      window.localStorage.setItem(READ_KEY, String(now));
    }
  };

  if (!target) return null;

  return createPortal(
    <div className="notification-center">
      <button
        type="button"
        className="icon-button notification-button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={19} />
        {unread > 0 && <span className="notification-badge">{Math.min(unread, 9)}</span>}
      </button>
      {open && (
        <div className="notification-popover" role="dialog" aria-label="GemGo notifications">
          <div className="notification-heading">
            <div>
              <span>Updates</span>
              <strong>Notifications</strong>
            </div>
            <button type="button" className="icon-button" aria-label="Close notifications" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="notification-list">
            {items.length === 0 ? (
              <div className="notification-empty"><Check size={22} /><span>You are up to date.</span></div>
            ) : (
              items.map((item) => (
                <article key={item.id} className={`notification-item notification-${item.kind}`}>
                  <span className="notification-icon">{iconFor(item.kind)}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
                  </div>
                </article>
              ))
            )}
          </div>
          <small className="notification-footnote">Stored on this device. Account synchronisation is not active.</small>
        </div>
      )}
    </div>,
    target,
  );
}
