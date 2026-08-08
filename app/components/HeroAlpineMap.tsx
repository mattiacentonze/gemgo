"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { Locale } from "../domain";

type Props = {
  locale: Locale;
};

type StoryPoint = {
  latitude: number;
  longitude: number;
  tone: "warm" | "cool";
  emphasis?: "origin" | "destination";
};

const DESKTOP_BOUNDS: [[number, number], [number, number]] = [
  [44.55, 4.75],
  [49.15, 16.15],
];

const MOBILE_BOUNDS: [[number, number], [number, number]] = [
  [45.15, 6.15],
  [48.45, 15.2],
];

// The markers are a demonstrative crowd-redistribution story, not live crowd data.
// Coordinates correspond to real Alpine places so every overlay remains geographic.
const STORY_POINTS: StoryPoint[] = [
  { latitude: 45.9237, longitude: 6.8694, tone: "warm" },
  { latitude: 46.0207, longitude: 7.7491, tone: "warm" },
  { latitude: 46.5935, longitude: 7.9091, tone: "warm", emphasis: "origin" },
  { latitude: 47.5576, longitude: 10.7498, tone: "warm" },
  { latitude: 47.2692, longitude: 11.4041, tone: "warm" },
  { latitude: 47.5622, longitude: 13.6493, tone: "warm" },
  { latitude: 46.3683, longitude: 14.1146, tone: "warm" },
  { latitude: 45.8252, longitude: 7.3259, tone: "cool" },
  { latitude: 46.4019, longitude: 7.7658, tone: "cool" },
  { latitude: 46.6357, longitude: 8.5949, tone: "cool" },
  { latitude: 47.5701, longitude: 10.5521, tone: "cool" },
  { latitude: 47.6201, longitude: 11.4311, tone: "cool" },
  { latitude: 47.1236, longitude: 13.7026, tone: "cool" },
  { latitude: 46.286, longitude: 13.858, tone: "cool", emphasis: "destination" },
  { latitude: 46.4191, longitude: 14.6932, tone: "cool" },
];

const COUNTRY_LABELS = [
  { label: "FRANCE", latitude: 46.28, longitude: 5.75 },
  { label: "SWITZERLAND", latitude: 47.22, longitude: 8.1 },
  { label: "GERMANY", latitude: 48.54, longitude: 10.4 },
  { label: "ITALY", latitude: 45.32, longitude: 10.5 },
  { label: "AUSTRIA", latitude: 47.84, longitude: 13.22 },
  { label: "SLOVENIA", latitude: 46.62, longitude: 15.12 },
] as const;

const copy: Record<Locale, { description: string; demo: string; loading: string }> = {
  en: {
    description: "Real topographic map of the Alpine arc with a demonstrative route from a crowded place to a quieter alternative.",
    demo: "Illustrative crowd scenario · not live data",
    loading: "Loading Alpine terrain",
  },
  it: {
    description: "Mappa topografica reale dell'arco alpino con un percorso dimostrativo da un luogo affollato a un'alternativa più tranquilla.",
    demo: "Scenario di affollamento illustrativo · dati non live",
    loading: "Caricamento del rilievo alpino",
  },
  de: {
    description: "Reale topografische Karte des Alpenbogens mit einer beispielhaften Route von einem überlasteten Ort zu einer ruhigeren Alternative.",
    demo: "Beispielhaftes Besuchsszenario · keine Live-Daten",
    loading: "Alpenrelief wird geladen",
  },
  fr: {
    description: "Carte topographique réelle de l'arc alpin avec un itinéraire illustratif d'un lieu saturé vers une alternative plus calme.",
    demo: "Scénario d'affluence illustratif · données non live",
    loading: "Chargement du relief alpin",
  },
  sl: {
    description: "Resnični topografski zemljevid alpskega loka s ponazoritveno potjo od obremenjenega kraja do mirnejše alternative.",
    demo: "Ponazoritveni scenarij obiska · brez podatkov v živo",
    loading: "Nalaganje alpskega reliefa",
  },
};

const quadraticRoute = (
  start: [number, number],
  control: [number, number],
  end: [number, number],
  steps = 44,
) => Array.from({ length: steps + 1 }, (_, index) => {
  const progress = index / steps;
  const inverse = 1 - progress;
  return [
    inverse * inverse * start[0] + 2 * inverse * progress * control[0] + progress * progress * end[0],
    inverse * inverse * start[1] + 2 * inverse * progress * control[1] + progress * progress * end[1],
  ] as [number, number];
});

const ROUTE_POINTS = quadraticRoute(
  [46.5935, 7.9091],
  [48.05, 10.82],
  [46.286, 13.858],
);

const markerMarkup = (point: StoryPoint) => {
  const emphasis = point.emphasis ? ` is-${point.emphasis}` : "";
  return `<span class="hero-story-dot is-${point.tone}${emphasis}" aria-hidden="true"><span class="hero-story-dot-halo"></span><span class="hero-story-dot-ring"></span><span class="hero-story-dot-core"></span></span>`;
};

