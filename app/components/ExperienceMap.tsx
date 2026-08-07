"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Experience } from "../product/types";
import type { OriginPoint } from "../product/recommendation-engine";
import type { Locale } from "../domain";
import { msg } from "../i18n/catalogs.mjs";

type Props = {
  experiences: Experience[];
  selectedId?: string;
  origin?: OriginPoint | null;
  routeCoordinates?: Array<[number, number]>;
  onSelect?: (experience: Experience) => void;
  className?: string;
  locale?: Locale;
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

export default function ExperienceMap({
  experiences,
  selectedId,
  origin = null,
  routeCoordinates = [],
  onSelect,
  className = "",
  locale: localeProp,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
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
    let active = true;
    import("leaflet").then((module) => {
      if (!active || !containerRef.current || mapRef.current) return;
      const L = module.default;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        minZoom: 4,
        maxZoom: 18,
        wheelPxPerZoomLevel: 140,
        wheelDebounceTime: 55,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.setView([46.7, 9.8], 6);
      setMapReady(true);
    });
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    let disposed = false;
    const render = async () => {
      const map = mapRef.current;
      const markerLayer = markerLayerRef.current;
      const routeLayer = routeLayerRef.current;
      if (!map || !markerLayer || !routeLayer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      markerLayer.clearLayers();
      routeLayer.clearLayers();

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

      const threshold = map.getZoom() >= 11 ? 0 : 56;
      const groups: Array<{ items: Experience[]; x: number; y: number }> = [];
      experiences.forEach((experience) => {
        const point = map.latLngToContainerPoint([experience.latitude, experience.longitude]);
        const group = threshold
          ? groups.find((item) => Math.hypot(item.x - point.x, item.y - point.y) <= threshold)
          : undefined;
        if (group) {
          group.items.push(experience);
          group.x = (group.x * (group.items.length - 1) + point.x) / group.items.length;
          group.y = (group.y * (group.items.length - 1) + point.y) / group.items.length;
        } else {
          groups.push({ items: [experience], x: point.x, y: point.y });
        }
      });

      groups.forEach((group) => {
        if (group.items.length > 2) {
          const latitude = group.items.reduce((sum, item) => sum + item.latitude, 0) / group.items.length;
          const longitude = group.items.reduce((sum, item) => sum + item.longitude, 0) / group.items.length;
          const cluster = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "gemgo-map-cluster-wrap",
              html: `<span class="gemgo-map-cluster"><img src="/assets/gemgo-logo-green.svg?v=2" alt=""/><strong>${group.items.length}</strong></span>`,
              iconSize: [46, 46],
              iconAnchor: [23, 23],
            }),
          });
          cluster.bindTooltip(msg(locale, "map.clusterLabel", { count: group.items.length, crowd: msg(locale, "map.legendLow") }));
          cluster.on("click", () => {
            map.fitBounds(
              L.latLngBounds(group.items.map((item) => [item.latitude, item.longitude])),
              { padding: [48, 48], maxZoom: 13 },
            );
          });
          cluster.addTo(markerLayer);
          return;
        }

        group.items.forEach((experience) => {
          const selected = selectedId === experience.id;
          const marker = L.marker([experience.latitude, experience.longitude], {
            icon: L.divIcon({
              className: "gemgo-map-marker-wrap",
              html: `<span class="gemgo-map-marker${selected ? " is-selected" : ""}"><img src="${markerLogo(experience)}" alt=""/><i></i></span>`,
              iconSize: selected ? [42, 50] : [34, 42],
              iconAnchor: selected ? [21, 47] : [17, 39],
            }),
            title: experience.name,
          });
          marker.bindPopup(
            `<div class="gemgo-map-popup"><strong>${safeText(experience.name)}</strong><span>${safeText(experience.region)} · ${safeText(experience.country)}</span><small>${safeText(msg(locale, experience.crowd === "low" ? "map.legendLow" : experience.crowd === "moderate" ? "map.legendModerate" : "map.legendBusy"))} · ${safeText(experience.validation)}</small></div>`,
          );
          marker.on("click", () => onSelectRef.current?.(experience));
          marker.addTo(markerLayer);
          if (selected) marker.openPopup();
        });
      });

      if (routeCoordinates.length > 1) {
        L.polyline(routeCoordinates, {
          color: "#185c4d",
          weight: 5,
          opacity: 0.82,
        }).addTo(routeLayer);
      }
    };

    render();
    const map = mapRef.current;
    map?.on("zoomend moveend", render);
    return () => {
      disposed = true;
      map?.off("zoomend moveend", render);
    };
  }, [experiences, locale, mapReady, origin, routeCoordinates, selectedId]);

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
    if (!mapReady) return;
    const element = containerRef.current;
    const map = mapRef.current;
    if (!element || !map || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [mapReady]);

  return (
    <div className={`experience-map-shell ${className}`}>
      <div ref={containerRef} className="experience-map" aria-label={msg(locale, "map.interactive", { count: experiences.length })} />
      {!mapReady && (
        <div className="experience-map-loading" role="status">
          <LoaderCircle size={22} />
          <span>{msg(locale, "map.destinationMap")}…</span>
        </div>
      )}
      <div className="experience-map-legend" aria-label={msg(locale, "map.crowds")}>
        <strong>{msg(locale, "plan.crowdPredicted")}</strong>
        <span><img src="/assets/gemgo-logo-green.svg?v=2" alt="" /> {msg(locale, "map.legendLow")}</span>
        <span><img src="/assets/gemgo-logo-orange.svg?v=2" alt="" /> {msg(locale, "map.legendModerate")}</span>
        <span><img src="/assets/gemgo-logo-red.svg?v=2" alt="" /> {msg(locale, "map.legendBusy")}</span>
      </div>
    </div>
  );
}
