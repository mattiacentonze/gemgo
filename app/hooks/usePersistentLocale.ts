"use client";

import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "../domain";

const STORAGE_KEY = "gemgo-locale-v3";
const LOCALE_EVENT = "gemgo:locale-change";

export const localeNames: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  sl: "Slovenščina",
};

export function usePersistentLocale(defaultLocale: Locale = "en") {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const skipInitialWrite = useRef(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (locales as readonly string[]).includes(stored)) {
      queueMicrotask(() => setLocaleState(stored as Locale));
    }
    const syncLocale = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if ((locales as readonly string[]).includes(next)) setLocaleState(next);
    };
    window.addEventListener(LOCALE_EVENT, syncLocale);
    return () => window.removeEventListener(LOCALE_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    if (skipInitialWrite.current) {
      skipInitialWrite.current = false;
      return;
    }
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.dispatchEvent(new CustomEvent<Locale>(LOCALE_EVENT, { detail: next }));
  };

  return { locale, setLocale };
}
