"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Car, Clock3, Coins, Leaf, ParkingCircle, Users } from "lucide-react";
import type { Locale } from "../domain";
import DestinationPhoto from "./DestinationPhoto";

const copy = {
  en: { original: "Your original plan", hotspot: "Neuschwanstein Castle", suggested: "GemGo suggests", alternative: "Hohes Schloss Füssen", crowd: "High crowd expected", parking: "Limited parking", peak: "Peak period", lower: "Usually less crowded", away: "Short drive to Füssen", similar: "Historic castle & Alpine views", points: "+60 GemPoints", choose: "Choose this alternative" },
  it: { original: "Il tuo piano originale", hotspot: "Castello di Neuschwanstein", suggested: "GemGo suggerisce", alternative: "Hohes Schloss di Füssen", crowd: "Affollamento elevato previsto", parking: "Parcheggio limitato", peak: "Fascia di punta", lower: "Generalmente meno affollato", away: "Breve viaggio fino a Füssen", similar: "Castello storico e panorami alpini", points: "+60 GemPoints", choose: "Scegli questa alternativa" },
  de: { original: "Dein ursprünglicher Plan", hotspot: "Schloss Neuschwanstein", suggested: "GemGo empfiehlt", alternative: "Hohes Schloss Füssen", crowd: "Hoher Andrang erwartet", parking: "Begrenzte Parkplätze", peak: "Stoßzeit", lower: "Meist weniger besucht", away: "Kurze Fahrt nach Füssen", similar: "Historisches Schloss und Alpenblick", points: "+60 GemPoints", choose: "Alternative auswählen" },
  fr: { original: "Votre projet initial", hotspot: "Château de Neuschwanstein", suggested: "GemGo propose", alternative: "Hohes Schloss de Füssen", crowd: "Forte affluence prévue", parking: "Stationnement limité", peak: "Période de pointe", lower: "Généralement moins fréquenté", away: "Court trajet vers Füssen", similar: "Château historique et vues alpines", points: "+60 GemPoints", choose: "Choisir cette alternative" },
  sl: { original: "Vaš prvotni načrt", hotspot: "Grad Neuschwanstein", suggested: "GemGo predlaga", alternative: "Grad Hohes Schloss v Füssnu", crowd: "Pričakovana velika gneča", parking: "Omejeno parkiranje", peak: "Čas največjega obiska", lower: "Običajno manj gneče", away: "Kratka vožnja do Füssna", similar: "Zgodovinski grad in alpski razgledi", points: "+60 GemPoints", choose: "Izberi alternativo" },
} as const;

export default function HeroComparison({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <div className="hero-comparison" aria-label={`${t.hotspot} → ${t.alternative}`}>
      <article className="hero-plan-card hero-plan-original">
        <span className="hero-card-kicker">{t.original}</span>
        <DestinationPhoto destinationId="catalogue-alpify-castle-neuschwanstein" autoPlay autoPlayIntervalMs={4800} compact interactive={false} name="Neuschwanstein Castle" region="Bavaria" />
        <div className="hero-card-facts">
          <span><Users size={19} />{t.crowd}</span>
          <span><ParkingCircle size={19} />{t.parking}</span>
          <span><Clock3 size={19} />{t.peak}</span>
        </div>
      </article>
      <span className="hero-plan-arrow"><ArrowRight className="desktop-arrow" size={24} /><ArrowDown className="mobile-arrow" size={24} /></span>
      <article className="hero-plan-card hero-plan-alternative">
        <span className="hero-card-kicker">{t.suggested}</span>
        <DestinationPhoto destinationId="expert-hohes-schloss-fussen" autoPlay autoPlayIntervalMs={5600} compact interactive={false} name="Hohes Schloss Füssen" region="Bavaria" />
        <div className="hero-card-facts">
          <span><Users size={19} />{t.lower}</span>
          <span><Car size={19} />{t.away}</span>
          <span><Leaf size={19} />{t.similar}</span>
          <strong><Coins size={19} />{t.points}</strong>
        </div>
        <Link href="/app/experience/expert-hohes-schloss-fussen" className="button button-primary button-full">{t.choose}</Link>
      </article>
    </div>
  );
}
