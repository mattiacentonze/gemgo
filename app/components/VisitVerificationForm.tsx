"use client";

import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { Locale } from "../domain";
import { visitVerificationCopy } from "../i18n/visit-verification";

export type VerifiedVisitResult = {
  verification_id: string;
  verification_status: "verified";
  awarded_now: number;
  balance: number;
  accepted_gemdrop: boolean;
  points_awarded: number;
  verified_at: string;
};

type ClaimedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

const responseError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string"
    ? body.error
    : "verification_unavailable";
};

export default function VisitVerificationForm({
  locale,
  signedIn,
  tripId,
  experienceId,
  onBeforeSubmit,
  onVerified,
}: {
  locale: Locale;
  signedIn: boolean;
  tripId: string | null;
  experienceId: string;
  onBeforeSubmit: () => void | Promise<void>;
  onVerified: (result: VerifiedVisitResult) => void | Promise<void>;
}) {
  const text = visitVerificationCopy[locale];
  const requestIdRef = useRef<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<ClaimedLocation | null>(null);
  const [consent, setConsent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error" | "success">(
    "info",
  );

  useEffect(() => {
    requestIdRef.current = null;
  }, [experienceId, tripId]);

  const showError = (code: string) => {
    setMessage(
      text.errors[code] ?? text.errors.verification_unavailable,
    );
    setMessageTone("error");
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showError("geolocation_unsupported");
      return;
    }
    setLocating(true);
    setMessage(text.locating);
    setMessageTone("info");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        if (
          !Number.isFinite(position.coords.accuracy) ||
          position.coords.accuracy < 1 ||
          position.coords.accuracy > 100
        ) {
          setLocation(null);
          showError("location_inaccurate");
          return;
        }
        const capturedTime = Number.isFinite(position.timestamp)
          ? position.timestamp
          : Date.now();
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(capturedTime).toISOString(),
        };
        requestIdRef.current = null;
        setLocation(nextLocation);
        setMessage(text.locationReady(Math.ceil(nextLocation.accuracy)));
        setMessageTone("success");
      },
      () => {
        setLocating(false);
        setLocation(null);
        showError("geolocation_denied");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signedIn || !tripId) {
      showError("authentication_required");
      return;
    }
    if (!photo) {
      showError("photo_required");
      return;
    }
    if (!location) {
      showError("location_required");
      return;
    }
    if (!consent) {
      showError("consent_required");
      return;
    }

    const requestId = requestIdRef.current ?? crypto.randomUUID();
    requestIdRef.current = requestId;
    const form = new FormData();
    form.set("clientRequestId", requestId);
    form.set("tripId", tripId);
    form.set("experienceId", experienceId);
    form.set("locationLatitude", String(location.latitude));
    form.set("locationLongitude", String(location.longitude));
    form.set("locationAccuracy", String(location.accuracy));
    form.set("locationCapturedAt", location.capturedAt);
    form.set("consent", "true");
    form.set("photo", photo);

    setSubmitting(true);
    setMessage(text.submitting);
    setMessageTone("info");
    try {
      await onBeforeSubmit();
      const response = await fetch("/api/visits", {
        method: "POST",
        body: form,
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        showError(await responseError(response));
        return;
      }
      const body = (await response.json()) as {
        verification?: VerifiedVisitResult;
      };
      if (body.verification?.verification_status !== "verified") {
        showError("verification_unavailable");
        return;
      }
      const result = body.verification;
      setMessage(
        result.awarded_now > 0
          ? `${text.success(result.awarded_now)}${result.accepted_gemdrop ? ` ${text.gemDropBonus}` : ""}`
          : text.replayed,
      );
      setMessageTone("success");
      await onVerified(result);
    } catch {
      showError("verification_unavailable");
    } finally {
      setSubmitting(false);
    }
  };

  if (!signedIn || !tripId) {
    return (
      <section className="visit-verification-guest" aria-label={text.guestBadge}>
        <span className="ai-demo-pill">{text.guestBadge}</span>
        <p>{text.guestOnly}</p>
      </section>
    );
  }

  return (
    <form className="visit-verification-form" onSubmit={submit}>
      <header>
        <ShieldCheck size={24} aria-hidden="true" />
        <div>
          <span className="visit-live-pill">{text.liveBadge}</span>
          <h3>{text.title}</h3>
          <p>{text.intro}</p>
        </div>
      </header>

      <fieldset disabled={submitting}>
        <legend>{text.photoLabel}</legend>
        <p>{text.photoHelp}</p>
        <label className="visit-photo-control">
          <Camera size={20} aria-hidden="true" />
          <span>{text.choosePhoto}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => {
              const nextPhoto = event.currentTarget.files?.[0] ?? null;
              setPhoto(nextPhoto);
              requestIdRef.current = null;
              setMessage(nextPhoto ? text.selectedPhoto(nextPhoto.name) : "");
              setMessageTone("info");
            }}
          />
        </label>
        {photo && <small>{text.selectedPhoto(photo.name)}</small>}
      </fieldset>

      <fieldset disabled={submitting}>
        <legend>{text.locationLabel}</legend>
        <p>{text.locationHelp}</p>
        <button
          type="button"
          className="button button-secondary visit-location-button"
          onClick={requestLocation}
          disabled={locating}
        >
          {locating ? (
            <LoaderCircle className="is-spinning" size={19} aria-hidden="true" />
          ) : location ? (
            <CheckCircle2 size={19} aria-hidden="true" />
          ) : (
            <LocateFixed size={19} aria-hidden="true" />
          )}
          {locating
            ? text.locating
            : location
              ? text.locationReady(Math.ceil(location.accuracy))
              : text.getLocation}
        </button>
      </fieldset>

      <label className="visit-consent-control">
        <input
          type="checkbox"
          checked={consent}
          disabled={submitting}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{text.consent}</span>
      </label>

      <button
        type="submit"
        className="button button-primary button-full"
        disabled={submitting || !photo || !location || !consent}
      >
        {submitting ? (
          <LoaderCircle className="is-spinning" size={19} aria-hidden="true" />
        ) : (
          <ShieldCheck size={19} aria-hidden="true" />
        )}
        {submitting ? text.submitting : text.submit}
      </button>

      {message && (
        <p
          className={`visit-verification-message is-${messageTone}`}
          role={messageTone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </form>
  );
}
