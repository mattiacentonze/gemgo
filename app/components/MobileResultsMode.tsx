"use client";

import { List, Map } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "list" | "map";

export default function MobileResultsMode() {
  const [target, setTarget] = useState<Element | null>(null);
  const [app, setApp] = useState<Element | null>(null);
  const [mode, setMode] = useState<Mode>("list");

  useEffect(() => {
    const resolve = () => {
      const nextApp = document.querySelector(".integrated-app");
      const nextTarget = document.querySelector(".integrated-app .results-header");
      setApp(nextApp);
      setTarget(nextTarget);
      if (!nextTarget) setMode("list");
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!app) return;
    app.classList.toggle("mobile-results-map-mode", mode === "map");
    return () => app.classList.remove("mobile-results-map-mode");
  }, [app, mode]);

  if (!target) return null;

  return createPortal(
    <div className="mobile-results-switch" aria-label="Results view">
      <button
        type="button"
        className={mode === "list" ? "is-active" : ""}
        aria-pressed={mode === "list"}
        onClick={() => setMode("list")}
      >
        <List size={17} />
        List
      </button>
      <button
        type="button"
        className={mode === "map" ? "is-active" : ""}
        aria-pressed={mode === "map"}
        onClick={() => setMode("map")}
      >
        <Map size={17} />
        Map
      </button>
    </div>,
    target,
  );
}
