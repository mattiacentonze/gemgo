import type { Locale, RegionCode } from "../domain";

export const regionOrigins: Record<
  Exclude<RegionCode, "all">,
  { lat: number; lng: number; mapsQuery: string }
>;
export function formatDuration(minutes: number, locale: Locale): string;
export function validStartDate(value: string | undefined, fallback: string): string;
