import type { Locale, RegionCode } from "../domain";

export const regionOrigins: Record<
  Exclude<RegionCode, "all">,
  { lat: number; lng: number; mapsQuery: string }
> = {
  aosta: { lat: 45.74, lng: 7.32, mapsQuery: "Aosta, Italy" },
  bavaria: { lat: 47.7, lng: 11.2, mapsQuery: "Munich, Germany" },
  fussen_allgau: { lat: 47.57, lng: 10.7, mapsQuery: "Füssen, Germany" },
};

export const formatDuration = (minutes: number, locale: Locale) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  const number = new Intl.NumberFormat(locale);
  if (hours === 0) return `${number.format(remainder)} min`;
  if (remainder === 0) return `${number.format(hours)} h`;
  return `${number.format(hours)} h ${number.format(remainder)} min`;
};

export const validStartDate = (value: string | undefined, fallback: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : value;
};
