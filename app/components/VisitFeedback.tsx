"use client";

import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import type { Locale } from "../domain";
import type { SavedTrip } from "../product/storage";

type Rating = "definitely" | "mostly" | "not-really";

export type FeedbackEntry = {
  tripId: string;
  experienceId: string;
  rating: Rating;
  comment?: string;
  createdAt: string;
};

export const FEEDBACK_KEY = "gemgo-visit-feedback-v1";

const copy = {
  en: { question: "Was this alternative worth the change?", body: "Your answer improves future recommendations and stays on this device.", yes: "Definitely", mostly: "Mostly", no: "Not really", note: "What could have been better?", optional: "Optional", placeholder: "Access, timing, description, route, crowd estimate…", save: "Save feedback", saved: "Feedback saved", savedBody: "Your response stays on this device in the current MVP." },
  it: { question: "È valsa la pena cambiare alternativa?", body: "La risposta migliora le raccomandazioni future e resta su questo dispositivo.", yes: "Sicuramente", mostly: "In gran parte", no: "Non molto", note: "Cosa poteva essere migliore?", optional: "Facoltativo", placeholder: "Accesso, orari, descrizione, percorso, stima dell’affollamento…", save: "Salva feedback", saved: "Feedback salvato", savedBody: "La risposta resta su questo dispositivo nell’MVP attuale." },
  de: { question: "Hat sich die Alternative gelohnt?", body: "Die Antwort verbessert künftige Empfehlungen und bleibt auf diesem Gerät.", yes: "Auf jeden Fall", mostly: "Meistens", no: "Nicht wirklich", note: "Was hätte besser sein können?", optional: "Optional", placeholder: "Zugang, Zeit, Beschreibung, Route, Besucherprognose…", save: "Feedback speichern", saved: "Feedback gespeichert", savedBody: "Die Antwort bleibt im aktuellen MVP auf diesem Gerät." },
  fr: { question: "Cette alternative valait-elle le changement ?", body: "Votre réponse améliore les futures recommandations et reste sur cet appareil.", yes: "Tout à fait", mostly: "Plutôt", no: "Pas vraiment", note: "Qu’aurait-on pu améliorer ?", optional: "Facultatif", placeholder: "Accès, horaires, description, itinéraire, estimation d’affluence…", save: "Enregistrer l’avis", saved: "Avis enregistré", savedBody: "Votre réponse reste sur cet appareil dans le MVP actuel." },
  sl: { question: "Je bila alternativa vredna spremembe?", body: "Odgovor izboljša prihodnja priporočila in ostane v tej napravi.", yes: "Vsekakor", mostly: "Večinoma", no: "Ne povsem", note: "Kaj bi lahko bilo boljše?", optional: "Neobvezno", placeholder: "Dostop, čas, opis, pot, ocena obiska…", save: "Shrani odziv", saved: "Odziv shranjen", savedBody: "Odziv v trenutnem MVP ostane v tej napravi." },
} as const;

export const readFeedback = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
};

export const readFeedbackStats = () => {
  const entries = readFeedback();
  return {
    total: entries.length,
    detailed: entries.filter((entry) =>
      (entry.comment ?? "").trim().split(/\s+/).filter(Boolean).length >= 15,
    ).length,
  };
};

export default function VisitFeedback({ trip, locale }: { trip: SavedTrip | null; locale: Locale }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(() => trip ? readFeedback().some((item) => item.tripId === trip.id) : false);
  const text = copy[locale];

  if (!trip?.trip.verified) return null;

  const submit = () => {
    if (!rating) return;
    const current = readFeedback().filter((item) => item.tripId !== trip.id);
    const next: FeedbackEntry[] = [...current, {
      tripId: trip.id,
      experienceId: trip.trip.experienceId,
      rating,
      comment: comment.trim() || undefined,
      createdAt: new Date().toISOString(),
    }];
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("gemgo:feedback-saved"));
    setSubmitted(true);
    window.dispatchEvent(new CustomEvent("gemgo:ui-sound", { detail: "success" }));
  };

  return (
    <section className="visit-feedback-card" aria-label={text.question}>
      {submitted ? (
        <div className="visit-feedback-complete"><CheckCircle2 size={24} /><div><strong>{text.saved}</strong><span>{text.savedBody}</span></div></div>
      ) : (
        <>
          <div className="visit-feedback-heading"><MessageSquareText size={22} /><div><strong>{text.question}</strong><span>{text.body}</span></div></div>
          <div className="visit-rating-options">
            <button type="button" className={rating === "definitely" ? "is-selected" : ""} onClick={() => setRating("definitely")}>{text.yes}</button>
            <button type="button" className={rating === "mostly" ? "is-selected" : ""} onClick={() => setRating("mostly")}>{text.mostly}</button>
            <button type="button" className={rating === "not-really" ? "is-selected" : ""} onClick={() => setRating("not-really")}>{text.no}</button>
          </div>
          <label className="visit-feedback-note"><span>{text.note} <small>{text.optional}</small></span><textarea rows={3} value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder={text.placeholder} /><small>{comment.length}/500</small></label>
          <button type="button" className="button button-primary button-full" disabled={!rating} onClick={submit}><Send size={17} />{text.save}</button>
        </>
      )}
    </section>
  );
}
