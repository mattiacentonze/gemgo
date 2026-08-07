"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, Clock3, Coins, Navigation } from "lucide-react";
import type { Locale } from "../domain";
import type { RankedExperience } from "../product/recommendation-engine";
import type { Experience } from "../product/types";
import DestinationPhoto from "./DestinationPhoto";

type Props = {
  locale: Locale;
  item: RankedExperience;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
};

const copy: Record<Locale, {
  travel: string; duration: string; points: string; reasons: string; view: string; save: string; saved: string;
  crowd: Record<Experience["crowd"], string>;
  validation: Record<Experience["validation"], string>;
}> = {
  en: { travel: "Travel", duration: "Duration", points: "GemPoints", reasons: "Why it fits", view: "View experience", save: "Save", saved: "Saved", crowd: { low: "Low crowd", moderate: "Moderate crowd", high: "High crowd" }, validation: { "Data-based suggestion": "Data-based suggestion", "Locally reviewed": "Locally reviewed", "Verified Gem": "Verified Gem" } },
  it: { travel: "Viaggio", duration: "Durata", points: "GemPoints", reasons: "Perché è adatta", view: "Vedi esperienza", save: "Salva", saved: "Salvata", crowd: { low: "Poco affollata", moderate: "Affollamento moderato", high: "Molto affollata" }, validation: { "Data-based suggestion": "Suggerimento basato sui dati", "Locally reviewed": "Revisionata localmente", "Verified Gem": "Gem verificata" } },
  de: { travel: "Anreise", duration: "Dauer", points: "GemPoints", reasons: "Warum passend", view: "Erlebnis ansehen", save: "Speichern", saved: "Gespeichert", crowd: { low: "Wenig Andrang", moderate: "Mäßiger Andrang", high: "Hoher Andrang" }, validation: { "Data-based suggestion": "Datenbasierter Vorschlag", "Locally reviewed": "Lokal geprüft", "Verified Gem": "Bestätigtes Juwel" } },
  fr: { travel: "Trajet", duration: "Durée", points: "GemPoints", reasons: "Pourquoi ce choix", view: "Voir l’expérience", save: "Enregistrer", saved: "Enregistrée", crowd: { low: "Faible affluence", moderate: "Affluence modérée", high: "Forte affluence" }, validation: { "Data-based suggestion": "Suggestion fondée sur les données", "Locally reviewed": "Révisée localement", "Verified Gem": "Pépite vérifiée" } },
  sl: { travel: "Pot", duration: "Trajanje", points: "GemPoints", reasons: "Zakaj ustreza", view: "Oglej si doživetje", save: "Shrani", saved: "Shranjeno", crowd: { low: "Malo gneče", moderate: "Zmerna gneča", high: "Velika gneča" }, validation: { "Data-based suggestion": "Predlog na podlagi podatkov", "Locally reviewed": "Lokalno pregledano", "Verified Gem": "Potrjen biser" } },
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${minutes}m`;
};

export default function IntegratedResultCard({ locale, item, saved, onOpen, onSave }: Props) {
  const experience = item.experience;
  const text = copy[locale];

  return (
    <article className="experience-card integrated-result-card">
      <div className="experience-card-media">
        <DestinationPhoto name={experience.name} region={experience.region} compact />
        <span className={`crowd-chip crowd-${experience.crowd}`}>{text.crowd[experience.crowd]}</span>
      </div>
      <div className="experience-card-body">
        <div className="validation-label"><BadgeCheck size={18} /><span>{text.validation[experience.validation]}</span></div>
        <h2>{experience.name}</h2>
        <p className="experience-promise">{experience.promise}</p>
        <div className="experience-metrics result-metrics">
          <span><Navigation size={18} /><small>{text.travel}</small><strong>{item.travelMinutes === null ? "?" : formatDuration(item.travelMinutes)}</strong></span>
          <span><Clock3 size={18} /><small>{text.duration}</small><strong>{formatDuration(experience.durationMinutes)}</strong></span>
          <span><Coins size={18} /><small>{text.points}</small><strong>{experience.points}</strong></span>
        </div>
        <section className="recommendation-reasons" aria-label={text.reasons}>
          <strong>{text.reasons}</strong>
          <ul>{item.reasons.slice(0, 3).map((reason) => <li key={reason}><CheckCircle2 size={17} /><span>{reason}</span></li>)}</ul>
        </section>
        <div className="experience-card-actions">
          <button type="button" className="button button-primary" onClick={onOpen}>{text.view}<ArrowRight size={16} /></button>
          <button type="button" className="button button-secondary" onClick={onSave} disabled={saved}>{saved ? text.saved : text.save}</button>
        </div>
      </div>
    </article>
  );
}
