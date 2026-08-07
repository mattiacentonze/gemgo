"use client";

import { useEffect, useState } from "react";
import { locales, type Locale } from "../domain";

const STORAGE_KEY = "gemgo-locale-v3";

export const localeNames: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  sl: "Slovenščina",
};

export function usePersistentLocale(defaultLocale: Locale = "en") {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (locales as readonly string[]).includes(stored)) {
      queueMicrotask(() => setLocale(stored as Locale));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  return { locale, setLocale };
}
