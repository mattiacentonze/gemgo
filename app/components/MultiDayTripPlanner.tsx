"use client";

import { CalendarDays, ChevronDown, ChevronUp, Download, Plus, Route, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { allExperiences } from "../product/integrated-data";
import type { SavedTrip } from "../product/storage";
import type { Locale } from "../domain";
import type { TransportMode } from "../product/types";
import ExperienceMap from "./ExperienceMap";

type MultiDayPlan = {
  title: string;
  startDate: string;
  days: number;
  assignments: Record<string, number>;
  notes: Record<number, string>;
  updatedAt: string;
};

const PLAN_KEY = "gemgo-multiday-itinerary-v1";

const plannerCopy = {
  en: { title: "Plan multiple days", intro: "Arrange saved Alpine experiences and choose how to move between them.", name: "Trip name", start: "Start date", days: "Days", export: "Export calendar", saved: "Saved experiences", savedBody: "Choose a day for each experience.", add: "Add to…", flexible: "Keep this day flexible.", note: "Day note", notePlaceholder: "Transport, booking or timing note", disclaimer: "Stored on this device. Check travel times, access and opening conditions before each day.", route: "Route between Alpine activities", routeBody: "Each segment uses the transport selected for the destination it reaches.", empty: "Save at least two experiences to compare a multi-stop Alpine route." },
  it: { title: "Pianifica più giorni", intro: "Organizza le esperienze alpine salvate e scegli come spostarti tra una tappa e l’altra.", name: "Nome del viaggio", start: "Data di inizio", days: "Giorni", export: "Esporta calendario", saved: "Esperienze salvate", savedBody: "Scegli un giorno per ogni esperienza.", add: "Aggiungi a…", flexible: "Lascia questa giornata flessibile.", note: "Nota del giorno", notePlaceholder: "Trasporto, prenotazione o orario", disclaimer: "Salvato su questo dispositivo. Verifica tempi, accessi e aperture prima di ogni giornata.", route: "Percorso tra attività alpine", routeBody: "Ogni segmento usa il mezzo scelto per la destinazione successiva.", empty: "Salva almeno due esperienze per confrontare un itinerario alpino a più tappe." },
  de: { title: "Mehrere Tage planen", intro: "Ordne gespeicherte Alpenerlebnisse und wähle die Wege zwischen den Stopps.", name: "Reisename", start: "Startdatum", days: "Tage", export: "Kalender exportieren", saved: "Gespeicherte Erlebnisse", savedBody: "Wähle für jedes Erlebnis einen Tag.", add: "Hinzufügen zu…", flexible: "Diesen Tag flexibel lassen.", note: "Tagesnotiz", notePlaceholder: "Verkehr, Buchung oder Zeit", disclaimer: "Auf diesem Gerät gespeichert. Zeiten, Zugang und Öffnung vor jedem Tag prüfen.", route: "Route zwischen Alpenaktivitäten", routeBody: "Jeder Abschnitt nutzt das Verkehrsmittel des folgenden Ziels.", empty: "Speichere mindestens zwei Erlebnisse für eine mehrteilige Alpenroute." },
  fr: { title: "Planifier plusieurs jours", intro: "Organisez les expériences alpines enregistrées et choisissez les déplacements entre étapes.", name: "Nom du voyage", start: "Date de début", days: "Jours", export: "Exporter le calendrier", saved: "Expériences enregistrées", savedBody: "Choisissez un jour pour chaque expérience.", add: "Ajouter à…", flexible: "Garder cette journée flexible.", note: "Note du jour", notePlaceholder: "Transport, réservation ou horaire", disclaimer: "Enregistré sur cet appareil. Vérifiez trajets, accès et ouvertures avant chaque journée.", route: "Itinéraire entre activités alpines", routeBody: "Chaque segment utilise le mode choisi pour la destination suivante.", empty: "Enregistrez au moins deux expériences pour comparer un itinéraire alpin." },
  sl: { title: "Načrtuj več dni", intro: "Razporedi shranjena alpska doživetja in izberi prevoz med postanki.", name: "Ime potovanja", start: "Začetni datum", days: "Dnevi", export: "Izvozi koledar", saved: "Shranjena doživetja", savedBody: "Za vsako doživetje izberi dan.", add: "Dodaj v…", flexible: "Ta dan naj ostane prilagodljiv.", note: "Opomba dneva", notePlaceholder: "Prevoz, rezervacija ali čas", disclaimer: "Shranjeno v tej napravi. Pred vsakim dnem preveri čase, dostop in odpiralne ure.", route: "Pot med alpskimi dejavnostmi", routeBody: "Vsak odsek uporablja prevoz, izbran za naslednji cilj.", empty: "Shrani vsaj dve doživetji za večpostajno alpsko pot." },
} as const;

const defaultPlan = (): MultiDayPlan => ({
  title: "My Alpine journey",
  startDate: new Date().toISOString().slice(0, 10),
  days: 3,
  assignments: {},
  notes: {},
  updatedAt: new Date().toISOString(),
});

const readPlan = () => {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return defaultPlan();
    const parsed = JSON.parse(raw) as MultiDayPlan;
    return {
      ...defaultPlan(),
      ...parsed,
      days: Math.min(7, Math.max(1, Number(parsed.days) || 3)),
    };
  } catch {
    return defaultPlan();
  }
};

