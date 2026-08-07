"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Compass,
  Leaf,
  PlayCircle,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import HeroAlpineMap from "./components/HeroAlpineMap";
import HeroComparison from "./components/HeroComparison";
import MarketingHeader from "./components/MarketingHeader";
import { usePersistentLocale } from "./hooks/usePersistentLocale";
import { marketingCopy } from "./i18n/marketing";

export default function HomePage() {
  const { locale, setLocale } = usePersistentLocale();
  const text = marketingCopy[locale];

  return (
    <main className="marketing-page landing-v2">
      <MarketingHeader locale={locale} onLocaleChange={setLocale} copy={text} />

      <section className="landing-hero" id="top">
        <div className="landing-map-layer"><HeroAlpineMap /></div>
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">{text.hero.eyebrow}</span>
            <h1>{text.hero.title}<br /><em>{text.hero.emphasis}</em></h1>
            <p>{text.hero.body}</p>
            <div className="landing-hero-actions">
              <Link href="/app/explore" className="button button-primary button-large"><Search size={21} />{text.hero.find}</Link>
              <a href="#how" className="button button-secondary button-large"><PlayCircle size={21} />{text.navigation.how}</a>
            </div>
            <div className="landing-benefits" aria-label="GemGo benefits">
              <span><Users size={23} />{text.hero.trust[0]}</span>
              <span><Clock3 size={23} />{text.hero.trust[1]}</span>
              <span><Leaf size={23} />{text.hero.trust[2]}</span>
              <span><BadgeCheck size={23} />GemPoints</span>
            </div>
          </div>
          <HeroComparison locale={locale} />
        </div>
        <div className="landing-personalisation">
          <span>{text.how.steps[0].body}</span>
          <div><Compass /><Clock3 /><Leaf /><Users /></div>
        </div>
      </section>

      <section className="landing-problem-statement" aria-label={text.problem.title}>
        <Users size={26} />
        <div><strong>{text.problem.title}</strong><p>{text.problem.body}</p></div>
      </section>

      <section className="landing-quick-paths" id="how">
        <div className="landing-quick-intro"><span className="eyebrow"><Compass size={15} />{text.how.eyebrow}</span><h2>{text.how.title}</h2><p>{text.how.body}</p></div>
        <div className="landing-quick-grid">
          <Link href="/app/explore"><Search size={25} /><span><strong>{text.hero.find}</strong><small>{text.how.steps[1].body}</small></span><ArrowRight size={18} /></Link>
          <Link href="/about"><Users size={25} /><span><strong>{text.navigation.team}</strong><small>{text.team.body}</small></span><ArrowRight size={18} /></Link>
          <Link href="/privacy"><ShieldCheck size={25} /><span><strong>{text.footer.privacy}</strong><small>{text.footer.disclosure}</small></span><ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="brand"><img src="/assets/gemgo-logo-green.svg?v=2" alt="" /><span><strong>GemGo</strong><small>Better Alpine Choices</small></span></div>
        <p>{text.footer.body}</p>
        <div><a href="#how">{text.footer.method}</a><Link href="/about">{text.navigation.team}</Link><Link href="/privacy" target="_blank">{text.footer.privacy}</Link></div>
        <small>{text.footer.disclosure}</small>
      </footer>
    </main>
  );
}
