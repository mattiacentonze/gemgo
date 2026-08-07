"use client";

import Link from "next/link";
import { Check, Languages, Menu, Mountain, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "../domain";
import { localeNames } from "../hooks/usePersistentLocale";
import type { MarketingCopy } from "../i18n/marketing";

type Props = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  copy: MarketingCopy;
};

export default function MarketingHeader({ locale, onLocaleChange, copy }: Props) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const closeMenus = () => {
    setLanguageOpen(false);
    setMenuOpen(false);
  };

  const links = [
    ["#how", copy.navigation.how],
    ["#coverage", copy.navigation.coverage],
    ["#proof", copy.navigation.why],
    ["#team", copy.navigation.team],
  ] as const;

  return (
    <header className="marketing-header" ref={headerRef}>
      <div className="marketing-header-inner">
        <a href="#top" className="brand marketing-brand" aria-label="GemGo homepage" onClick={closeMenus}>
          <span className="brand-mark"><Mountain size={22} /></span>
          <span><strong>GemGo</strong><small>{copy.tagline}</small></span>
        </a>

        <nav className="marketing-desktop-nav" aria-label="Homepage navigation">
          {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>

        <div className="marketing-header-actions">
          <div className="marketing-language-menu">
            <button
              type="button"
              className="icon-text-button marketing-language-trigger"
              aria-label={`${copy.navigation.language}: ${locale.toUpperCase()}`}
              aria-expanded={languageOpen}
              aria-haspopup="menu"
              onClick={() => { setMenuOpen(false); setLanguageOpen((open) => !open); }}
            >
              <Languages size={18} /><span>{locale.toUpperCase()}</span>
            </button>
            {languageOpen && (
              <div className="marketing-language-popover" role="menu" aria-label={copy.navigation.language}>
                <strong>{copy.navigation.language}</strong>
                {locales.map((item) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={item === locale}
                    key={item}
                    onClick={() => { onLocaleChange(item); closeMenus(); }}
                  >
                    {item === locale ? <Check size={16} /> : <span aria-hidden="true" />}
                    {localeNames[item]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/app" className="button button-primary button-small marketing-try-button">{copy.navigation.tryApp}</Link>
          <button
            type="button"
            className="icon-button marketing-menu-trigger"
            aria-label={copy.navigation.menu}
            aria-expanded={menuOpen}
            onClick={() => { setLanguageOpen(false); setMenuOpen((open) => !open); }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="marketing-mobile-menu" aria-label="Mobile homepage navigation">
            {links.map(([href, label]) => <a key={href} href={href} onClick={closeMenus}>{label}</a>)}
            <Link href="/app" className="button button-primary" onClick={closeMenus}>{copy.navigation.tryApp}</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
