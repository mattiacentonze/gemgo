"use client";

import { Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Snapshot = {
  label: string;
  values: Record<string, string | null>;
};

const keysForAction = (label: string) => {
  if (/delete/i.test(label)) return ["gemgo-trips-v3", "gemgo-active-trip-v3"];
  if (/switch my trip/i.test(label)) return ["gemgo-trips-v3", "gemgo-active-trip-v3"];
  return [];
};

export default function UndoActionController() {
  const pendingRef = useRef<Snapshot | null>(null);
  const [target, setTarget] = useState<Element | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    const capture = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || button.matches(":disabled")) return;
      const label = button.textContent?.trim() ?? "";
      const keys = keysForAction(label);
      if (keys.length === 0) return;
      pendingRef.current = {
        label: /delete/i.test(label) ? "Restore trip" : "Restore original plan",
        values: Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)])),
      };
    };

    document.addEventListener("click", capture, { capture: true });
    const observer = new MutationObserver(() => {
      const toast = document.querySelector(".integrated-app .action-toast");
      const text = toast?.textContent?.trim() ?? "";
      const pending = pendingRef.current;
      if (!toast || !pending || !/Trip deleted|Trip switched/i.test(text)) return;
      pendingRef.current = null;
      setTarget(toast);
      setSnapshot(pending);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      document.removeEventListener("click", capture, { capture: true });
      observer.disconnect();
    };
  }, []);

  const undo = () => {
    if (!snapshot) return;
    Object.entries(snapshot.values).forEach(([key, value]) => {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    });
    setTarget(null);
    setSnapshot(null);
    window.location.reload();
  };

  if (!target || !snapshot) return null;

  return createPortal(
    <button type="button" className="toast-undo-button" onClick={undo}>
      <Undo2 size={16} />
      {snapshot.label}
    </button>,
    target,
  );
}
