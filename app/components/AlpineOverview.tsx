"use client";

import { MapPin, Mountain, Route } from "lucide-react";
import { alpineRegions } from "../product/data";

type Props = {
  compact?: boolean;
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
};

export default function AlpineOverview({ compact = false, selectedRegion, onSelectRegion }: Props) {
  return (
    <div className={`alpine-overview ${compact ? "alpine-overview-compact" : ""}`}>
      <div className="alpine-overview-topline">
        <span className="eyebrow"><Mountain size={14} /> Pan-Alpine coverage</span>
        <span className="demo-label">Demonstration catalogue</span>
      </div>
      <div className="alpine-map-canvas" role="img" aria-label="Interactive overview of the Alpine regions represented in the GemGo demonstration">
        <svg className="alpine-ridge" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="ridgeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.94)" />
              <stop offset="100%" stopColor="rgba(228,241,232,0.76)" />
            </linearGradient>
          </defs>
          <path d="M-40 340 C70 310 95 245 160 258 C220 270 250 198 320 218 C388 238 418 160 492 188 C560 212 608 122 676 162 C740 198 782 128 848 175 C905 215 950 210 1040 142 L1040 440 L-40 440 Z" fill="url(#ridgeFill)" />
          <path d="M-40 340 C70 310 95 245 160 258 C220 270 250 198 320 218 C388 238 418 160 492 188 C560 212 608 122 676 162 C740 198 782 128 848 175 C905 215 950 210 1040 142" fill="none" stroke="rgba(24,83,69,0.28)" strokeWidth="3" strokeDasharray="7 11" />
          <path d="M70 318 C180 260 260 282 350 216 C450 142 534 212 626 152 C720 92 820 192 940 145" fill="none" stroke="rgba(230,111,76,0.45)" strokeWidth="10" strokeLinecap="round" opacity="0.42" />
        </svg>

        <div className="alpine-map-origin"><Route size={15} /> One system, local knowledge</div>

        {alpineRegions.map((region) => {
          const isSelected = selectedRegion === region.name;
          return (
            <button
              key={region.name}
              type="button"
              className={`region-node pressure-${region.pressure} ${isSelected ? "is-selected" : ""}`}
              style={{ left: `${region.x}%`, top: `${region.y}%` }}
              onClick={() => onSelectRegion?.(region.name)}
              aria-pressed={isSelected}
            >
              <span className="region-pin"><MapPin size={15} /></span>
              <span className="region-node-copy">
                <strong>{region.name}</strong>
                <small>{region.country} · {region.experiences} curated demo experience</small>
              </span>
            </button>
          );
        })}

        <div className="pressure-legend" aria-label="Tourism pressure legend">
          <span><i className="pressure-dot low" /> Lower pressure</span>
          <span><i className="pressure-dot moderate" /> Moderate pressure</span>
          <span><i className="pressure-dot high" /> Higher pressure</span>
        </div>
      </div>
    </div>
  );
}
