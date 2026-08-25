import type { Locale } from "../domain";
import type { Experience } from "./types";

export type PublishedDestinationContent = {
  destination_id: string;
  locale: Locale;
  name: string;
  summary: string;
  operational_note: string | null;
  opening_hours: string | null;
  price_information: string | null;
  seasonality: string | null;
  source_url: string;
  source_label: string;
};

// Published rows only override editorial fields. Coordinates, ranking inputs
// and safety-critical catalogue structure continue to come from the reviewed
// static pilot dataset until their own ingestion pipeline exists.
export const applyPublishedDestinationContent = (
  experiences: Experience[],
  rows: PublishedDestinationContent[],
) => {
  const byDestination = new Map(rows.map((row) => [row.destination_id, row]));
  return experiences.map((experience) => {
    const content = byDestination.get(experience.id);
    if (!content) return experience;
    return {
      ...experience,
      name: content.name,
      promise: content.summary,
      summary: content.summary,
      operationalNote: content.operational_note ?? experience.operationalNote,
      editorialSourceUrl: content.source_url,
      editorialSourceLabel: content.source_label,
    };
  });
};
