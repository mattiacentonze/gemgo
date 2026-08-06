"use client";

import { Download, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GEMGO_KEYS = [
  "gemgo-trips-v3",
  "gemgo-active-trip-v3",
  "gemgo-points-ledger-v3",
  "gemgo-reward-unlocks-v1",
  "gemgo-visit-feedback-v1",
  "gemgo-locale-v3",
  "gemgo-sound",
  "gemgo-notifications-read-at-v1",
  "gemgo-demo-trip",
  "gemgo-demo-points",
  "gemgo-demo-saved",
  "gemgo-saved-plans",
  "gemgo-saved-plans-v2",
  "gemgo-saved-plan",
  "gemgo-location-consent",
  "gemgo-account-prompt-next",
];

const collectLocalData = () => {
  const data: Record<string, unknown> = {};
  GEMGO_KEYS.forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value === null) return;
    try {
      data[key] = JSON.parse(value) as unknown;
    } catch {
      data[key] = value;
    }
  });
  return {
    exportedAt: new Date().toISOString(),
    product: "GemGo",
    scope: "device-local data",
    data,
  };
};

export default function PrivacyControls() {
  const [target, setTarget] = useState<Element | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const resolve = () => setTarget(document.querySelector(".integrated-app .privacy-hero"));
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const exportData = () => {
    const payload = JSON.stringify(collectLocalData(), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gemgo-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const deleteData = () => {
    GEMGO_KEYS.forEach((key) => window.localStorage.removeItem(key));
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("gemgo-commons-")) window.sessionStorage.removeItem(key);
    }
    setConfirming(false);
    window.location.assign("/app");
  };

  if (!target) return null;

  return createPortal(
    <div className="privacy-controls">
      <div className="privacy-control-heading">
        <ShieldCheck size={20} />
        <div>
          <strong>Your local data</strong>
          <span>Export it or remove only GemGo data from this browser.</span>
        </div>
      </div>
      <div className="privacy-control-actions">
        <button type="button" className="button button-secondary" onClick={exportData}>
          <Download size={17} />
          Export JSON
        </button>
        <button type="button" className="button privacy-delete-button" onClick={() => setConfirming(true)}>
          <Trash2 size={17} />
          Delete local data
        </button>
      </div>
      {confirming && (
        <div className="privacy-confirm" role="alertdialog" aria-label="Confirm deletion of local GemGo data">
          <button type="button" className="icon-button" aria-label="Cancel deletion" onClick={() => setConfirming(false)}>
            <X size={17} />
          </button>
          <strong>Delete GemGo data from this browser?</strong>
          <p>Saved trips, GemPoints history, visit feedback, reward codes and local preferences will be removed. This cannot be undone.</p>
          <div>
            <button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>Cancel</button>
            <button type="button" className="button privacy-delete-confirm" onClick={deleteData}>Delete data</button>
          </div>
        </div>
      )}
    </div>,
    target,
  );
}
