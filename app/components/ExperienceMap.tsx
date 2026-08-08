"use client";

import { Layers3, LoaderCircle, Map as MapIcon, Mountain } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  CrowdLevel,
  Experience,
  TransportMode,
} from "../product/types";
import type { OriginPoint } from "../product/recommendation-engine";
import type { Locale } from "../domain";
import { msg } from "../i18n/catalogs";
import { localizedExperienceNarrative } from "../i18n/experience-content";
import { fetchRoadGeometry } from "../lib/geo";

type Props = {
  experiences: Experience[];
  selectedId?: string;
  origin?: OriginPoint | null;
  routeCoordinates?: Array<[number, number]>;
  routeMode?: TransportMode;
  routeStops?: Experience[];
  routeModes?: TransportMode[];
  onSelect?: (experience: Experience) => void;
  className?: string;
  locale?: Locale;
  showLegend?: boolean;
  focusRegion?: string | null;
  focusRequestId?: number;
  disableClustering?: boolean;
  tripExperienceIds?: string[];
};

type MapStyle = "standard" | "relief";

const ALPINE_BOUNDS: [[number, number], [number, number]] = [
  [43.75, 4.25],
  [50.15, 16.45],
];

// Keep navigation centred on the Alpine arc while allowing enough surrounding
// geography that a user can never expose an artificial tile boundary.
const ALPINE_PAN_BOUNDS: [[number, number], [number, number]] = [
  [40.5, -1.5],
  [53.25, 23.5],
];

const mapStyleCopy: Record<Locale, { label: string; standard: string; relief: string }> = {
  en: { label: "Map style", standard: "Standard", relief: "Relief" },
  it: { label: "Stile mappa", standard: "Standard", relief: "Rilievo" },
  de: { label: "Kartenstil", standard: "Standard", relief: "Relief" },
  fr: { label: "Style de carte", standard: "Standard", relief: "Relief" },
  sl: { label: "Slog zemljevida", standard: "Standard", relief: "Relief" },
};

const routeStyle: Record<TransportMode, { color: string; dashArray?: string }> = {
  walking: { color: "#3178c6", dashArray: "3 8" },
  bicycle: { color: "#2f9e62" },
  public: { color: "#ef8f2f", dashArray: "9 8" },
  car: { color: "#7856a8" },
  mixed: { color: "#0b9fa5", dashArray: "12 6 3 6" },
};

const engineMode = (mode: TransportMode) => {
  if (mode === "car") return "driving";
  if (mode === "bicycle") return "cycling";
  if (mode === "public") return "public_transport";
  return "walking";
};

const safeText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const markerLogo = (experience: Experience) => {
  if (experience.crowd === "high") return "/assets/gemgo-logo-red.svg?v=2";
  if (experience.crowd === "moderate") return "/assets/gemgo-logo-orange.svg?v=2";
  return "/assets/gemgo-logo-green.svg?v=2";
};

type ProjectedCluster = {
  items: Experience[];
  x: number;
  y: number;
};

const majorityCrowd = (items: Experience[]): CrowdLevel => {
  const counts: Record<CrowdLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
  };
  items.forEach((experience) => {
    counts[experience.crowd] += 1;
  });
  return [...(["high", "moderate", "low"] as const)].sort(
    (first, second) => counts[second] - counts[first],
  )[0];
};

const buildClusters = (
  experiences: Experience[],
  map: import("leaflet").Map,
  enabled = true,
): ProjectedCluster[] => {
  if (!enabled) {
    return experiences.map((experience) => {
      const point = map.latLngToLayerPoint([
        experience.latitude,
        experience.longitude,
      ]);
      return { items: [experience], x: point.x, y: point.y };
    });
  }
  const zoom = map.getZoom();
  if (zoom >= 15) {
    return experiences.map((experience) => {
      const point = map.latLngToLayerPoint([
        experience.latitude,
        experience.longitude,
      ]);
      return { items: [experience], x: point.x, y: point.y };
    });
  }

  const radius = zoom < 9 ? 72 : zoom < 12 ? 60 : 48;
  const clusters: ProjectedCluster[] = [];
  const buckets = new Map<string, ProjectedCluster[]>();
  experiences.forEach((experience) => {
    const point = map.latLngToLayerPoint([
      experience.latitude,
      experience.longitude,
    ]);
    const cellX = Math.floor(point.x / radius);
    const cellY = Math.floor(point.y / radius);
    let nearest: ProjectedCluster | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        for (const cluster of buckets.get(`${x}:${y}`) ?? []) {
          const distance = Math.hypot(point.x - cluster.x, point.y - cluster.y);
          if (distance <= radius && distance < nearestDistance) {
            nearest = cluster;
            nearestDistance = distance;
          }
        }
      }
    }
    if (nearest) {
      const count = nearest.items.length;
      nearest.x = (nearest.x * count + point.x) / (count + 1);
      nearest.y = (nearest.y * count + point.y) / (count + 1);
      nearest.items.push(experience);
      return;
    }
    const cluster = { items: [experience], x: point.x, y: point.y };
    clusters.push(cluster);
    const key = `${cellX}:${cellY}`;
    buckets.set(key, [...(buckets.get(key) ?? []), cluster]);
  });
  return clusters;
};

