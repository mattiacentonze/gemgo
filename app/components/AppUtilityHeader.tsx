"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, ChevronRight, Coins, Languages, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { locales } from "../domain";
import { localeNames, usePersistentLocale } from "../hooks/usePersistentLocale";
import { panUi } from "../i18n/pan-ui";
import { useAuth } from "./AuthProvider";
import { loadLedger, pointBalance } from "../product/storage";

const copy = {
  en: { explore: "Explore", trip: "My Trip", points: "GemPoints", about: "About", account: "Profile", notifications: "Notifications", home: "GemGo home" },
  it: { explore: "Esplora", trip: "Il mio viaggio", points: "GemPoints", about: "Informazioni", account: "Profilo", notifications: "Notifiche", home: "Home GemGo" },
  de: { explore: "Entdecken", trip: "Meine Reise", points: "GemPoints", about: "Über uns", account: "Profil", notifications: "Benachrichtigungen", home: "GemGo-Startseite" },
  fr: { explore: "Explorer", trip: "Mon voyage", points: "GemPoints", about: "À propos", account: "Profil", notifications: "Notifications", home: "Accueil GemGo" },
  sl: { explore: "Razišči", trip: "Moje potovanje", points: "GemPoints", about: "O nas", account: "Profil", notifications: "Obvestila", home: "Domov GemGo" },
} as const;

export default function AppUtilityHeader() {
  const pathname = usePathname();
  const { locale, setLocale } = usePersistentLocale();
  const text = copy[locale];
  const ui = panUi[locale];
  const auth = useAuth();
  const [balance, setBalance] = useState(0);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setBalance(pointBalance(loadLedger())));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const displayedBalance = auth.user ? auth.verifiedBalance : balance;
  const links = [
    { href: "/app/explore", label: text.explore },
    { href: "/app/my-trip", label: text.trip },
    { href: "/app/gempoints", label: text.points },
    { href: "/about", label: text.about },
  ];

  const closeMenus = () => {
    setLanguageOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <div className="product-app integrated-app utility-app-chrome">
      <header className="app-header" ref={headerRef}>
        <Link className="brand brand-compact" href="/" aria-label={text.home} onClick={closeMenus}>
          <span className="brand-mark"><img src="/assets/gemgo-logo-green.svg?v=2" alt="" /></span>
          <span><strong>GemGo</strong><small>{ui.tagline}</small></span>
        </Link>

        <nav className="desktop-nav" aria-label={text.explore}>
          {links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>

        <div className="header-actions">
          <div className="language-menu">
            <button
              type="button"
              className="icon-text-button"
              aria-label={`${ui.language}: ${locale.toUpperCase()}`}
              aria-expanded={languageOpen}
              onClick={() => { setMobileMenuOpen(false); setLanguageOpen((open) => !open); }}
            >
              <Languages size={18} /> {locale.toUpperCase()}
            </button>
            {languageOpen && (
              <div className="language-popover" role="menu" aria-label={ui.language}>
                <strong>{ui.language}</strong>
                {locales.map((item) => (
                  <button type="button" role="menuitemradio" aria-checked={item === locale} key={item} onClick={() => { setLocale(item); closeMenus(); }}>
                    {item === locale ? <Check size={15} /> : <span />}{localeNames[item]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/app/gempoints" className="header-points-link" aria-label={`${displayedBalance.toLocaleString(locale)} GemPoints`}>
            <Coins size={18} /><span><strong>{displayedBalance.toLocaleString(locale)}</strong><small>GemPoints</small></span>
          </Link>
          <Link href="/app/notifications" className={`icon-button notification-page-link${pathname === "/app/notifications" ? " is-active" : ""}`} aria-label={text.notifications}>
            <Bell size={19} /><span className="header-notification-dot" aria-hidden="true" />
          </Link>
          <Link href="/app/profile" className={`icon-text-button profile-page-link${pathname === "/app/profile" ? " is-active" : ""}`} aria-label={text.account}>
            <UserRound size={18} /><span>{text.account}</span>
          </Link>
          <button type="button" className="icon-button mobile-menu-button" aria-label={ui.openMenu} aria-expanded={mobileMenuOpen} onClick={() => { setLanguageOpen(false); setMobileMenuOpen((open) => !open); }}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="mobile-menu" aria-label={ui.openMenu}>
            {links.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus}>{item.label}<ChevronRight size={17} /></Link>)}
            <Link href="/app/notifications" onClick={closeMenus}>{text.notifications}<ChevronRight size={17} /></Link>
            <Link href="/app/profile" onClick={closeMenus}>{text.account}<ChevronRight size={17} /></Link>
          </nav>
        )}
      </header>
    </div>
  );
}
