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
  Languages,
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

export default function HomePage() {
  const pathname = usePathname();
  if (pathname.startsWith("/app")) return <AppShell />;

  return (
    <main className="marketing-page">
      <header className="marketing-header">
        <a href="#top" className="brand" aria-label="GemGo homepage">
          <span className="brand-mark"><Mountain size={22} /></span>
          <span><strong>GemGo</strong><small>Better Alpine choices</small></span>
        </a>
        <nav aria-label="Homepage navigation">
          <a href="#how">How it works</a>
          <a href="#coverage">Across the Alps</a>
          <a href="#proof">Why GemGo</a>
          <a href="#team">Meet the team</a>
        </nav>
        <div className="marketing-header-actions">
          <button type="button" className="icon-text-button"><Languages size={17} /> EN</button>
          <Link href="/app" className="button button-primary button-small">Try the app now <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><Globe2 size={15} /> One system across the Alps</span>
          <h1>Explore more of the Alps, <em>without following the crowd.</em></h1>
          <p>GemGo recommends quieter places and better times across Alpine regions, based on your interests, location, mobility and current conditions.</p>
          <div className="hero-actions">
            <Link href="/app" className="button button-primary button-large">Find my Alpine experience <ArrowRight size={18} /></Link>
            <a href="#coverage" className="button button-secondary button-large"><Map size={18} /> Explore the Alpine map</a>
          </div>
          <div className="hero-trust-row">
            <span><CheckCircle2 size={16} /> No account required to explore</span>
            <span><ShieldCheck size={16} /> Privacy-first verification</span>
            <span><Sparkles size={16} /> Explainable recommendations</span>
          </div>
        </div>

        <div className="hero-map-wrap">
          <AlpineOverview />
          <div className="hero-floating-card card-a">
            <span className="crowd-indicator crowd-low" />
            <div><strong>Lower-pressure window</strong><small>Valpelline · after 15:00</small></div>
          </div>
          <div className="hero-floating-card card-b">
            <Route size={18} />
            <div><strong>Comparable alternative</strong><small>28 min from your starting point</small></div>
          </div>
        </div>
      </section>

      <section className="problem-strip">
        <div><strong>Popular plans concentrate pressure.</strong><span>GemGo does not ask visitors to travel less. It helps them choose better.</span></div>
        <div className="problem-cycle"><span>Predict</span><ChevronRight size={15} /><span>Recommend</span><ChevronRight size={15} /><span>Redirect</span><ChevronRight size={15} /><span>Verify</span><ChevronRight size={15} /><span>Reward</span><ChevronRight size={15} /><span>Measure</span></div>
      </section>

      <section className="marketing-section how-section" id="how">
        <div className="section-intro">
          <span className="eyebrow"><Compass size={15} /> How it works</span>
          <h2>From an intended hotspot to a better Alpine experience</h2>
          <p>GemGo stays focused on one decision: finding a compatible alternative that the visitor will genuinely value.</p>
        </div>
        <div className="how-grid">
          <article><span className="step-number">01</span><div className="step-icon"><Target size={25} /></div><h3>Tell us what you are looking for</h3><p>Location, available time, interests, mobility, difficulty, weather and crowd preference.</p><small>Less than one minute</small></article>
          <article><span className="step-number">02</span><div className="step-icon"><Route size={25} /></div><h3>Choose a better alternative</h3><p>Three motivated options, including travel time, honest trade-offs and comparison with the original plan.</p><small>Quality before quietness</small></article>
          <article><span className="step-number">03</span><div className="step-icon"><Gift size={25} /></div><h3>Visit, verify and earn</h3><p>Complete the experience, verify the visit and earn GemPoints usable with participating local partners.</p><small>One clear reward currency</small></article>
        </div>
      </section>

      <section className="marketing-section coverage-section" id="coverage">
        <div className="coverage-copy">
          <span className="eyebrow"><Mountain size={15} /> Pan-Alpine by design</span>
          <h2>One system, across the Alps. Local recommendations, shared Alpine standards.</h2>
          <p>GemGo is not a Valle d’Aosta guide extended through generic content. The product is structured for multiple Alpine regions, while validation, local knowledge and partnerships grow territory by territory.</p>
          <div className="coverage-principles">
            <span><Globe2 size={18} /><strong>Common framework</strong><small>Recommendation, verification and measurement standards</small></span>
            <span><MapPin size={18} /><strong>Local depth</strong><small>Territorial review, constraints and partner knowledge</small></span>
            <span><BadgeCheck size={18} /><strong>Visible confidence</strong><small>Data-based, locally reviewed or verified</small></span>
          </div>
        </div>
        <AlpineOverview compact />
      </section>

      <section className="marketing-section proof-section" id="proof">
        <div className="section-intro narrow">
          <span className="eyebrow"><Sparkles size={15} /> A concrete decision</span>
          <h2>Not another generic list of destinations</h2>
          <p>The recommendation becomes credible when the visitor can see what changes, what improves and what the trade-offs are.</p>
        </div>
        <div className="proof-comparison">
          <article className="proof-original">
            <span>Original plan</span>
            <h3>Popular destination</h3>
            <p><Users size={18} /> High expected crowd</p>
            <p><MapPin size={18} /> Difficult parking</p>
            <p><Clock3 size={18} /> Rigid arrival window</p>
          </article>
          <div className="proof-arrow"><ArrowRight size={28} /></div>
          <article className="proof-alternative">
            <span>GemGo alternative</span>
            <h3>Quiet river villages and an easy walk</h3>
            <p><Route size={18} /> 24 minutes away</p>
            <p><Users size={18} /> Lower predicted crowd</p>
            <p><HeartHandshake size={18} /> Local reward available</p>
            <Link href="/app" className="inline-link">View the full experience <ArrowRight size={16} /></Link>
          </article>
        </div>
      </section>

      <section className="marketing-section institutional-section">
        <div className="institutional-visual">
          <span className="demo-label">Demonstration data</span>
          <div className="institutional-metrics"><div><strong>38%</strong><span>diversion rate</span></div><div><strong>27%</strong><span>off-peak shift</span></div><div><strong>84%</strong><span>recommendation satisfaction</span></div></div>
        </div>
        <div className="institutional-copy">
          <span className="eyebrow"><Globe2 size={15} /> For Alpine destinations</span>
          <h2>A visitor product with an institutional outcome</h2>
          <p>Regions, municipalities, tourism offices and protected areas need more than awareness campaigns. GemGo can measure accepted alternatives, off-peak shifts, satisfaction and verified local interactions using aggregated, anonymous data.</p>
          <Link href="/app" className="button button-secondary">Open the territory dashboard <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="marketing-section team-section-marketing" id="team">
        <div className="section-intro narrow">
          <span className="eyebrow"><UserRound size={15} /> Meet the team</span>
          <h2>Built at the intersection of product, tourism and Alpine cooperation</h2>
          <p>GemGo began at the EUSALP AI Hackathon and is being developed as a practical system for visitors and territories.</p>
        </div>
        <div className="team-role-grid">
          <article><strong>Product & development</strong><span>Platform, recommendation logic and user experience</span></article>
          <article><strong>Strategy & partnerships</strong><span>Business model, institutions and local reward network</span></article>
          <article><strong>Tourism & territory</strong><span>Local validation, content quality and stakeholder needs</span></article>
        </div>
        <div className="achievement-banner"><BadgeCheck size={22} /><div><strong>EUSALP AI Hackathon winner</strong><span>Prototype developed for pan-Alpine tourism-flow redistribution.</span></div></div>
      </section>

      <section className="final-cta-section">
        <div><span className="eyebrow">Welcome to GemGo</span><h2>Turn a crowded plan into a better Alpine experience.</h2><p>Start with a real request and see how GemGo explains every recommendation.</p></div>
        <Link href="/app" className="button button-primary button-large">Try the app now <ArrowRight size={18} /></Link>
      </section>

      <footer className="marketing-footer">
        <div className="brand"><span className="brand-mark"><Mountain size={20} /></span><span><strong>GemGo</strong><small>Better Alpine choices</small></span></div>
        <p>Pan-Alpine recommendation, verification and visitor-flow redistribution.</p>
        <div><Link href="/app">Explore</Link><a href="#how">Methodology</a><Link href="/app">Privacy</Link><Link href="/app">For Alpine destinations</Link></div>
        <small>Demo content and institutional metrics are clearly identified where not based on live operations.</small>
      </footer>
    </main>
  );
}
