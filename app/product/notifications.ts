export type StoredNotification = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "alert" | "trip" | "points" | "reward" | "system";
  href?: string;
};

const NOTIFICATIONS_KEY = "gemgo-notifications-v1";
const READ_KEY = "gemgo-notification-read-v1";

export type DeviceNotificationState =
  | "unsupported"
  | "default"
  | "denied"
  | "granted";

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Notifications are an optional device-local prototype feature.
  }
};

export const getDeviceNotificationState = (): DeviceNotificationState => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
};

const getNotificationRegistration = async () => {
  if (!("serviceWorker" in navigator)) return null;
  const current = await navigator.serviceWorker.getRegistration();
  return current ?? navigator.serviceWorker.register("/sw.js");
};

export const showDeviceNotification = async (
  notification: Pick<StoredNotification, "id" | "title" | "detail" | "href" | "kind">,
) => {
  if (getDeviceNotificationState() !== "granted") return false;
  const options: NotificationOptions = {
    body: notification.detail,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: notification.id,
    data: { href: notification.href ?? "/app/notifications" },
    requireInteraction: notification.kind === "alert",
  };
  try {
    const registration = await getNotificationRegistration();
    if (registration) {
      await registration.showNotification(notification.title, options);
    } else {
      new Notification(notification.title, options);
    }
    return true;
  } catch {
    return false;
  }
};

export const requestDeviceNotifications = async (
  title: string,
  detail: string,
): Promise<DeviceNotificationState> => {
  if (getDeviceNotificationState() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  await showDeviceNotification({
    id: "gemgo-device-notifications-enabled",
    title,
    detail,
    kind: "system",
    href: "/app/notifications",
  });
  return "granted";
};

export const loadStoredNotifications = () =>
  read<StoredNotification[]>(NOTIFICATIONS_KEY, []).map((notification) => ({
    ...notification,
    href: notification.href === "/notifications" ? "/app/notifications" : notification.href === "/profile" ? "/app/profile" : notification.href,
  }));

export const upsertStoredNotification = (notification: StoredNotification) => {
  const current = loadStoredNotifications();
  const next = [notification, ...current.filter((item) => item.id !== notification.id)];
  write(NOTIFICATIONS_KEY, next.slice(0, 40));
  window.dispatchEvent(new Event("gemgo:notifications-changed"));
  void showDeviceNotification(notification);
  return next;
};

export const loadReadNotificationIds = () => new Set(read<string[]>(READ_KEY, []));

export const markNotificationsRead = (ids: string[]) => {
  write(READ_KEY, [...new Set([...loadReadNotificationIds(), ...ids])]);
  window.dispatchEvent(new Event("gemgo:notifications-changed"));
};
