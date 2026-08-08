"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bike,
  Bus,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudRain,
  Coins,
  Compass,
  Footprints,
  Gift,
  Globe2,
  HeartHandshake,
  Info,
  Languages,
  LocateFixed,
  Map,
  MapPin,
  Menu,
  Mountain,
  Navigation,
  PawPrint,
  QrCode,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AlpineOverview from "./AlpineOverview";
import ExperienceCard from "./ExperienceCard";
import { defaultPreferences, experiences } from "../product/data";
import type {
  AppSection,
  Difficulty,
  Experience,
  ExperienceKind,
  ExploreStage,
  SearchPreferences,
  TransportMode,
  TripState,
} from "../product/types";

const navItems: Array<{ id: AppSection; label: string }> = [
  { id: "explore", label: "Explore" },
  { id: "trip", label: "My Trip" },
  { id: "rewards", label: "Rewards" },
  { id: "about", label: "About" },
];

const kindOptions: Array<{ id: ExperienceKind; label: string }> = [
  { id: "hiking", label: "Hiking" },
  { id: "nature", label: "Nature" },
  { id: "villages", label: "Villages" },
  { id: "culture", label: "Culture" },
  { id: "water", label: "Lakes & rivers" },
  { id: "food", label: "Food" },
  { id: "family", label: "Family" },
  { id: "accessible", label: "Accessible" },
  { id: "winter", label: "Winter" },
];

const needOptions = [
  "Children",
  "Dog",
  "Reduced mobility",
  "Stroller",
  "No exposed paths",
  "Indoor alternative",
  "Low-cost",
];

const transportOptions: Array<{ id: TransportMode; label: string; icon: typeof Car }> = [
  { id: "walking", label: "Walking", icon: Footprints },
  { id: "bicycle", label: "Bicycle", icon: Bike },
  { id: "public", label: "Public transport", icon: Bus },
  { id: "car", label: "Car", icon: Car },
  { id: "mixed", label: "Mixed mobility", icon: Route },
];