export default function ExperienceMap({
  experiences,
  selectedId,
  origin = null,
  routeCoordinates = [],
  routeMode = "walking",
  routeStops = [],
  routeModes = [],
  onSelect,
  className = "",
  locale: localeProp,
  showLegend = true,
  focusRegion = null,
  focusRequestId = 0,
  disableClustering = false,
  tripExperienceIds = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const multiRouteLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const experienceMarkersRef = useRef(
    new Map<string, import("leaflet").Marker>(),
  );
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const tripExperienceIdsRef = useRef(new Set(tripExperienceIds));
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [mapInteractionPending, setMapInteractionPending] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("relief");
  const [mapStyleOpen, setMapStyleOpen] = useState(false);
  const [observedLocale, setObservedLocale] = useState<Locale>("en");
  const locale = localeProp ?? observedLocale;

  useEffect(() => {
    if (localeProp) return;
    const sync = () => setObservedLocale((document.documentElement.lang || "en") as Locale);
    queueMicrotask(sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [localeProp]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    tripExperienceIdsRef.current = new Set(tripExperienceIds);
  }, [tripExperienceIds]);

  useEffect(() => {
    let active = true;
    const experienceMarkers = experienceMarkersRef.current;
    import("leaflet").then((module) => {
      if (!active || !containerRef.current || mapRef.current) return;
      const L = module.default;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: ALPINE_PAN_BOUNDS,
        maxBoundsViscosity: 1,
        // SVG is stable across the Explore → Results remount and is more than
        // sufficient for the prototype catalogue. Leaflet's shared canvas
        // renderer can keep a redraw queued after unmount and then call
        // clearRect on a released context.
        preferCanvas: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        wheelPxPerZoomLevel: 140,
        wheelDebounceTime: 55,
      });
      markerLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      multiRouteLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.fitBounds(ALPINE_BOUNDS, { padding: [8, 8], animate: false });
      setMapReady(true);
    });
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      multiRouteLayerRef.current = null;
      tileLayerRef.current = null;
      experienceMarkers.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let disposed = false;
    setTilesReady(false);
    import("leaflet").then(({ default: L }) => {
      const map = mapRef.current;
      if (!map || disposed) return;
      tileLayerRef.current?.removeFrom(map);
      const layer = mapStyle === "standard"
        ? L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            keepBuffer: 1,
            maxZoom: 18,
            noWrap: true,
            updateWhenIdle: true,
          })
        : L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
            keepBuffer: 1,
            maxZoom: 18,
            noWrap: true,
            updateWhenIdle: true,
          });
      layer.once("load", () => {
        if (!disposed) setTilesReady(true);
      });
      tileLayerRef.current = layer.addTo(map);
      window.setTimeout(() => {
        if (!disposed) setTilesReady(true);
      }, 1800);
    });
    return () => { disposed = true; };
  }, [mapReady, mapStyle]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const onZoomEnd = () => {
      setZoomRevision((revision) => revision + 1);
      window.requestAnimationFrame(() => setMapInteractionPending(false));
    };
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    let disposed = false;
    const render = async () => {
      const map = mapRef.current;
      const markerLayer = markerLayerRef.current;
      if (!map || !markerLayer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      markerLayer.clearLayers();
      experienceMarkersRef.current.clear();

      if (origin) {
        L.circleMarker([origin.lat, origin.lng], {
          radius: 8,
          color: "#173f36",
          weight: 3,
          fillColor: "#ffffff",
          fillOpacity: 1,
        })
          .bindTooltip(`${safeText(msg(locale, "planner.start"))}: ${safeText(origin.label)}`)
          .addTo(markerLayer);
      }

      const groups = buildClusters(experiences, map, !disableClustering);

      const exactCoordinateGroups = new Map<string, Experience[]>();
      experiences.forEach((experience) => {
        const key = `${experience.latitude.toFixed(5)}:${experience.longitude.toFixed(5)}`;
        exactCoordinateGroups.set(key, [
          ...(exactCoordinateGroups.get(key) ?? []),
          experience,
        ]);
      });

      groups.forEach((group) => {
        if (group.items.length > 1) {
          const majority = majorityCrowd(group.items);
          const containsTripStop = group.items.some((item) =>
            tripExperienceIdsRef.current.has(item.id),
          );
          const centre = map.layerPointToLatLng([group.x, group.y]);
          const cluster = L.marker(centre, {
            icon: L.divIcon({
              className: "gemgo-map-cluster-wrap",
              html: `<span class="gemgo-map-cluster is-${majority}${containsTripStop ? " has-trip-stop" : ""}" aria-label="${group.items.length} destinations"><strong>${group.items.length}</strong></span>`,
              iconSize: [50, 50],
              iconAnchor: [25, 25],
            }),
            title: `${group.items.length} destinations`,
          });
          cluster.on("click", () => {
            setMapInteractionPending(true);
            const bounds = L.latLngBounds(
              group.items.map((experience) => [
                experience.latitude,
                experience.longitude,
              ]),
            );
            const northEast = bounds.getNorthEast();
            const southWest = bounds.getSouthWest();
            const samePoint =
              northEast.lat === southWest.lat && northEast.lng === southWest.lng;
            if (samePoint) {
              map.setView(centre, Math.min(16, map.getZoom() + 2), {
                animate: true,
              });
            } else {
              map.fitBounds(bounds, {
                padding: [56, 56],
                maxZoom: Math.min(16, map.getZoom() + 3),
                animate: true,
              });
            }
            window.setTimeout(() => setMapInteractionPending(false), 900);
          });
          cluster.addTo(markerLayer);
          return;
        }

        const experience = group.items[0];
        const isTripStop = tripExperienceIdsRef.current.has(experience.id);
        const coordinateKey = `${experience.latitude.toFixed(5)}:${experience.longitude.toFixed(5)}`;
        const coordinateGroup = exactCoordinateGroups.get(coordinateKey) ?? [
          experience,
        ];
        const coordinateIndex = coordinateGroup.findIndex(
          (item) => item.id === experience.id,
        );
        const point = map.latLngToLayerPoint([
          experience.latitude,
          experience.longitude,
        ]);
        const angle = (coordinateIndex / coordinateGroup.length) * Math.PI * 2;
        const markerPoint =
          coordinateGroup.length > 1
            ? L.point(
                point.x + Math.sin(angle) * 18,
                point.y + Math.cos(angle) * 18,
              )
            : point;
        const markerPosition = map.layerPointToLatLng(markerPoint);
        const marker = L.marker(markerPosition, {
            icon: L.divIcon({
              className: "gemgo-map-marker-wrap",
              html: `<span class="gemgo-map-marker${selectedIdRef.current === experience.id ? " is-selected" : ""}${isTripStop ? " is-trip-stop" : ""}"><img src="${markerLogo(experience)}" alt=""/>${isTripStop ? '<span class="gemgo-trip-pin-badge" aria-hidden="true">✓</span>' : ""}</span>`,
              iconSize: [40, 50],
              iconAnchor: [20, 50],
            }),
            title: experience.name,
          },
        );
        const narrative = localizedExperienceNarrative(locale, experience);
        marker.bindPopup(
          `<div class="gemgo-map-popup"><strong>${safeText(experience.name)}</strong><span>${safeText(experience.region)} · ${safeText(narrative.country)}</span><small>${safeText(msg(locale, experience.crowd === "low" ? "map.legendLow" : experience.crowd === "moderate" ? "map.legendModerate" : "map.legendBusy"))} · ${safeText(narrative.validation)}</small></div>`,
        );
        marker.on("click", () => {
          marker.openPopup();
          onSelectRef.current?.(experience);
        });
        marker.addTo(markerLayer);
        experienceMarkersRef.current.set(experience.id, marker);
      });
    };

    void render();
    return () => {
      disposed = true;
    };
  }, [disableClustering, experiences, locale, mapReady, origin, tripExperienceIds, zoomRevision]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    experienceMarkersRef.current.forEach((marker, id) => {
      marker
        .getElement()
        ?.querySelector(".gemgo-map-marker")
        ?.classList.toggle("is-selected", id === selectedId);
    });
  }, [selectedId]);

  useEffect(() => {
    if (!mapReady) return;
    let disposed = false;
    const draw = async () => {
      const layer = routeLayerRef.current;
      if (!layer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      layer.clearLayers();
      if (routeCoordinates.length <= 1) return;
      const style = routeStyle[routeMode];
      L.polyline(routeCoordinates, {
        color: style.color,
        weight: 5,
        opacity: 0.9,
        dashArray: style.dashArray,
        lineCap: "round",
        className: `gemgo-route gemgo-route-${routeMode}`,
      }).addTo(layer);
    };
    void draw();
    return () => {
      disposed = true;
    };
  }, [mapReady, routeCoordinates, routeMode]);

  useEffect(() => {
    if (!mapReady) return;
    let disposed = false;
    const controller = new AbortController();
    const draw = async () => {
      const map = mapRef.current;
      const layer = multiRouteLayerRef.current;
      if (!map || !layer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      layer.clearLayers();
      for (let index = 1; index < routeStops.length; index += 1) {
        const from = routeStops[index - 1];
        const to = routeStops[index];
        const mode = routeModes[index - 1] ?? "public";
        const style = routeStyle[mode];
        let coordinates: Array<[number, number]> = [[from.latitude, from.longitude], [to.latitude, to.longitude]];
        try {
          const route = await fetchRoadGeometry(
            { lat: from.latitude, lng: from.longitude },
            { lat: to.latitude, lng: to.longitude },
            engineMode(mode),
            controller.signal,
          );
          if (route?.coordinates?.length) coordinates = route.coordinates;
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") return;
        }
        if (disposed) return;
        L.polyline(coordinates, {
          color: style.color,
          weight: 5,
          opacity: 0.9,
          dashArray: coordinates.length === 2 ? (style.dashArray ?? "6 8") : style.dashArray,
          lineCap: "round",
          className: `gemgo-route gemgo-route-${mode}`,
        }).addTo(layer);
      }
    };
    void draw();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [mapReady, routeModes, routeStops]);

  useEffect(() => {
    if (!mapReady) return;
    let disposed = false;
    const fit = async () => {
      const map = mapRef.current;
      if (!map || experiences.length === 0) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      const points: Array<[number, number]> = experiences.map((item) => [item.latitude, item.longitude]);
      if (origin) points.push([origin.lat, origin.lng]);
      map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 11, animate: false });
      window.setTimeout(() => map.invalidateSize({ animate: false }), 0);
    };
    fit();
    return () => {
      disposed = true;
    };
  }, [experiences, mapReady, origin]);

  useEffect(() => {
    if (!mapReady || !focusRegion) return;
    let disposed = false;
    const focus = async () => {
      const map = mapRef.current;
      const regionExperiences = experiences.filter((item) => item.region === focusRegion);
      if (!map || regionExperiences.length === 0) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      map.fitBounds(
        L.latLngBounds(regionExperiences.map((item) => [item.latitude, item.longitude])),
        { padding: [56, 56], maxZoom: 9, animate: true },
      );
    };
    focus();
    return () => { disposed = true; };
  }, [experiences, focusRegion, focusRequestId, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const element = containerRef.current;
    const map = mapRef.current;
    if (!element || !map || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [mapReady]);

  return (
    <div className={`experience-map-shell is-${mapStyle} ${className}`}>
      <div ref={containerRef} className="experience-map" aria-label={msg(locale, "map.interactive", { count: experiences.length })} />
      {(!mapReady || !tilesReady || mapInteractionPending) && (
        <div
          className={`experience-map-loading${mapInteractionPending && tilesReady ? " is-transient" : ""}`}
          role="status"
        >
          <LoaderCircle size={22} />
          <span>
            {mapInteractionPending
              ? msg(locale, "map.interactive", { count: experiences.length })
              : `${msg(locale, "map.destinationMap")}…`}
          </span>
        </div>
      )}
      <div className={`experience-map-style${mapStyleOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="experience-map-style-trigger"
          aria-label={mapStyleCopy[locale].label}
          aria-expanded={mapStyleOpen}
          title={mapStyleCopy[locale].label}
          onClick={() => setMapStyleOpen((open) => !open)}
        >
          <Layers3 size={18} />
        </button>
        {mapStyleOpen && (
          <div className="experience-map-style-options" aria-label={mapStyleCopy[locale].label}>
            <button
              type="button"
              className={mapStyle === "standard" ? "is-active" : ""}
              aria-label={mapStyleCopy[locale].standard}
              aria-pressed={mapStyle === "standard"}
              title={mapStyleCopy[locale].standard}
              onClick={() => { setMapStyle("standard"); setMapStyleOpen(false); }}
            >
              <MapIcon size={18} />
            </button>
            <button
              type="button"
              className={mapStyle === "relief" ? "is-active" : ""}
              aria-label={mapStyleCopy[locale].relief}
              aria-pressed={mapStyle === "relief"}
              title={mapStyleCopy[locale].relief}
              onClick={() => { setMapStyle("relief"); setMapStyleOpen(false); }}
            >
              <Mountain size={18} />
            </button>
          </div>
        )}
      </div>
      {showLegend && <div className="experience-map-legend" aria-label={msg(locale, "map.crowds")}>
        <strong>{msg(locale, "plan.crowdPredicted")}</strong>
        <span><img src="/assets/gemgo-logo-green.svg?v=2" alt="" /> {msg(locale, "map.legendLow")}</span>
        <span><img src="/assets/gemgo-logo-orange.svg?v=2" alt="" /> {msg(locale, "map.legendModerate")}</span>
        <span><img src="/assets/gemgo-logo-red.svg?v=2" alt="" /> {msg(locale, "map.legendBusy")}</span>
      </div>}
    </div>
  );
}
