"use client";

import { CalendarDays, Compass, Gift, Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import LiquidMobileNav from "./LiquidMobileNav";

type AppPage = "explore" | "trip" | "rewards" | "about";

const pages: AppPage[] = ["explore", "trip", "rewards", "about"];
const icons = {
  explore: <Compass size={20} />,
  trip: <CalendarDays size={20} />,
  rewards: <Gift size={20} />,
  about: <Info size={20} />,
};

const defaultLabels: Record<AppPage, string> = {
  explore: "Explore",
  trip: "My Trip",
  rewards: "GemPoints",
  about: "About",
};

export default function LiquidAppNavigation() {
  const [ready, setReady] = useState(false);
  const [activePage, setActivePage] = useState<AppPage>("explore");
  const [labels, setLabels] = useState<Record<AppPage, string>>(defaultLabels);
  const snapshotRef = useRef("");

  useEffect(() => {
    const resolve = () => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>(".integrated-app .mobile-bottom-nav > button")];
      if (buttons.length < pages.length) return;
      const nextLabels = { ...defaultLabels };
      buttons.slice(0, pages.length).forEach((button, index) => {
        nextLabels[pages[index]] = button.textContent?.trim() || nextLabels[pages[index]];
      });
      const activeIndex = buttons.findIndex((button) => button.classList.contains("is-active"));
      const nextPage = pages[Math.max(0, activeIndex)] ?? "explore";
      const snapshot = `${nextPage}|${pages.map((page) => nextLabels[page]).join("|")}`;
      if (snapshot === snapshotRef.current) return;
      snapshotRef.current = snapshot;
      setLabels(nextLabels);
      setActivePage(nextPage);
      setReady(true);
      document.documentElement.classList.add("has-liquid-app-nav");
    };

    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("has-liquid-app-nav");
    };
  }, []);

  const items = useMemo(
    () => pages.map((page) => ({
      page,
      href: `#${page}`,
      label: labels[page],
      icon: icons[page],
    })),
    [labels],
  );

  const navigate = (page: AppPage) => {
    const index = pages.indexOf(page);
    const button = document.querySelectorAll<HTMLButtonElement>(".integrated-app .mobile-bottom-nav > button")[index];
    button?.click();
    setActivePage(page);
  };

  if (!ready) return null;

  return (
    <LiquidMobileNav
      activePage={activePage}
      ariaLabel="GemGo mobile navigation"
      items={items}
      onNavigate={navigate}
    />
  );
}
