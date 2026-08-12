import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the retired multi-day planner is not rendered in My Trip", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  assert.doesNotMatch(shell, /MultiDayTripPlanner/);
  assert.doesNotMatch(shell, /Plan multiple days/);
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

test("privacy export and deletion cover every GemGo local namespace", () => {
  const privacy = read("app/privacy/page.tsx");
  assert.match(privacy, /key\?\.startsWith\("gemgo"\)/);
  assert.match(privacy, /key\.startsWith\("gemgo"\)/);
  assert.match(privacy, /sessionStorage/);
  assert.doesNotMatch(privacy, /localStorage\.clear/);
});
