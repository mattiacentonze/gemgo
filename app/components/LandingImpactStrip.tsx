"use client";

import { BarChart3, HeartHandshake, Mountain, Sprout, Users } from "lucide-react";
import type { Locale } from "../domain";

const copy = {
  en: {
    why: "Why it matters",
    whyBody: "GemGo helps distribute tourism pressure and benefits more evenly across the Alps.",
    items: [
      ["Less pressure", "on overcrowded hotspots"],
      ["More benefits", "for local communities all year round"],
      ["Better experiences", "for visitors in harmony with the Alps"],
      ["Data for action", "for destinations and policy makers"],
    ],
  },
  it: {
    why: "Perché conta",
    whyBody: "GemGo distribuisce meglio la pressione turistica e i benefici tra le comunità alpine.",
    items: [
      ["Meno pressione", "sugli hotspot sovraffollati"],
      ["Più benefici", "per le comunità locali tutto l’anno"],
      ["Esperienze migliori", "in armonia con le Alpi"],
      ["Dati per agire", "per destinazioni e decisori pubblici"],
    ],
  },
  de: {
    why: "Warum es zählt",
    whyBody: "GemGo verteilt Besucherdruck und Nutzen gleichmäßiger im Alpenraum.",
    items: [
      ["Weniger Druck", "auf überlastete Hotspots"],
      ["Mehr Nutzen", "für lokale Gemeinden das ganze Jahr"],
      ["Bessere Erlebnisse", "im Einklang mit den Alpen"],
      ["Daten zum Handeln", "für Destinationen und Politik"],
    ],
  },
  fr: {
    why: "Pourquoi c’est important",
    whyBody: "GemGo répartit mieux la pression touristique et les bénéfices dans les Alpes.",
    items: [
      ["Moins de pression", "sur les sites surfréquentés"],
      ["Plus de bénéfices", "pour les communautés toute l’année"],
      ["De meilleures expériences", "en harmonie avec les Alpes"],
      ["Des données utiles", "pour les destinations et décideurs"],
    ],
  },
  sl: {
    why: "Zakaj je pomembno",
    whyBody: "GemGo enakomerneje porazdeli turistični pritisk in koristi po Alpah.",
    items: [
      ["Manj pritiska", "na preobremenjene točke"],
      ["Več koristi", "za lokalne skupnosti vse leto"],
      ["Boljša doživetja", "v sozvočju z Alpami"],
      ["Podatki za ukrepanje", "za destinacije in odločevalce"],
    ],
  },
} as const;

const icons = [Users, Sprout, Mountain, BarChart3] as const;

export default function LandingImpactStrip({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return (
    <section className="landing-impact-strip" aria-label={text.why}>
      <div className="impact-intro">
        <span><HeartHandshake size={24} /></span>
        <p><strong>{text.why}</strong>{text.whyBody}</p>
      </div>
      {text.items.map(([title, body], index) => {
        const Icon = icons[index];
        return (
          <div key={title}>
            <Icon size={30} />
            <p><strong>{title}</strong>{body}</p>
          </div>
        );
      })}
    </section>
  );
}