export default function HeroAlpineMap({ locale }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const arrowRef = useRef<LeafletMarker | null>(null);
  const [terrainReady, setTerrainReady] = useState(false);
  const descriptionId = useId();
  const text = copy[locale];

  useEffect(() => {
    let active = true;
    let resizeFrame = 0;
    let settleTimer = 0;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      const { default: L } = await import("leaflet");
      if (!active || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
        boxZoom: false,
        doubleClickZoom: false,
        dragging: false,
        fadeAnimation: true,
        inertia: false,
        keyboard: false,
        maxZoom: 8,
        minZoom: 4,
        preferCanvas: false,
        scrollWheelZoom: false,
        tapHold: false,
        touchZoom: false,
        zoomAnimation: false,
        zoomControl: false,
        zoomSnap: 0.1,
      });

      map.createPane("heroLabelsPane");
      map.getPane("heroLabelsPane")!.style.zIndex = "430";
      map.createPane("heroRoutePane");
      map.getPane("heroRoutePane")!.style.zIndex = "450";
      map.createPane("heroMarkersPane");
      map.getPane("heroMarkersPane")!.style.zIndex = "470";

      const tiles = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors · © OpenTopoMap (CC-BY-SA)",
          maxNativeZoom: 17,
          maxZoom: 17,
          subdomains: "abc",
          updateWhenIdle: true,
          keepBuffer: 1,
        },
      );
      tiles.once("tileload", () => active && setTerrainReady(true));
      tiles.once("load", () => active && setTerrainReady(true));
      tiles.addTo(map);

      COUNTRY_LABELS.forEach(({ label, latitude, longitude }) => {
        L.marker([latitude, longitude], {
          pane: "heroLabelsPane",
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "hero-country-label",
            html: `<span>${label}</span>`,
            iconAnchor: [54, 10],
            iconSize: [108, 20],
          }),
        }).addTo(map);
      });

      STORY_POINTS.forEach((point) => {
        const primary = Boolean(point.emphasis);
        const size = primary ? 64 : 22;
        L.marker([point.latitude, point.longitude], {
          pane: "heroMarkersPane",
          interactive: false,
          keyboard: false,
          zIndexOffset: primary ? 300 : 0,
          icon: L.divIcon({
            className: "hero-story-marker",
            html: markerMarkup(point),
            iconAnchor: [size / 2, size / 2],
            iconSize: [size, size],
          }),
        }).addTo(map);
      });

      L.polyline(ROUTE_POINTS, {
        pane: "heroRoutePane",
        className: "hero-route-casing",
        color: "#ffffff",
        interactive: false,
        opacity: 0.9,
        smoothFactor: 1.35,
        weight: 7.5,
      }).addTo(map);

      L.polyline(ROUTE_POINTS, {
        pane: "heroRoutePane",
        className: "hero-route-line",
        color: "#ec6049",
        dashArray: "14 12",
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        opacity: 1,
        smoothFactor: 1.35,
        weight: 3.5,
      }).addTo(map);

      const arrowCoordinate = ROUTE_POINTS[ROUTE_POINTS.length - 3];
      const arrow = L.marker(arrowCoordinate, {
        pane: "heroMarkersPane",
        interactive: false,
        keyboard: false,
        zIndexOffset: 250,
        icon: L.divIcon({
          className: "hero-route-arrow-marker",
          html: '<span class="hero-route-arrow" aria-hidden="true"></span>',
          iconAnchor: [12, 12],
          iconSize: [24, 24],
        }),
      }).addTo(map);
      arrowRef.current = arrow;

      const positionArrow = () => {
        const previous = ROUTE_POINTS[ROUTE_POINTS.length - 5];
        const current = ROUTE_POINTS[ROUTE_POINTS.length - 2];
        const start = map.latLngToContainerPoint(previous);
        const end = map.latLngToContainerPoint(current);
        const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
        const element = arrow.getElement();
        element?.style.setProperty("--hero-route-angle", `${angle}deg`);
      };

      const fitStory = (width: number) => {
        const bounds = width <= 820 ? MOBILE_BOUNDS : DESKTOP_BOUNDS;
        map.fitBounds(bounds, {
          animate: false,
          padding: width <= 820 ? [2, 2] : [10, 12],
        });
        // Keep the geographic route above the comparison cards instead of
        // letting the cards obscure the story line and its moving arrow.
        map.panBy([0, width <= 820 ? 46 : 86], { animate: false });
        positionArrow();
      };

      mapRef.current = map;
      fitStory(mapContainerRef.current.clientWidth);
      map.whenReady(positionArrow);

      resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
          map.invalidateSize({ animate: false, pan: false });
          fitStory(width);
        });
      });
      resizeObserver.observe(mapContainerRef.current);

      // A slow tile response must not leave the shimmer running indefinitely.
      settleTimer = window.setTimeout(() => active && setTerrainReady(true), 5000);
    };

    setup();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(settleTimer);
      arrowRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <figure
      className={`hero-cartography ${terrainReady ? "is-ready" : "is-loading"}`}
      aria-describedby={descriptionId}
    >
      <figcaption id={descriptionId} className="sr-only">{text.description}</figcaption>
      <div className="hero-cartography-clip">
        <div ref={mapContainerRef} className="hero-leaflet-map" aria-hidden="true" />
        <div className="hero-map-colour-wash" aria-hidden="true" />
        <div className="hero-map-edge-veil" aria-hidden="true" />
      </div>
      {!terrainReady && <span className="hero-map-loading" aria-live="polite">{text.loading}</span>}
      <span className="hero-map-demo-label">{text.demo}</span>
      <small className="hero-map-attribution">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
        <span> · </span>
        <a href="https://opentopomap.org/about" target="_blank" rel="noreferrer">© OpenTopoMap</a>
      </small>
    </figure>
  );
}
