import type { Locale } from "../domain";

export const supportedLocales: readonly Locale[];
export const messages: Record<Locale, Record<string, string>>;
export const messageKeys: string[];
export const sharedMessageKeys: string[];
export const translationOverrides: Record<Exclude<Locale, "en">, Record<string, string>>;
export function msg(
  locale: Locale,
  key: string,
  variables?: Record<string, string | number>,
): string;
export function plural(
  locale: Locale,
  count: number,
  singularKey: string,
  pluralKey: string,
): string;
export const promptSuggestions: Record<Locale, string[]>;
export const languageOptions: readonly (readonly [Locale, string])[];
