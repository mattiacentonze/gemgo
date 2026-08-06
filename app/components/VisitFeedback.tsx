"use client";

import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SavedTrip } from "../product/storage";

type Rating = "definitely" | "mostly" | "not-really";

type FeedbackEntry = {
  tripId: string;
  experienceId: string;
  rating: Rating;
  comment?: string;
  createdAt: string;
};

const ACTIVE_TRIP_KEY = "gemgo-active-trip-v3";
const FEEDBACK_KEY = "gemgo-visit-feedback-v1";

const readActiveTrip = () => {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TRIP_KEY);
    return raw ? (JSON.parse(raw) as SavedTrip) : null;
  } catch {
    return null;
  }
};

const readFeedback = () => {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
};

export default function VisitFeedback() {
  const [target, setTarget] = useState<Element | null>(null);
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const lastSnapshotRef = useRef("");

  useEffect(() => {
    const resolve = () => {
      const activeTrip = readActiveTrip();
      const nextTarget = document.querySelector(".integrated-app .trip-side");
      const visibleTrip = activeTrip?.trip.verified ? activeTrip : null;
      const existing = visibleTrip ? readFeedback().some((item) => item.tripId === visibleTrip.id) : false;
      const snapshot = JSON.stringify({
        target: Boolean(nextTarget),
        tripId: visibleTrip?.id ?? null,
        updatedAt: visibleTrip?.updatedAt ?? null,
        existing,
      });
      if (snapshot === lastSnapshotRef.current) return;
      lastSnapshotRef.current = snapshot;
      setTrip(visibleTrip);
      setTarget(visibleTrip && nextTarget ? nextTarget : null);
      setSubmitted(existing);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", resolve);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", resolve);
    };
  }, []);

  const submit = () => {
    if (!trip || !rating) return;
    const current = readFeedback().filter((item) => item.tripId !== trip.id);
    const next: FeedbackEntry[] = [
      ...current,
      {
        tripId: trip.id,
        experienceId: trip.trip.experienceId,
        rating,
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
    ];
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    setSubmitted(true);
  };

  if (!target || !trip) return null;

  return createPortal(
    <section className="visit-feedback-card" aria-label="Visit feedback">
      {submitted ? (
        <div className="visit-feedback-complete">
          <CheckCircle2 size={24} />
          <div>
            <strong>Feedback saved</strong>
            <span>Your response stays on this device in the current MVP.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="visit-feedback-heading">
            <MessageSquareText size={22} />
            <div>
              <strong>Was this alternative worth the change?</strong>
              <span>This improves recommendation quality without requiring an account.</span>
            </div>
          </div>
          <div className="visit-rating-options">
            <button type="button" className={rating === "definitely" ? "is-selected" : ""} onClick={() => setRating("definitely")}>Definitely</button>
            <button type="button" className={rating === "mostly" ? "is-selected" : ""} onClick={() => setRating("mostly")}>Mostly</button>
            <button type="button" className={rating === "not-really" ? "is-selected" : ""} onClick={() => setRating("not-really")}>Not really</button>
          </div>
          <label className="visit-feedback-note">
            <span>What could have been better? <small>Optional</small></span>
            <textarea rows={3} value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Access, timing, description, route, crowd estimate…" />
            <small>{comment.length}/500</small>
          </label>
          <button type="button" className="button button-primary button-full" disabled={!rating} onClick={submit}>
            <Send size={17} />
            Save feedback
          </button>
        </>
      )}
    </section>,
    target,
  );
}
