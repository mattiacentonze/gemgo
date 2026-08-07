"use client";

import { Mountain } from "lucide-react";
import ExperienceMap from "./ExperienceMap";
import { allExperiences, catalogueSummary, totalCatalogueEntries } from "../product/integrated-data";

type Props = {
  compact?: boolean;
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
};

export default function AlpineOverview({ compact = false, selectedRegion, onSelectRegion }: Props) {
  const visibleExperiences = selectedRegion
    ? allExperiences.filter((experience) => experience.region === selectedRegion)
    : allExperiences;

  return (
    <div className={`alpine-overview alpine-overview-real ${compact ? "alpine-overview-compact" : ""}`}>
      <div className="alpine-overview-topline">
        <span className="eyebrow"><Mountain size={14} /> Pan-Alpine coverage</span>
        <span className="demo-label">{totalCatalogueEntries} current catalogue entries</span>
      </div>
      <div className="alpine-real-map-wrap">
        <ExperienceMap
          experiences={visibleExperiences}
          onSelect={(experience) => onSelectRegion?.(experience.region)}
          className={compact ? "homepage-map-compact" : "homepage-map"}
          showLegend={false}
        />
        <div className="pressure-legend" aria-label="Tourism pressure legend">
          <span><i className="pressure-dot low" /> Lower estimate</span>
          <span><i className="pressure-dot moderate" /> Moderate estimate</span>
          <span><i className="pressure-dot high" /> Higher estimate</span>
        </div>
      </div>
      <div className="region-count-row">
        {Object.entries(catalogueSummary).map(([region, count]) => (
          <button
            type="button"
            key={region}
            className={selectedRegion === region ? "is-selected" : ""}
            onClick={() => onSelectRegion?.(region)}
          >
            <strong>{region}</strong>
            <span>{count} pilot places</span>
          </button>
        ))}
      </div>
    </div>
  );
}
