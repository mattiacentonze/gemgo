"use client";

import { Mountain } from "lucide-react";
import { useState } from "react";
import ExperienceMap from "./ExperienceMap";
import type { Locale } from "../domain";
import { marketingCopy } from "../i18n/marketing";
import { allExperiences, catalogueSummary, totalCatalogueEntries } from "../product/catalogue";

type Props = {
  compact?: boolean;
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
  locale?: Locale;
};

export default function AlpineOverview({ compact = false, selectedRegion, onSelectRegion, locale = "en" }: Props) {
  const [localRegion, setLocalRegion] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const activeRegion = selectedRegion === undefined ? localRegion : selectedRegion;
  const text = marketingCopy[locale].map;
  const selectRegion = (region: string) => {
    if (selectedRegion === undefined) setLocalRegion(region);
    setFocusRequestId((current) => current + 1);
    onSelectRegion?.(region);
  };

  return (
    <div className={`alpine-overview alpine-overview-real ${compact ? "alpine-overview-compact" : ""}`}>
      <div className="alpine-overview-topline">
        <span className="eyebrow"><Mountain size={14} /> {text.coverage}</span>
        <span className="demo-label">{totalCatalogueEntries} {text.catalogue}</span>
      </div>
      <div className="alpine-real-map-wrap">
        <ExperienceMap
          experiences={allExperiences}
          className={compact ? "homepage-map-compact" : "homepage-map"}
          locale={locale}
          showLegend={false}
          focusRegion={activeRegion}
          focusRequestId={focusRequestId}
        />
        <div className="pressure-legend" aria-label="Tourism pressure legend">
          <span><i className="pressure-dot low" /> {text.lower}</span>
          <span><i className="pressure-dot moderate" /> {text.moderate}</span>
          <span><i className="pressure-dot high" /> {text.higher}</span>
        </div>
      </div>
      <div className="region-count-row">
        {Object.entries(catalogueSummary).map(([region, count]) => (
          <button
            type="button"
            key={region}
            className={activeRegion === region ? "is-selected" : ""}
            aria-pressed={activeRegion === region}
            onClick={() => selectRegion(region)}
          >
            <strong>{region}</strong>
            <span>{count} {text.pilotPlaces}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
