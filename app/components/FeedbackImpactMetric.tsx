"use client";

import { MessageSquareText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rating = "definitely" | "mostly" | "not-really";

type FeedbackEntry = {
  tripId: string;
  experienceId: string;
  rating: Rating;
  comment?: string;
  createdAt: string;
};

const FEEDBACK_KEY = "gemgo-visit-feedback-v1";

const loadFeedback = () => {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
};

export default function FeedbackImpactMetric() {
  const [target, setTarget] = useState<Element | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const snapshotRef = useRef("");

  useEffect(() => {
    const resolve = () => {
      const nextTarget = document.querySelector(".integrated-app .dashboard-metrics");
      const nextFeedback = loadFeedback();
      const snapshot = `${Boolean(nextTarget)}|${JSON.stringify(nextFeedback)}`;
      if (snapshot === snapshotRef.current) return;
      snapshotRef.current = snapshot;
      setTarget(nextTarget);
      setFeedback(nextFeedback);
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

  const satisfaction = useMemo(() => {
    if (feedback.length === 0) return null;
    const positive = feedback.filter((item) => item.rating === "definitely" || item.rating === "mostly").length;
    return Math.round((positive / feedback.length) * 100);
  }, [feedback]);

  if (!target) return null;

  return createPortal(
    <article className="feedback-impact-metric">
      <MessageSquareText size={20} />
      <span>Alternative satisfaction</span>
      <strong>{satisfaction === null ? "—" : `${satisfaction}%`}</strong>
      <small>{feedback.length === 0 ? "No local feedback yet" : `${feedback.length} device-local response${feedback.length === 1 ? "" : "s"}`}</small>
    </article>,
    target,
  );
}
