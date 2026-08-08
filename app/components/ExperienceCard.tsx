"use client";

import {
  ArrowRight,
  Bus,
  Car,
  CheckCircle2,
  Clock3,
  Footprints,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Experience, TransportMode } from "../product/types";

type Props = {
  experience: Experience;
  label: string;
  transport: TransportMode;
  onOpen: () => void;
  onSave: () => void;
  saved?: boolean;
};

const travelIcon = (transport: TransportMode) => {
  if (transport === "public") return <Bus size={16} />;
  if (transport === "walking") return <Footprints size={16} />;
  return <Car size={16} />;
};

const transportLabel: Record<TransportMode, string> = {
  walking: "walking",
  bicycle: "bicycle",
  public: "public transport",
  car: "car",
  mixed: "mixed mobility",
};

export default function ExperienceCard({ experience, label, transport, onOpen, onSave, saved = false }: Props) {
  const travel = experience.travel[transport] ?? experience.travel.car;
  return (
    <article className="experience-card">
      <div className={`experience-image image-tone-${experience.imageTone}`}>
        <div className="experience-image-overlay" />
        <div className="experience-card-badges">
          <span className="match-label"><Sparkles size={14} /> {label}</span>
          <span className={`crowd-chip crowd-${experience.crowd}`}>{experience.crowd} crowd</span>
        </div>
        <div className="experience-image-title">
          <span>{experience.region} · {experience.country}</span>
          <h3>{experience.name}</h3>
        </div>
      </div>

      <div className="experience-card-body">
        <p className="experience-promise">{experience.promise}</p>
        <div className="experience-metrics">
          <span>{travelIcon(transport)} {travel ? `${travel} min by ${transportLabel[transport]}` : "Route unavailable"}</span>
          <span><Clock3 size={16} /> {Math.round(experience.durationMinutes / 30) / 2}h experience</span>
        </div>
        <div className="crowd-confidence">
          <div>
            <strong>{experience.crowd === "low" ? "Low crowd expected" : "Manageable crowd expected"}</strong>
            <span>{experience.crowdWindow}</span>
          </div>
          <small>{experience.confidence} confidence · Updated {experience.updated}</small>
        </div>

        <ul className="reason-list">
          {experience.reasons.slice(0, 3).map((reason) => (
            <li key={reason}><CheckCircle2 size={16} /> {reason}</li>
          ))}
        </ul>

        <div className="validation-row">
          <span><ShieldCheck size={16} /> {experience.validation}</span>
          <span><MapPin size={16} /> +{experience.points} GemPoints after verification</span>
        </div>

        <div className="experience-actions">
          <button type="button" className="button button-primary" onClick={onOpen}>
            View experience <ArrowRight size={17} />
          </button>
          <button type="button" className="button button-secondary" onClick={onSave}>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
