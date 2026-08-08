"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Car, Clock3, Coins, Leaf, ParkingCircle, Users } from "lucide-react";
import type { Locale } from "../domain";
import DestinationPhoto from "./DestinationPhoto";

const copy = {
  en: { original: "Your original plan", hotspot: "Neuschwanstein Castle", suggested: "GemGo suggests", alternative: "Falkenstein Ruin Pfronten", crowd: "High crowd expected", parking: "Limited parking", peak: "Peak period", lower: "Lower crowd expected", away: "About 30 min away", similar: "Comparable castle experience", points: "+60 GemPoints", choose: "Choose this alternative" },
  it: { original: "Il tuo piano originale", hotspot: "Castello di Neuschwanstein", suggested: "GemGo suggerisce", alternative: "Rovine di Falkenstein a Pfronten", crowd: "Affollamento elevato previsto", parking: "Parcheggio limitato", peak: "Fascia di punta", lower: "Affollamento inferiore previsto", away: "Circa 30 min di distanza", similar: "Esperienza tra castelli comparabile", points: "+60 GemPoints", choose: "Scegli questa alternativa" },
  de: { original: "Dein ursprünglicher Plan", hotspot: "Schloss Neuschwanstein", suggested: "GemGo empfiehlt", alternative: "Burgruine Falkenstein Pfronten", crowd: "Hoher Andrang erwartet", parking: "Begrenzte Parkplätze", peak: "Stoßzeit", lower: "Weniger Andrang erwartet", away: "Etwa 30 Min. entfernt", similar: "Vergleichbares Burgen-Erlebnis", points: "+60 GemPoints", choose: "Alternative auswählen" },
  fr: { original: "Votre projet initial", hotspot: "Château de Neuschwanstein", suggested: "GemGo propose", alternative: "Ruines de Falkenstein à Pfronten", crowd: "Forte affluence prévue", parking: "Stationnement limité", peak: "Période de pointe", lower: "Affluence prévue plus faible", away: "À environ 30 min", similar: "Expérience de château comparable", points: "+60 GemPoints", choose: "Choisir cette alternative" },
  sl: { original: "Vaš prvotni načrt", hotspot: "Grad Neuschwanstein", suggested: "GemGo predlaga", alternative: "Razvaline Falkenstein Pfronten", crowd: "Pričakovana velika gneča", parking: "Omejeno parkiranje", peak: "Čas največjega obiska", lower: "Pričakovana manjša gneča", away: "Približno 30 min stran", similar: "Primerljivo grajsko doživetje", points: "+60 GemPoints", choose: "Izberi alternativo" },
} as const;

export default function HeroComparison({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <div className="hero-comparison" aria-label={`${t.hotspot} → ${t.alternative}`}>
      <article className="hero-plan-card hero-plan-original">
        <span className="hero-card-kicker">{t.original}</span>
        <h2>{t.hotspot}</h2>
        <DestinationPhoto compact name="Neuschwanstein Castle" region="Bavaria" />
        <div className="hero-card-facts">
          <span><Users size={19} />{t.crowd}</span>
          <span><ParkingCircle size={19} />{t.parking}</span>
          <span><Clock3 size={19} />{t.peak}</span>
        </div>
      </article>
      <span className="hero-plan-arrow"><ArrowRight className="desktop-arrow" size={24} /><ArrowDown className="mobile-arrow" size={24} /></span>
      <article className="hero-plan-card hero-plan-alternative">
        <span className="hero-card-kicker">{t.suggested}</span>
        <h2>{t.alternative}</h2>
        <DestinationPhoto compact name="Falkenstein Ruin Pfronten" region="Bavaria" />
        <div className="hero-card-facts">
          <span><Users size={19} />{t.lower}</span>
          <span><Car size={19} />{t.away}</span>
          <span><Leaf size={19} />{t.similar}</span>
          <strong><Coins size={19} />{t.points}</strong>
        </div>
        <Link href="/app/explore" className="button button-primary button-full">{t.choose}</Link>
      </article>
    </div>
  );
}
