"use client";

import { CalendarDays, ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { allExperiences } from "../product/integrated-data";
import type { SavedTrip } from "../product/storage";

type MultiDayPlan = {
  title: string;
  startDate: string;
  days: number;
  assignments: Record<string, number>;
  notes: Record<number, string>;
  updatedAt: string;
};

const TRIPS_KEY = "gemgo-trips-v3";
const PLAN_KEY = "gemgo-multiday-itinerary-v1";

const defaultPlan = (): MultiDayPlan => ({
  title: "My Alpine journey",
  startDate: new Date().toISOString().slice(0, 10),
  days: 3,
  assignments: {},
  notes: {},
  updatedAt: new Date().toISOString(),
});

const readTrips = () => {
  try {
    const raw = window.localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as SavedTrip[]) : [];
  } catch {
    return [];
  }
};

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

export default function MultiDayTripPlanner() {
  const [target, setTarget] = useState<Element | null>(null);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [plan, setPlan] = useState<MultiDayPlan>(() => defaultPlan());
  const [open, setOpen] = useState(false);
  const snapshotRef = useRef("");

  useEffect(() => {
    const resolve = () => {
      const nextTarget = document.querySelector(".integrated-app .trip-page");
      const nextTrips = readTrips();
      const nextPlan = readPlan();
      const snapshot = `${Boolean(nextTarget)}|${JSON.stringify(nextTrips)}|${JSON.stringify(nextPlan)}`;
      if (snapshot === snapshotRef.current) return;
      snapshotRef.current = snapshot;
      setTarget(nextTarget);
      setTrips(nextTrips);
      setPlan(nextPlan);
      if (nextTrips.some((trip) => trip.preferences.availableTime === "multi") || Object.keys(nextPlan.assignments).length > 0) setOpen(true);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", resolve);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", resolve);
    };
  }, []);

  const savePlan = (next: MultiDayPlan) => {
    const normalized = { ...next, updatedAt: new Date().toISOString() };
    setPlan(normalized);
    snapshotRef.current = "";
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

  if (!target || trips.length === 0) return null;

  return createPortal(
    <section className={`multi-day-planner ${open ? "is-open" : ""}`} aria-label="Multi-day trip planner">
      <button type="button" className="multi-day-planner-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="multi-day-planner-icon"><CalendarDays size={22} /></span>
        <span>
          <strong>Plan multiple days</strong>
          <small>Arrange saved experiences across a 1–7 day itinerary.</small>
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && (
        <div className="multi-day-planner-body">
          <div className="multi-day-plan-settings">
            <label>
              <span>Trip name</span>
              <input value={plan.title} maxLength={80} onChange={(event) => savePlan({ ...plan, title: event.target.value })} />
            </label>
            <label>
              <span>Start date</span>
              <input type="date" value={plan.startDate} onChange={(event) => savePlan({ ...plan, startDate: event.target.value })} />
            </label>
            <label>
              <span>Days</span>
              <select value={plan.days} onChange={(event) => savePlan({ ...plan, days: Number(event.target.value) })}>
                {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day} day{day === 1 ? "" : "s"}</option>)}
              </select>
            </label>
            <button type="button" className="button button-secondary" onClick={exportCalendar} disabled={Object.keys(plan.assignments).length === 0}>
              <Download size={17} /> Export calendar
            </button>
          </div>

          {unassigned.length > 0 && (
            <div className="multi-day-unassigned">
              <div className="multi-day-section-heading"><Plus size={18} /><div><strong>Saved experiences</strong><small>Choose a day for each experience.</small></div></div>
              <div className="multi-day-trip-pool">
                {unassigned.map((trip) => {
                  const experience = allExperiences.find((item) => item.id === trip.trip.experienceId);
                  return <article key={trip.id}><div><span>{experience?.region ?? "Alps"}</span><strong>{trip.name}</strong><small>{experience?.promise ?? "Saved GemGo experience"}</small></div><select aria-label={`Assign ${trip.name} to a day`} defaultValue="" onChange={(event) => assign(trip.id, Number(event.target.value))}><option value="" disabled>Add to…</option>{Array.from({ length: plan.days }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Day {day}</option>)}</select></article>;
                })}
              </div>
            </div>
          )}

          <div className="multi-day-timeline">
            {Array.from({ length: plan.days }, (_, index) => index + 1).map((day) => {
              const dayTrips = assignedByDay.get(day) ?? [];
              return <article className="multi-day-column" key={day}><header><span>Day {day}</span><strong>{dateForDay(plan.startDate, day)}</strong></header><div className="multi-day-items">{dayTrips.length === 0 ? <p>Keep this day flexible.</p> : dayTrips.map((trip) => { const experience = allExperiences.find((item) => item.id === trip.trip.experienceId); return <div className="multi-day-item" key={trip.id}><div><strong>{trip.name}</strong><span>{experience?.region ?? "Alps"}</span></div><button type="button" aria-label={`Remove ${trip.name} from day ${day}`} onClick={() => assign(trip.id, null)}><Trash2 size={15} /></button></div>; })}</div><label><span>Day note</span><textarea rows={2} maxLength={240} value={plan.notes[day] ?? ""} onChange={(event) => savePlan({ ...plan, notes: { ...plan.notes, [day]: event.target.value } })} placeholder="Transport, booking or timing note" /></label></article>;
            })}
          </div>
          <p className="multi-day-disclaimer">Stored on this device. Travel times, availability and opening conditions must be checked again before each day.</p>
        </div>
      )}
    </section>,
    target,
  );
}