const durationLabels: Record<SearchPreferences["availableTime"], string> = {
  short: "1–2 hours",
  half: "Half day",
  full: "Full day",
  multi: "Multiple days",
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes} min`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const scoreExperience = (experience: Experience, preferences: SearchPreferences) => {
  let score = 0;
  score += experience.kind.filter((kind) => preferences.kinds.includes(kind)).length * 18;
  if (experience.difficulty === preferences.difficulty) score += 15;
  const travel = experience.travel[preferences.transport] ?? 999;
  if (travel <= preferences.maxTravelMinutes) score += 22;
  else score -= Math.min(24, travel - preferences.maxTravelMinutes);
  if (experience.crowd === "low") score += 18;
  if (experience.validation === "Verified Gem") score += 4;
  if (preferences.needs.includes("Indoor alternative") && experience.kind.includes("culture")) score += 12;
  if (preferences.needs.includes("Reduced mobility") && experience.kind.includes("accessible")) score += 14;
  if (preferences.needs.includes("Children") && experience.kind.includes("family")) score += 10;
  return score;
};

const rankedLabels = ["Best match", "Quietest choice", "Most local impact"];

export default function AppShell() {
  const [section, setSection] = useState<AppSection>("explore");
  const [stage, setStage] = useState<ExploreStage>("brief");
  const [preferences, setPreferences] = useState<SearchPreferences>(defaultPreferences);
  const [selectedId, setSelectedId] = useState(experiences[0].id);
  const [saved, setSaved] = useState<string[]>([]);
  const [trip, setTrip] = useState<TripState | null>(null);
  const [tripMode, setTripMode] = useState<"plan" | "verify" | "complete">("plan");
  const [points, setPoints] = useState(0);
  const [gemDropOpen, setGemDropOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedTrip = window.localStorage.getItem("gemgo-demo-trip");
      const storedPoints = window.localStorage.getItem("gemgo-demo-points");
      const storedSaved = window.localStorage.getItem("gemgo-demo-saved");
      queueMicrotask(() => {
        if (storedTrip) setTrip(JSON.parse(storedTrip) as TripState);
        if (storedPoints) setPoints(Number(storedPoints) || 0);
        if (storedSaved) setSaved(JSON.parse(storedSaved) as string[]);
      });
    } catch {
      // The demo remains fully usable without local persistence.
    }
  }, []);

  useEffect(() => {
    try {
      if (trip) window.localStorage.setItem("gemgo-demo-trip", JSON.stringify(trip));
      window.localStorage.setItem("gemgo-demo-points", String(points));
      window.localStorage.setItem("gemgo-demo-saved", JSON.stringify(saved));
    } catch {
      // Local persistence is optional.
    }
  }, [points, saved, trip]);

  const ranked = useMemo(
    () => [...experiences].sort((a, b) => scoreExperience(b, preferences) - scoreExperience(a, preferences)).slice(0, 3),
    [preferences],
  );

  const selected = experiences.find((experience) => experience.id === selectedId) ?? ranked[0] ?? experiences[0];
  const tripExperience = trip ? experiences.find((experience) => experience.id === trip.experienceId) ?? selected : null;
  const gemDropAlternative = experiences.find((experience) => experience.id === "hall-wattens-culture-walk") ?? ranked[1];

  const updatePreference = <K extends keyof SearchPreferences>(key: K, value: SearchPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const toggleKind = (kind: ExperienceKind) => {
    setPreferences((current) => ({
      ...current,
      kinds: current.kinds.includes(kind)
        ? current.kinds.filter((item) => item !== kind)
        : [...current.kinds, kind],
    }));
  };

  const toggleNeed = (need: string) => {
    setPreferences((current) => ({
      ...current,
      needs: current.needs.includes(need)
        ? current.needs.filter((item) => item !== need)
        : [...current.needs, need],
    }));
  };

  const chooseSection = (next: AppSection) => {
    setSection(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveExperience = (id: string) => {
    setSaved((current) => (current.includes(id) ? current : [...current, id]));
  };

  const addToTrip = (experience: Experience) => {
    const nextTrip: TripState = {
      experienceId: experience.id,
      plannedDeparture: preferences.availableFrom || "14:30",
      acceptedGemDrop: false,
      verified: false,
    };
    setTrip(nextTrip);
    setTripMode("plan");
    setSection("trip");
    setStage("experience");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const verifyTrip = () => {
    if (!trip || !tripExperience) return;
    setTrip({ ...trip, verified: true });
    setPoints((current) => Math.max(current, tripExperience.points + (trip.acceptedGemDrop ? 20 : 0)));
    setTripMode("complete");
  };

  return (
    <main className="product-app">
      <header className="app-header">
        <Link className="brand brand-compact" href="/" aria-label="GemGo homepage">
          <span className="brand-mark"><Mountain size={21} /></span>
          <span><strong>GemGo</strong><small>Better Alpine choices</small></span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? "is-active" : ""}
              onClick={() => chooseSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="language-menu">
            <button type="button" className="icon-text-button" onClick={() => setLanguageOpen((current) => !current)} aria-expanded={languageOpen}>
              <Languages size={18} /> EN
            </button>
            {languageOpen && (
              <div className="language-popover">
                <strong>Interface language</strong>
                {["English", "Italiano", "Deutsch", "Français", "Slovenščina"].map((language, index) => (
                  <button type="button" key={language} onClick={() => setLanguageOpen(false)}>
                    {index === 0 ? <Check size={15} /> : <span />} {language}
                  </button>
                ))}
                <small>English is complete in this redesign branch. Other catalogues remain available for the next translation pass.</small>
              </div>
            )}
          </div>
          <button type="button" className="icon-button" aria-label="Optional profile"><UserRound size={19} /></button>
          <button type="button" className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenuOpen((current) => !current)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="mobile-menu" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <button type="button" key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => chooseSection(item.id)}>
                {item.label}<ChevronRight size={17} />
              </button>
            ))}
          </nav>
        )}
      </header>

      {section === "explore" && (
        <section className="app-content explore-page">
          {stage === "brief" && (
            <>
              <div className="page-heading split-heading">
                <div>
                  <span className="eyebrow"><Compass size={15} /> Personalised alternatives</span>
                  <h1>What would you like to experience?</h1>
                  <p>Describe the plan naturally, then adjust the essential constraints. GemGo ranks compatible alternatives rather than returning a generic list.</p>
                </div>
                <div className="privacy-note"><ShieldCheck size={19} /><span><strong>No account required</strong> Your planning preferences remain on this device in the demo.</span></div>
              </div>

              <div className="explore-layout">
                <form className="planner-panel" onSubmit={(event) => { event.preventDefault(); setStage("results"); }}>
                  <label className="prompt-field">
                    <span>Tell GemGo what you are looking for</span>
                    <textarea value={preferences.prompt} onChange={(event) => updatePreference("prompt", event.target.value)} rows={3} />
                    <small>Natural language helps, but the controls below remain the source of truth.</small>
                  </label>

                  <div className="form-section">
                    <div className="form-section-title"><LocateFixed size={18} /><div><strong>Starting point</strong><small>Use a real place or selected region</small></div></div>
                    <div className="field-grid field-grid-location">
                      <label><span>Starting from</span><input value={preferences.origin} onChange={(event) => updatePreference("origin", event.target.value)} /></label>
                      <label><span>Maximum travel time</span><div className="range-value">{preferences.maxTravelMinutes} min</div><input type="range" min="15" max="120" step="5" value={preferences.maxTravelMinutes} onChange={(event) => updatePreference("maxTravelMinutes", Number(event.target.value))} /></label>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title"><Navigation size={18} /><div><strong>Mobility</strong><small>This materially changes the ranking</small></div></div>
                    <div className="choice-grid transport-grid">
                      {transportOptions.map((option) => {
                        const Icon = option.icon;
                        return <button type="button" key={option.id} className={preferences.transport === option.id ? "is-selected" : ""} onClick={() => updatePreference("transport", option.id)}><Icon size={18} />{option.label}</button>;
                      })}
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title"><Clock3 size={18} /><div><strong>Available time</strong><small>Include an arrival window when useful</small></div></div>
                    <div className="choice-grid duration-grid">
                      {(Object.keys(durationLabels) as Array<SearchPreferences["availableTime"]>).map((option) => (
                        <button type="button" key={option} className={preferences.availableTime === option ? "is-selected" : ""} onClick={() => updatePreference("availableTime", option)}>{durationLabels[option]}</button>
                      ))}
                    </div>
                    <div className="field-grid time-grid">
                      <label><span>Available from</span><input type="time" value={preferences.availableFrom} onChange={(event) => updatePreference("availableFrom", event.target.value)} /></label>
                      <label><span>Available to</span><input type="time" value={preferences.availableTo} onChange={(event) => updatePreference("availableTo", event.target.value)} /></label>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title"><Sparkles size={18} /><div><strong>Experience type</strong><small>Choose only what matters</small></div></div>
                    <div className="chip-grid">
                      {kindOptions.map((option) => <button type="button" key={option.id} className={preferences.kinds.includes(option.id) ? "is-selected" : ""} onClick={() => toggleKind(option.id)}>{option.label}</button>)}
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title"><Target size={18} /><div><strong>Difficulty and needs</strong><small>Filter out unsuitable experiences</small></div></div>
                    <div className="choice-grid difficulty-grid">
                      {(Object.keys(difficultyLabels) as Difficulty[]).map((option) => <button type="button" key={option} className={preferences.difficulty === option ? "is-selected" : ""} onClick={() => updatePreference("difficulty", option)}>{difficultyLabels[option]}</button>)}
                    </div>
                    <div className="chip-grid needs-grid">
                      {needOptions.map((need) => <button type="button" key={need} className={preferences.needs.includes(need) ? "is-selected" : ""} onClick={() => toggleNeed(need)}>{need === "Dog" && <PawPrint size={15} />}{need}</button>)}
                    </div>
                  </div>

                  <div className="condition-card">
                    <CloudRain size={21} />
                    <div><strong>Light rain expected after 16:00</strong><span>GemGo will favour lower-altitude, sheltered or flexible experiences.</span></div>
                    <button type="button">Adjust</button>
                  </div>

                  <button type="submit" className="button button-primary button-large">Show my best alternatives <ArrowRight size={18} /></button>
                </form>

                <aside className="explore-aside">
                  <AlpineOverview compact selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
                  <div className="method-card">
                    <span className="eyebrow"><CircleHelp size={14} /> How ranking works</span>
                    <h3>Quality before quietness</h3>
                    <p>A destination must first meet minimum compatibility, access and safety requirements. Lower crowd pressure then improves its rank.</p>
                    <div className="method-factors"><span>Fit</span><span>Travel</span><span>Crowd</span><span>Weather</span><span>Local value</span></div>
                  </div>
                </aside>
              </div>
            </>
          )}

          {stage === "results" && (
            <>
              <div className="results-header">
                <button type="button" className="back-button" onClick={() => setStage("brief")}><ArrowLeft size={17} /> Adjust preferences</button>
                <div>
                  <span className="eyebrow"><Sparkles size={15} /> Ranked for your plan</span>
                  <h1>Your three best alternatives</h1>
                  <p>Starting from <strong>{preferences.origin}</strong>, within <strong>{preferences.maxTravelMinutes} minutes</strong>, using <strong>{transportOptions.find((item) => item.id === preferences.transport)?.label.toLowerCase()}</strong>.</p>
                </div>
                <div className="results-summary"><strong>3</strong><span>motivated recommendations</span><small>Demonstration ranking</small></div>
              </div>

              <div className="result-layout">
                <div className="results-map-panel">
                  <AlpineOverview compact selectedRegion={ranked[0]?.region} onSelectRegion={setSelectedRegion} />
                  <div className="comparison-proof">
                    <div><span>Original plan</span><strong>Popular destination</strong><small>High expected crowd · difficult parking</small></div>
                    <ArrowRight size={22} />
                    <div><span>GemGo alternative</span><strong>{ranked[0]?.name}</strong><small>Comparable experience · lower predicted crowd</small></div>
                  </div>
                </div>
                <div className="result-cards">
                  {ranked.map((experience, index) => (
                    <ExperienceCard
                      key={experience.id}
                      experience={experience}
                      label={rankedLabels[index]}
                      transport={preferences.transport}
                      saved={saved.includes(experience.id)}
                      onOpen={() => { setSelectedId(experience.id); setStage("experience"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      onSave={() => saveExperience(experience.id)}
                    />
                  ))}
                  <button type="button" className="show-more-button">Show more compatible results <ChevronRight size={17} /></button>
                </div>
              </div>
            </>
          )}

          {stage === "experience" && selected && (
            <ExperienceDetail
              experience={selected}
              transport={preferences.transport}
              onBack={() => setStage("results")}
              onAdd={() => addToTrip(selected)}
            />
          )}
        </section>
      )}

      {section === "trip" && (
        <section className="app-content trip-page">
          {!trip || !tripExperience ? (
            <div className="empty-state">
              <div className="empty-icon"><CalendarDays size={34} /></div>
              <span className="eyebrow">My Trip</span>
              <h1>No active Alpine plan yet</h1>
              <p>Choose a motivated alternative in Explore. Saved ideas remain secondary until you turn one into an executable trip.</p>
              <button type="button" className="button button-primary" onClick={() => chooseSection("explore")}>Find an experience <ArrowRight size={17} /></button>
            </div>
          ) : tripMode === "complete" ? (
            <CompletionView experience={tripExperience} points={points} onRewards={() => chooseSection("rewards")} />
          ) : tripMode === "verify" ? (
            <VerificationView experience={tripExperience} onBack={() => setTripMode("plan")} onVerify={verifyTrip} />
          ) : (
            <>
              <div className="page-heading trip-heading">
                <div>
                  <span className="eyebrow"><CalendarDays size={15} /> My Trip</span>
                  <h1>Your afternoon in {tripExperience.region}</h1>
                  <p>Planned departure: <strong>{trip.plannedDeparture}</strong> · Essential information is ready for the journey.</p>
                </div>
                <span className="status-pill"><CheckCircle2 size={16} /> Plan ready</span>
              </div>

              <div className="trip-layout">
                <div className="trip-main-card">
                  <div className={`trip-cover image-tone-${tripExperience.imageTone}`}>
                    <div><span>{tripExperience.validation}</span><h2>{tripExperience.promise}</h2><p>{tripExperience.name}</p></div>
                  </div>
                  <div className="trip-timeline">
                    {tripExperience.itinerary.map((item, index) => (
                      <div className="timeline-item" key={`${item.time}-${item.label}`}>
                        <div className="timeline-marker">{index === 0 ? <Navigation size={16} /> : index === tripExperience.itinerary.length - 1 ? <Check size={16} /> : index + 1}</div>
                        <time>{item.time}</time>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="trip-action-row">
                    <button type="button" className="button button-primary" onClick={() => setTripMode("verify")}>Start this experience <Navigation size={17} /></button>
                    <button type="button" className="button button-secondary"><Map size={17} /> Open navigation</button>
                  </div>
                </div>

                <aside className="trip-side">
                  <div className="operational-card">
                    <h3>Operational information</h3>
                    {tripExperience.mobility.map((item) => <p key={item}><CheckCircle2 size={16} /> {item}</p>)}
                    <p><CloudRain size={16} /> Light rain possible after 17:00</p>
                    <p><Users size={16} /> Low crowd expected {tripExperience.crowdWindow}</p>
                  </div>

                  <div className="offline-card">
                    <div className="offline-card-icon"><Map size={22} /></div>
                    <div><h3>Keep the essentials offline</h3><p>Save the route summary, address, contacts and verification instructions on this device.</p></div>
                    <button type="button" className="button button-secondary">Save essential information offline</button>
                  </div>

                  <button type="button" className="condition-change-card" onClick={() => setGemDropOpen(true)}>
                    <TimerReset size={22} />
                    <span><strong>Simulate changed conditions</strong><small>Preview the contextual GemDrop flow used in the jury demonstration.</small></span>
                    <ChevronRight size={18} />
                  </button>
                </aside>
              </div>

              {gemDropOpen && (
                <GemDropPanel
                  original={tripExperience}
                  alternative={gemDropAlternative}
                  onClose={() => setGemDropOpen(false)}
                  onSwitch={() => {
                    setTrip({ ...trip, experienceId: gemDropAlternative.id, acceptedGemDrop: true });
                    setGemDropOpen(false);
                  }}
                />
              )}
            </>
          )}
        </section>
      )}

      {section === "rewards" && (
        <RewardsView points={points} trip={trip} />
      )}

      {section === "about" && (
        <AboutView />
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        {navItems.map((item) => (
          <button type="button" key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => chooseSection(item.id)}>
            {item.id === "explore" && <Compass size={19} />}
            {item.id === "trip" && <CalendarDays size={19} />}
            {item.id === "rewards" && <Gift size={19} />}
            {item.id === "about" && <Info size={19} />}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function ExperienceDetail({ experience, transport, onBack, onAdd }: { experience: Experience; transport: TransportMode; onBack: () => void; onAdd: () => void }) {
  const travel = experience.travel[transport] ?? experience.travel.car;
  return (
    <div className="experience-detail">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back to alternatives</button>
      <div className={`detail-hero image-tone-${experience.imageTone}`}>
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content">
          <div className="detail-badges"><span>{experience.validation}</span><span className={`crowd-chip crowd-${experience.crowd}`}>{experience.crowd} crowd</span></div>
          <p>{experience.region} · {experience.country}</p>
          <h1>{experience.promise}</h1>
          <strong>{experience.name}</strong>
        </div>
      </div>

      <div className="detail-metric-strip">
        <span><Navigation size={18} /><strong>{travel ? `${travel} min` : "Unavailable"}</strong><small>travel time</small></span>
        <span><Clock3 size={18} /><strong>{formatDuration(experience.durationMinutes)}</strong><small>activity duration</small></span>
        <span><Mountain size={18} /><strong>{difficultyLabels[experience.difficulty]}</strong><small>difficulty</small></span>
        <span><Users size={18} /><strong>{experience.crowdWindow}</strong><small>best low-crowd window</small></span>
        <span><Coins size={18} /><strong>+{experience.points}</strong><small>verified GemPoints</small></span>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="content-card fit-card">
            <span className="eyebrow"><Sparkles size={14} /> Why this fits you</span>
            <h2>A recommendation derived from your plan</h2>
            <p>You asked for an easy half-day nature experience. This route fits the available time, remains suitable in light rain and is expected to be quieter during your visit.</p>
            <div className="reason-pill-row">{experience.reasons.map((reason) => <span key={reason}><CheckCircle2 size={15} /> {reason}</span>)}</div>
          </section>

          <section className="content-card">
            <div className="section-title-row"><div><span className="eyebrow">What you will do</span><h2>A concrete, flexible itinerary</h2></div><Route size={24} /></div>
            <div className="mini-itinerary">{experience.itinerary.map((item) => <div key={`${item.time}-${item.label}`}><time>{item.time}</time><span>{item.label}</span></div>)}</div>
          </section>

          <section className="content-card">
            <div className="section-title-row"><div><span className="eyebrow">Crowd outlook</span><h2>Best arrival time: {experience.crowdWindow.split("–")[0]}</h2></div><Users size={24} /></div>
            <div className="crowd-chart">{experience.crowdByHour.map((point) => <div key={point.time}><span className={`crowd-bar crowd-${point.level}`} style={{ height: point.level === "high" ? "82%" : point.level === "moderate" ? "56%" : "30%" }} /><time>{point.time}</time><small>{point.level}</small></div>)}</div>
            <p className="method-note"><Info size={16} /> Demonstration prediction combining historical patterns, weekday, season, weather and known local conditions. {experience.confidence} confidence · updated {experience.updated}.</p>
          </section>

          <section className="content-card comparison-card">
            <span className="eyebrow">Why this alternative</span>
            <div className="comparison-columns">
              <div><small>Original plan</small><strong>{experience.comparison.original}</strong><span>{experience.comparison.reachDifference}</span></div>
              <ArrowRight size={23} />
              <div><small>GemGo alternative</small><strong>{experience.name}</strong>{experience.comparison.advantages.map((item) => <span key={item}><Check size={14} /> {item}</span>)}</div>
            </div>
            <div className="tradeoff-box"><AlertTriangle size={18} /><div><strong>Honest trade-offs</strong>{experience.tradeoffs.map((item) => <span key={item}>{item}</span>)}</div></div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="content-card sticky-card">
            <h3>Mobility and access</h3>
            {experience.mobility.map((item) => <p key={item}><CheckCircle2 size={16} /> {item}</p>)}
            <button type="button" className="button button-secondary button-full"><Map size={17} /> Preview route</button>
          </section>
          <section className="content-card local-benefit-card">
            <HeartHandshake size={24} />
            <h3>Local benefit</h3>
            <p>{experience.localBenefit}</p>
            {experience.partner && <span>{experience.partner}</span>}
          </section>
          <section className="content-card safety-card">
            <h3>Safety and limits</h3>
            {experience.safety.map((item) => <p key={item}><ShieldCheck size={16} /> {item}</p>)}
            <small>Always follow official local instructions and emergency guidance.</small>
          </section>
          <div className="detail-cta-card">
            <div><strong>Ready to turn this into a plan?</strong><span>GemPoints are secondary to a compatible, enjoyable experience.</span></div>
            <button type="button" className="button button-primary button-full" onClick={onAdd}>Add to My Trip <ArrowRight size={17} /></button>
            <button type="button" className="button button-ghost button-full" onClick={onBack}>Show another alternative</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GemDropPanel({ original, alternative, onClose, onSwitch }: { original: Experience; alternative: Experience; onClose: () => void; onSwitch: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="GemDrop alternative">
      <div className="gemdrop-panel">
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <span className="eyebrow"><Sparkles size={15} /> Contextual GemDrop</span>
        <h2>This area is becoming crowded</h2>
        <p className="gemdrop-lead">A comparable, weather-safe alternative is available nearby. You remain in control of the decision.</p>
        <div className="gemdrop-comparison">
          <div className="gemdrop-option original-option">
            <small>Original plan</small><h3>{original.name}</h3>
            <p><Users size={16} /> Crowd rising to high</p><p><Car size={16} /> Limited parking expected</p><p><Clock3 size={16} /> {formatDuration(original.durationMinutes)} activity</p><p><Coins size={16} /> Standard reward</p>
          </div>
          <ArrowRight size={24} />
          <div className="gemdrop-option alternative-option">
            <small>GemDrop alternative</small><h3>{alternative.name}</h3>
            <p><Users size={16} /> Manageable crowd</p><p><Navigation size={16} /> Similar activity profile</p><p><CloudRain size={16} /> Better rain resilience</p><p><Coins size={16} /> +20 bonus GemPoints</p>
          </div>
        </div>
        <div className="gemdrop-actions">
          <button type="button" className="button button-primary" onClick={onSwitch}>Switch my trip <ArrowRight size={17} /></button>
          <button type="button" className="button button-secondary" onClick={onClose}>Keep original plan</button>
          <button type="button" className="button button-ghost">See full comparison</button>
        </div>
      </div>
    </div>
  );
}

function VerificationView({ experience, onBack, onVerify }: { experience: Experience; onBack: () => void; onVerify: () => void }) {
  return (
    <div className="verification-page">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back to trip</button>
      <div className="verification-card">
        <div className="verification-icon"><BadgeCheck size={35} /></div>
        <span className="eyebrow">Visit verification</span>
        <h1>Verify your visit</h1>
        <p>Verification allows GemGo to award points and measure whether recommendations are helping redistribute visitor flows. The demo does not retain a detailed movement history.</p>
        <div className="verification-methods">
          <button type="button" className="verification-method is-selected"><LocateFixed size={25} /><span><strong>Current location</strong><small>Best for natural places. Presence is checked against the experience area.</small></span><CheckCircle2 size={19} /></button>
          <button type="button" className="verification-method"><QrCode size={25} /><span><strong>Partner QR</strong><small>Best for museums, refuges, activities and participating local businesses.</small></span><ChevronRight size={19} /></button>
        </div>
        <div className="privacy-note wide"><ShieldCheck size={19} /><span><strong>Privacy by design</strong> Verification can be stored temporarily offline and synchronised later. Detailed location history is not required.</span></div>
        <button type="button" className="button button-primary button-large button-full" onClick={onVerify}>Verify this visit and earn {experience.points} GemPoints <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

function CompletionView({ experience, points, onRewards }: { experience: Experience; points: number; onRewards: () => void }) {
  return (
    <div className="completion-view">
      <div className="completion-burst"><Check size={36} /></div>
      <span className="eyebrow">Visit verified</span>
      <h1>You made a different choice</h1>
      <p>{experience.name} was completed during a recommended lower-pressure period.</p>
      <div className="impact-grid">
        <div><Users size={23} /><strong>Lower-crowd period</strong><span>Visit timing followed the recommendation</span></div>
        <div><MapPin size={23} /><strong>Outside the main corridor</strong><span>One verified local experience completed</span></div>
        <div><HeartHandshake size={23} /><strong>Local value</strong><span>Opportunity to support a nearby participating business</span></div>
        <div><Coins size={23} /><strong>+{points} GemPoints</strong><span>Protected on this device for the demo</span></div>
      </div>
      <div className="progress-card">
        <div><span>Progress to first reward</span><strong>{Math.min(points, 100)} / 100 GemPoints</strong></div>
        <div className="progress-track"><span style={{ width: `${Math.min(points, 100)}%` }} /></div>
        <p>{points >= 100 ? "Your first reward is available." : "One more verified experience can unlock your first reward."}</p>
      </div>
      <div className="feedback-card"><strong>Was this alternative worth the change?</strong><div><button type="button">Definitely</button><button type="button">Mostly</button><button type="button">Not really</button></div></div>
      <button type="button" className="button button-primary" onClick={onRewards}>View Rewards and Impact <ArrowRight size={17} /></button>
    </div>
  );
}

function RewardsView({ points, trip }: { points: number; trip: TripState | null }) {
  const progress = Math.min(points, 100);
  return (
    <section className="app-content rewards-page">
      <div className="page-heading rewards-heading">
        <div><span className="eyebrow"><Gift size={15} /> One clear currency</span><h1>Your GemPoints</h1><p>Earn points across the Alps. Redeem them with participating local partners when the reward is relevant to your trip.</p></div>
        <div className="points-balance"><Coins size={27} /><strong>{points}</strong><span>GemPoints</span></div>
      </div>

      <div className="reward-progress-card">
        <div><strong>{progress} / 100</strong><span>Progress to your first local reward</span></div>
        <div className="progress-track large"><span style={{ width: `${progress}%` }} /></div>
        <p>{progress >= 100 ? "A local reward can now be unlocked." : `${100 - progress} more verified points to unlock the first reward.`}</p>
      </div>

      <div className="rewards-layout">
        <div>
          <div className="section-title-row"><div><span className="eyebrow">Available nearby</span><h2>Small, usable rewards</h2></div><MapPin size={22} /></div>
          <div className="reward-list">
            <article className="reward-card"><div className="reward-icon"><WalletCards size={24} /></div><div><span>Local tasting</span><h3>10% off a regional tasting</h3><p>100 GemPoints · 800 metres away · Demonstration partner</p></div><button type="button" disabled={points < 100}>Unlock reward</button></article>
            <article className="reward-card"><div className="reward-icon"><Gift size={24} /></div><div><span>Café</span><h3>Free hot drink with a meal</h3><p>120 GemPoints · Near your active trip · Demonstration partner</p></div><button type="button" disabled={points < 120}>Unlock reward</button></article>
          </div>
        </div>

        <aside className="earning-card">
          <span className="eyebrow">How points are earned</span>
          <h2>Only verifiable actions</h2>
          {["Complete a verified GemGo experience", "Visit during an eligible lower-pressure time", "Choose an eligible GemDrop", "Use verified lower-impact mobility", "Visit a participating local partner"].map((item) => <p key={item}><CheckCircle2 size={17} /> {item}</p>)}
          <small>No XP, Credits or separate balances. GemPoints are the single reward currency.</small>
        </aside>
      </div>

      <div className="personal-impact-section">
        <div className="section-title-row"><div><span className="eyebrow">Personal impact</span><h2>Your GemGo impact</h2></div><Target size={23} /></div>
        <div className="impact-grid">
          <div><strong>{trip?.verified ? 1 : 0}</strong><span>quieter experiences completed</span></div>
          <div><strong>{trip?.verified ? 1 : 0}</strong><span>visits during lower-pressure periods</span></div>
          <div><strong>0</strong><span>local partner visits verified</span></div>
          <div><strong>{points}</strong><span>GemPoints earned</span></div>
        </div>
        <p className="method-note"><Info size={16} /> GemGo reports only measurable actions. It does not invent CO₂ savings or claim an exact number of visitors removed from a hotspot.</p>
      </div>
    </section>
  );
}

function AboutView() {
  const [aboutTab, setAboutTab] = useState<"mission" | "method" | "territories" | "privacy">("mission");
  return (
    <section className="app-content about-page">
      <div className="page-heading">
        <span className="eyebrow"><Mountain size={15} /> About GemGo</span>
        <h1>Redistributing Alpine tourism through better individual choices</h1>
        <p>GemGo turns crowd information into personalised alternatives, verified visits, local rewards and aggregated insight for Alpine territories.</p>
      </div>

      <div className="about-tabs">
        <button type="button" className={aboutTab === "mission" ? "is-active" : ""} onClick={() => setAboutTab("mission")}>Mission</button>
        <button type="button" className={aboutTab === "method" ? "is-active" : ""} onClick={() => setAboutTab("method")}>Methodology</button>
        <button type="button" className={aboutTab === "territories" ? "is-active" : ""} onClick={() => setAboutTab("territories")}>For Alpine destinations</button>
        <button type="button" className={aboutTab === "privacy" ? "is-active" : ""} onClick={() => setAboutTab("privacy")}>Privacy</button>
      </div>

      {aboutTab === "mission" && (
        <div className="about-content">
          <div className="mission-card">
            <span className="eyebrow">Mission</span>
            <h2>Explore more of the Alps, without following the crowd.</h2>
            <p>Tourism pressure is concentrated in space and time. Visitors receive worse experiences, residents absorb the pressure and nearby areas receive fewer benefits. GemGo helps turn an intended hotspot visit into a comparable, enjoyable and locally useful alternative.</p>
          </div>
          <div className="cycle-row">{["Predict", "Recommend", "Redirect", "Verify", "Reward", "Measure"].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong>{index < 5 && <ArrowRight size={18} />}</div>)}</div>
          <AlpineOverview />
          <div className="team-section"><div><span className="eyebrow">Team</span><h2>Concrete roles, shared Alpine ambition</h2></div><div className="team-grid"><div><strong>Product & development</strong><span>Recommendation experience, platform and data systems</span></div><div><strong>Strategy & partnerships</strong><span>Business model, institutions and local reward network</span></div><div><strong>Tourism knowledge</strong><span>Territorial quality, validation and stakeholder needs</span></div></div><p className="achievement"><BadgeCheck size={18} /> Winner of the EUSALP AI Hackathon · pan-Alpine prototype in active development</p></div>
        </div>
      )}

      {aboutTab === "method" && (
        <div className="methodology-page">
          <div className="methodology-intro"><span className="eyebrow">Recommendation methodology</span><h2>Quietness is not enough</h2><p>Every recommendation must pass minimum quality, safety, accessibility and compatibility checks before lower crowd pressure improves its rank.</p></div>
          <div className="methodology-grid">
            <article><Users size={23} /><h3>Crowd prediction</h3><p>Historical patterns, day and time, season, weather, events, accessibility and available local signals.</p></article>
            <article><Target size={23} /><h3>Personalisation</h3><p>Interests, duration, difficulty, starting point, transport and specific visitor needs.</p></article>
            <article><ShieldCheck size={23} /><h3>Recommendation gates</h3><p>Quality, safety, access, compatibility, territorial capacity and data confidence.</p></article>
            <article><CircleHelp size={23} /><h3>Confidence</h3><p>Low, medium and high confidence are shown instead of presenting every prediction as equally certain.</p></article>
          </div>
          <div className="validation-levels"><article><span>1</span><div><strong>Data-based suggestion</strong><p>Generated from structured data and deterministic rules.</p></div></article><article><span>2</span><div><strong>Locally reviewed</strong><p>Checked by a territorial contributor or partner.</p></div></article><article><span>3</span><div><strong>Verified Gem</strong><p>Tested, operationally verified and connected to a visit or reward flow.</p></div></article></div>
          <div className="fragile-places-card"><ShieldCheck size={27} /><div><h3>Not every hidden place should be promoted</h3><p>GemGo can exclude fragile places, limit visibility, hide precise coordinates, apply seasonal restrictions, stop promotion and work with local authorities or communities.</p></div></div>
        </div>
      )}

      {aboutTab === "territories" && <TerritoryDashboard />}

      {aboutTab === "privacy" && (
        <div className="privacy-page">
          <div className="privacy-hero"><ShieldCheck size={34} /><div><span className="eyebrow">Privacy by design</span><h2>Useful personalisation without mandatory surveillance</h2><p>Visitors can explore and receive recommendations without registering. An account becomes relevant only for protected, synchronised rewards and preferences.</p></div></div>
          <div className="privacy-grid">
            <article><UserRound size={22} /><h3>Use without account</h3><p>Explore and plan as a guest. Registration is optional until persistent balances or synchronisation are requested.</p></article>
            <article><LocateFixed size={22} /><h3>Location only when needed</h3><p>Used for nearby search, navigation or verification. Detailed movement history is not required.</p></article>
            <article><WalletCards size={22} /><h3>User-controlled history</h3><p>Keep data on the device, choose to synchronise it or delete it.</p></article>
            <article><Globe2 size={22} /><h3>Territorial insight</h3><p>Only aggregated, anonymised metrics are shown after a sufficient sample exists.</p></article>
          </div>
        </div>
      )}
    </section>
  );
}

function TerritoryDashboard() {
  return (
    <div className="territory-dashboard">
      <div className="dashboard-banner"><div><span className="demo-label">Demonstration data</span><h2>Visitor-flow intelligence for Alpine destinations</h2><p>This institutional view illustrates what GemGo can measure after real adoption. The values below are not presented as field results.</p></div><Globe2 size={38} /></div>
      <AlpineOverview compact />
      <div className="dashboard-metrics">
        <article><span>Diversion rate</span><strong>38%</strong><small>Demo users accepting a lower-pressure alternative</small></article>
        <article><span>Off-peak shift</span><strong>27%</strong><small>Demo visits moved to a less congested time</small></article>
        <article><span>Recommendation satisfaction</span><strong>84%</strong><small>Demo alternatives rated worthwhile</small></article>
        <article><span>Local partner visits</span><strong>146</strong><small>Demonstration verified interactions</small></article>
      </div>
      <div className="dashboard-lower">
        <div className="flow-chart-card"><div className="section-title-row"><div><span className="eyebrow">Geographic distribution</span><h3>Recommendations accepted by corridor</h3></div><Route size={21} /></div><div className="horizontal-bars">{[["Main hotspot corridor", 74], ["Adjacent valley", 48], ["Secondary villages", 35], ["Off-peak urban culture", 22]].map(([label, value]) => <div key={String(label)}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}</strong></div>)}</div></div>
        <div className="dashboard-privacy-card"><ShieldCheck size={24} /><h3>Institutional privacy rules</h3><p>Aggregated and anonymised reporting only.</p><p>No individual movement replay.</p><p>Minimum sample thresholds before display.</p><p>Clear separation between demo, estimated and observed data.</p></div>
      </div>
    </div>
  );
}
