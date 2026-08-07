"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  Compass,
  HeartHandshake,
  Leaf,
  MapPin,
  Mountain,
  PlayCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import AlpineOverview from "./components/AlpineOverview";
import AppShell from "./components/AppShell";
import HeroAlpineMap from "./components/HeroAlpineMap";
import HeroComparison from "./components/HeroComparison";
import MarketingHeader from "./components/MarketingHeader";
import { usePersistentLocale } from "./hooks/usePersistentLocale";
import { marketingCopy } from "./i18n/marketing";

export default function HomePage() {
  const pathname = usePathname();
  const { locale, setLocale } = usePersistentLocale();
  const text = marketingCopy[locale];
  if (pathname.startsWith("/app")) return <AppShell />;

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
              <Link href="/app" className="button button-primary button-large"><Search size={21} />{text.hero.find}</Link>
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

      <section className="landing-impact-strip" aria-label={text.problem.title}>
        <div className="impact-intro"><span><Users size={25} /></span><p><strong>{text.problem.title}</strong>{text.problem.body}</p></div>
        <div><Users /><p><strong>{text.institutions.metrics[0]}</strong>{text.problem.cycle[2]}</p></div>
        <div><HeartHandshake /><p><strong>{text.coverage.principles[1].title}</strong>{text.coverage.principles[1].body}</p></div>
        <div><Mountain /><p><strong>{text.coverage.principles[2].title}</strong>{text.coverage.principles[2].body}</p></div>
        <div><BarChart3 /><p><strong>{text.institutions.eyebrow}</strong>{text.institutions.metrics[2]}</p></div>
      </section>

      <section className="marketing-section how-section" id="how">
        <div className="section-intro">
          <span className="eyebrow"><Compass size={15} />{text.how.eyebrow}</span>
          <h2>{text.how.title}</h2>
          <p>{text.how.body}</p>
        </div>
        <div className="how-grid compact-how-grid">
          {text.how.steps.map((step, index) => (
            <article key={step.title}><span className="step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p><small>{step.note}</small></article>
          ))}
        </div>
      </section>

      <section className="marketing-section coverage-section" id="coverage">
        <div className="coverage-copy">
          <span className="eyebrow"><Mountain size={15} />{text.coverage.eyebrow}</span>
          <h2>{text.coverage.title}</h2>
          <p>{text.coverage.body}</p>
          <div className="coverage-principles">
            {text.coverage.principles.map((principle) => <span key={principle.title}><MapPin size={18} /><strong>{principle.title}</strong><small>{principle.body}</small></span>)}
          </div>
        </div>
        <AlpineOverview compact locale={locale} />
      </section>

      <section className="marketing-section institutional-section" id="destinations">
        <div className="institutional-copy">
          <span className="eyebrow"><HeartHandshake size={15} />{text.institutions.eyebrow}</span>
          <h2>{text.institutions.title}</h2>
          <p>{text.institutions.body}</p>
          <Link href="/about" className="button button-secondary">{text.navigation.why}<ArrowRight size={17} /></Link>
        </div>
        <div className="institutional-visual honest-demo-panel">
          <span className="demo-label">{text.institutions.demo}</span>
          <div className="institutional-metrics">{["38%", "27%", "84%"].map((value, index) => <div key={value}><strong>{value}</strong><span>{text.institutions.metrics[index]}</span></div>)}</div>
          <small>{text.footer.disclosure}</small>
        </div>
      </section>

      <section className="final-cta-section">
        <div><span className="eyebrow"><Sparkles size={15} />{text.final.eyebrow}</span><h2>{text.final.title}</h2><p>{text.final.body}</p></div>
        <Link href="/app" className="button button-primary button-large">{text.final.cta}<ArrowRight size={18} /></Link>
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
