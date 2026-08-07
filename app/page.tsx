"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Gift,
  Globe2,
  HeartHandshake,
  Map,
  MapPin,
  Mountain,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import AlpineOverview from "./components/AlpineOverview";
import AppShell from "./components/AppShell";
import MarketingHeader from "./components/MarketingHeader";
import { usePersistentLocale } from "./hooks/usePersistentLocale";
import { marketingCopy } from "./i18n/marketing";

export default function HomePage() {
  const pathname = usePathname();
  const { locale, setLocale } = usePersistentLocale();
  const text = marketingCopy[locale];
  if (pathname.startsWith("/app")) return <AppShell />;

  const principleIcons = [Globe2, MapPin, BadgeCheck];

  return (
    <main className="marketing-page">
      <MarketingHeader locale={locale} onLocaleChange={setLocale} copy={text} />

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><Globe2 size={15} /> {text.hero.eyebrow}</span>
          <h1>{text.hero.title} <em>{text.hero.emphasis}</em></h1>
          <p>{text.hero.body}</p>
          <div className="hero-actions">
            <Link href="/app" className="button button-primary button-large">{text.hero.find} <ArrowRight size={18} /></Link>
            <a href="#coverage" className="button button-secondary button-large"><Map size={18} /> {text.hero.map}</a>
          </div>
          <div className="hero-trust-row">
            <span><CheckCircle2 size={16} /> {text.hero.trust[0]}</span>
            <span><ShieldCheck size={16} /> {text.hero.trust[1]}</span>
            <span><Sparkles size={16} /> {text.hero.trust[2]}</span>
          </div>
        </div>

        <div className="hero-map-wrap">
          <AlpineOverview locale={locale} />
          <div className="hero-floating-card card-b">
            <Route size={18} />
            <div><strong>{text.map.alternative}</strong><small>{text.map.alternativeTime}</small></div>
          </div>
          <div className="hero-floating-card card-a">
            <span className="crowd-indicator crowd-low" />
            <div><strong>{text.map.lowerWindow}</strong><small>{text.map.lowerPlace}</small></div>
          </div>
        </div>
      </section>

      <section className="problem-strip">
        <div><strong>{text.problem.title}</strong><span>{text.problem.body}</span></div>
        <div className="problem-cycle">
          {text.problem.cycle.map((item, index) => (
            <span className="problem-cycle-step" key={item}>{item}{index < text.problem.cycle.length - 1 && <ChevronRight size={15} />}</span>
          ))}
        </div>
      </section>

      <section className="marketing-section how-section" id="how">
        <div className="section-intro">
          <span className="eyebrow"><Compass size={15} /> {text.how.eyebrow}</span>
          <h2>{text.how.title}</h2>
          <p>{text.how.body}</p>
        </div>
        <div className="how-grid">
          {text.how.steps.map((step, index) => {
            const Icon = [Target, Route, Gift][index];
            return <article key={step.title}><span className="step-number">0{index + 1}</span><div className="step-icon"><Icon size={25} /></div><h3>{step.title}</h3><p>{step.body}</p><small>{step.note}</small></article>;
          })}
        </div>
      </section>

      <section className="marketing-section coverage-section" id="coverage">
        <div className="coverage-copy">
          <span className="eyebrow"><Mountain size={15} /> {text.coverage.eyebrow}</span>
          <h2>{text.coverage.title}</h2>
          <p>{text.coverage.body}</p>
          <div className="coverage-principles">
            {text.coverage.principles.map((principle, index) => {
              const Icon = principleIcons[index];
              return <span key={principle.title}><Icon size={18} /><strong>{principle.title}</strong><small>{principle.body}</small></span>;
            })}
          </div>
        </div>
        <AlpineOverview compact locale={locale} />
      </section>

      <section className="marketing-section proof-section" id="proof">
        <div className="section-intro narrow">
          <span className="eyebrow"><Sparkles size={15} /> {text.proof.eyebrow}</span>
          <h2>{text.proof.title}</h2>
          <p>{text.proof.body}</p>
        </div>
        <div className="proof-comparison">
          <article className="proof-original">
            <span>{text.proof.original}</span><h3>{text.proof.popular}</h3>
            <p><Users size={18} /> {text.proof.expected}</p><p><MapPin size={18} /> {text.proof.parking}</p><p><Clock3 size={18} /> {text.proof.rigid}</p>
          </article>
          <div className="proof-arrow"><ArrowRight size={28} /></div>
          <article className="proof-alternative">
            <span>{text.proof.alternative}</span><h3>{text.proof.quieter}</h3>
            <p><Route size={18} /> {text.proof.away}</p><p><Users size={18} /> {text.proof.crowd}</p><p><HeartHandshake size={18} /> {text.proof.reward}</p>
            <Link href="/app" className="inline-link">{text.proof.view} <ArrowRight size={16} /></Link>
          </article>
        </div>
      </section>

      <section className="marketing-section institutional-section">
        <div className="institutional-visual">
          <span className="demo-label">{text.institutions.demo}</span>
          <div className="institutional-metrics">
            {["38%", "27%", "84%"].map((value, index) => <div key={value}><strong>{value}</strong><span>{text.institutions.metrics[index]}</span></div>)}
          </div>
        </div>
        <div className="institutional-copy">
          <span className="eyebrow"><Globe2 size={15} /> {text.institutions.eyebrow}</span>
          <h2>{text.institutions.title}</h2><p>{text.institutions.body}</p>
          <Link href="/app" className="button button-secondary">{text.institutions.dashboard} <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="marketing-section team-section-marketing" id="team">
        <div className="section-intro narrow">
          <span className="eyebrow"><UserRound size={15} /> {text.team.eyebrow}</span>
          <h2>{text.team.title}</h2><p>{text.team.body}</p>
        </div>
        <div className="team-role-grid">
          {["Mattia Centonze", "Killian Foloppe", "Martino Dalla Fontana"].map((name, index) => <article key={name}><strong>{name}</strong><span>{text.team.roles[index]}</span></article>)}
        </div>
        <div className="achievement-banner"><BadgeCheck size={22} /><div><strong>{text.team.achievement}</strong><span>{text.team.achievementBody}</span></div></div>
      </section>

      <section className="final-cta-section">
        <div><span className="eyebrow">{text.final.eyebrow}</span><h2>{text.final.title}</h2><p>{text.final.body}</p></div>
        <Link href="/app" className="button button-primary button-large">{text.final.cta} <ArrowRight size={18} /></Link>
      </section>

      <footer className="marketing-footer">
        <div className="brand"><span className="brand-mark"><Mountain size={20} /></span><span><strong>GemGo</strong><small>{text.tagline}</small></span></div>
        <p>{text.footer.body}</p>
        <div><Link href="/app">Explore</Link><a href="#how">{text.footer.method}</a><Link href="/privacy">{text.footer.privacy}</Link><Link href="/app">{text.footer.institutions}</Link></div>
        <small>{text.footer.disclosure}</small>
      </footer>
    </main>
  );
}
