import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("saved experiences can be arranged into a 1 to 7 day itinerary", () => {
  const page = read("app/app/page.tsx");
  const planner = read("app/components/MultiDayTripPlanner.tsx");
  const css = read("app/styles/multi-day-planner.css");
  assert.match(page, /<MultiDayTripPlanner \/>/);
  assert.match(planner, /gemgo-multiday-itinerary-v1/);
  assert.match(planner, /Math\.min\(7, Math\.max\(1/);
  assert.match(planner, /Array\.from\(\{ length: 7 \}/);
  assert.match(planner, /assignments: Record<string, number>/);
  assert.match(planner, /Plan multiple days/);
  assert.match(css, /multi-day-timeline/);
  assert.match(css, /scroll-snap-type: x mandatory/);
});

test("multi-day itineraries can be exported without pretending to provide live bookings", () => {
  const planner = read("app/components/MultiDayTripPlanner.tsx");
  assert.match(planner, /BEGIN:VCALENDAR/);
  assert.match(planner, /BEGIN:VEVENT/);
  assert.match(planner, /GemGo device-local itinerary/);
  assert.match(planner, /Verify current access and opening conditions before departure/);
  assert.match(planner, /text\/calendar/);
  assert.doesNotMatch(planner, /confirmed booking/i);
});

test("privacy export and deletion include the multi-day plan", () => {
  const privacy = read("app/components/PrivacyControls.tsx");
  assert.match(privacy, /gemgo-multiday-itinerary-v1/);
  assert.match(privacy, /multi-day plans/);
});
