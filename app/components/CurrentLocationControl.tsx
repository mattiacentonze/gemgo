"use client";

import { CheckCircle2, LocateFixed, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Status = "idle" | "loading" | "ready" | "error";

const setReactInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const reverseGeocode = async (latitude: number, longitude: number) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&lat=${latitude}&lon=${longitude}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("reverse-geocoding-unavailable");
  const result = await response.json() as {
    display_name?: string;
    address?: { city?: string; town?: string; village?: string; municipality?: string; state?: string; country?: string };
  };
  const locality = result.address?.city ?? result.address?.town ?? result.address?.village ?? result.address?.municipality;
  return [locality, result.address?.state, result.address?.country].filter(Boolean).join(", ") || result.display_name;
};

export default function CurrentLocationControl() {
  const [target, setTarget] = useState<Element | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Use only when you choose");

  useEffect(() => {
    const resolve = () => {
      const grid = document.querySelector(".integrated-app .field-grid-location");
      setTarget(grid?.closest(".form-section")?.querySelector(".form-section-title") ?? null);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const useLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Location is not supported by this browser");
      return;
    }

    setStatus("loading");
    setMessage("Requesting your permission…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          label = await reverseGeocode(latitude, longitude) || label;
        } catch {
          // Coordinates remain usable when reverse geocoding is unavailable.
        }
        const input = document.querySelector<HTMLInputElement>(".integrated-app .field-grid-location input");
        if (!input) {
          setStatus("error");
          setMessage("The starting-point field is not available");
          return;
        }
        setReactInputValue(input, label);
        setStatus("ready");
        setMessage("Current area added to the planner");
      },
      (error) => {
        setStatus("error");
        setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was not granted" : "Current location could not be determined");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  if (!target) return null;

  return createPortal(
    <div className={`current-location-control is-${status}`}>
      <button type="button" onClick={useLocation} disabled={status === "loading"}>
        {status === "loading" ? <LoaderCircle className="location-spinner" size={17} /> : status === "ready" ? <CheckCircle2 size={17} /> : status === "error" ? <TriangleAlert size={17} /> : <LocateFixed size={17} />}
        Use my location
      </button>
      <small>{message}</small>
    </div>,
    target,
  );
}