const dateForDay = (startDate: string, day: number) => {
  const date = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return `Day ${day}`;
  date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const escapeIcs = (value: string) => value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");

export default function MultiDayTripPlanner({ trips, locale }: { trips: SavedTrip[]; locale: Locale }) {
  const [plan, setPlan] = useState<MultiDayPlan>(() => defaultPlan());
  const [open, setOpen] = useState(false);
  const text = plannerCopy[locale];

  useEffect(() => {
    const nextPlan = readPlan();
    setPlan(nextPlan);
    if (trips.some((trip) => trip.preferences.availableTime === "multi") || Object.keys(nextPlan.assignments).length > 0) setOpen(true);
    // The plan is read once. Subsequent changes flow through React props/state,
    // avoiding whole-document observers on every map or navigation update.
  }, []);

  const savePlan = (next: MultiDayPlan) => {
    const normalized = { ...next, updatedAt: new Date().toISOString() };
    setPlan(normalized);
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(normalized));
  };

  const assignedByDay = useMemo(() => {
    const groups = new Map<number, SavedTrip[]>();
    for (let day = 1; day <= plan.days; day += 1) groups.set(day, []);
    trips.forEach((trip) => {
      const day = plan.assignments[trip.id];
      if (day && day <= plan.days) groups.get(day)?.push(trip);
    });
    return groups;
  }, [plan.assignments, plan.days, trips]);

  const unassigned = trips.filter((trip) => !plan.assignments[trip.id] || plan.assignments[trip.id] > plan.days);
  const orderedTrips = useMemo(
    () => [...assignedByDay.entries()].flatMap(([, dayTrips]) => dayTrips),
    [assignedByDay],
  );
  const routeExperiences = useMemo(
    () => orderedTrips.flatMap((trip) => {
      const experience = allExperiences.find((item) => item.id === trip.trip.experienceId);
      return experience ? [experience] : [];
    }),
    [orderedTrips],
  );
  const routeModes = useMemo(
    () => orderedTrips.slice(1).map((trip) => trip.preferences.transport as TransportMode),
    [orderedTrips],
  );

  const assign = (tripId: string, day: number | null) => {
    const assignments = { ...plan.assignments };
    if (day === null) delete assignments[tripId];
    else assignments[tripId] = day;
    savePlan({ ...plan, assignments });
  };

  const exportCalendar = () => {
    const events = [...assignedByDay.entries()].flatMap(([day, dayTrips]) => {
      const date = new Date(`${plan.startDate}T09:00:00`);
      date.setDate(date.getDate() + day - 1);
      return dayTrips.map((trip, index) => {
        const start = new Date(date);
        start.setHours(9 + index * 3, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 2);
        const format = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
        return [
          "BEGIN:VEVENT",
          `UID:${trip.id}@gemgo.local`,
          `DTSTAMP:${format(new Date())}`,
          `DTSTART:${format(start)}`,
          `DTEND:${format(end)}`,
          `SUMMARY:${escapeIcs(trip.name)}`,
          "DESCRIPTION:GemGo device-local itinerary. Verify current access and opening conditions before departure.",
          "END:VEVENT",
        ].join("\r\n");
      });
    });
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GemGo//Multi-day itinerary//EN", ...events, "END:VCALENDAR"].join("\r\n");
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "gemgo-trip"}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={`multi-day-planner ${open ? "is-open" : ""}`} aria-label="Multi-day trip planner">
      <button type="button" className="multi-day-planner-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="multi-day-planner-icon"><CalendarDays size={22} /></span>
        <span>
          <strong>{text.title}</strong>
          <small>{text.intro}</small>
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && (
        <div className="multi-day-planner-body">
          <div className="multi-day-plan-settings">
            <label>
              <span>{text.name}</span>
              <input value={plan.title} maxLength={80} onChange={(event) => savePlan({ ...plan, title: event.target.value })} />
            </label>
            <label>
              <span>{text.start}</span>
              <input type="date" value={plan.startDate} onChange={(event) => savePlan({ ...plan, startDate: event.target.value })} />
            </label>
            <label>
              <span>{text.days}</span>
              <select value={plan.days} onChange={(event) => savePlan({ ...plan, days: Number(event.target.value) })}>
                {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <button type="button" className="button button-secondary" onClick={exportCalendar} disabled={Object.keys(plan.assignments).length === 0}>
              <Download size={17} /> {text.export}
            </button>
          </div>

          {unassigned.length > 0 && (
            <div className="multi-day-unassigned">
              <div className="multi-day-section-heading"><Plus size={18} /><div><strong>{text.saved}</strong><small>{text.savedBody}</small></div></div>
              <div className="multi-day-trip-pool">
                {unassigned.map((trip) => {
                  const experience = allExperiences.find((item) => item.id === trip.trip.experienceId);
                  return <article key={trip.id}><div><span>{experience?.region ?? "Alps"}</span><strong>{trip.name}</strong><small>{experience?.promise ?? "GemGo"}</small></div><select aria-label={`${text.add} ${trip.name}`} defaultValue="" onChange={(event) => assign(trip.id, Number(event.target.value))}><option value="" disabled>{text.add}</option>{Array.from({ length: plan.days }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></article>;
                })}
              </div>
            </div>
          )}

          <div className="multi-day-timeline">
            {Array.from({ length: plan.days }, (_, index) => index + 1).map((day) => {
              const dayTrips = assignedByDay.get(day) ?? [];
              return <article className="multi-day-column" key={day}><header><span>{day}</span><strong>{dateForDay(plan.startDate, day)}</strong></header><div className="multi-day-items">{dayTrips.length === 0 ? <p>{text.flexible}</p> : dayTrips.map((trip) => { const experience = allExperiences.find((item) => item.id === trip.trip.experienceId); return <div className="multi-day-item" key={trip.id}><div><strong>{trip.name}</strong><span>{experience?.region ?? "Alps"}</span></div><button type="button" aria-label={`${text.note}: ${trip.name}`} onClick={() => assign(trip.id, null)}><Trash2 size={15} /></button></div>; })}</div><label><span>{text.note}</span><textarea rows={2} maxLength={240} value={plan.notes[day] ?? ""} onChange={(event) => savePlan({ ...plan, notes: { ...plan.notes, [day]: event.target.value } })} placeholder={text.notePlaceholder} /></label></article>;
            })}
          </div>
          <section className="multi-day-route-card"><div className="multi-day-section-heading"><Route size={18} /><div><strong>{text.route}</strong><small>{text.routeBody}</small></div></div>{routeExperiences.length > 1 ? <ExperienceMap locale={locale} experiences={routeExperiences} routeStops={routeExperiences} routeModes={routeModes} showLegend={false} /> : <p>{text.empty}</p>}</section>
          <p className="multi-day-disclaimer">{text.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
