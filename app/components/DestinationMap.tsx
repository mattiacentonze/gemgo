"use client";

import { useEffect, useRef, useState } from "react";
import type { Destination } from "../page";

type Props = {
  destinations: Destination[];
  selected: Destination;
  onSelect: (destination: Destination) => void;
  showCrowdLayer: boolean;
  routeLink: (destination: Destination) => string;
};

type CrowdLevel = "manageable" | "moderate" | "busy";

type CrowdMeta = {
  color: string;
  clusterBackground: string;
  label: string;
  level: CrowdLevel;
  logo: string;
};

const crowdMeta = (popularity: number): CrowdMeta => {
  if (popularity >= 4) {
    return {
      color: "#e2493f",
      clusterBackground: "#fff0ed",
      label: "Usually busy",
      level: "busy",
      logo: "/assets/gemgo-logo-red.svg",
    };
  }
  if (popularity >= 3) {
    return {
      color: "#ee9b37",
      clusterBackground: "#fff6e7",
      label: "Often moderate",
      level: "moderate",
      logo: "/assets/gemgo-logo-orange.svg",
    };
  }
  return {
    color: "#35a66f",
    clusterBackground: "#ecf8f1",
    label: "Usually manageable",
    level: "manageable",
    logo: "/assets/gemgo-logo-green.svg",
  };
};

const dominantCrowd = (destinations: Destination[]) => {
  const levels: CrowdLevel[] = ["manageable", "moderate", "busy"];
  const counts = new Map(levels.map((level) => [level, 0]));

  destinations.forEach((destination) => {
    const level = crowdMeta(destination.popularity).level;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  });

  // When two categories are equally common, show the more cautious state.
  const dominant = levels.reduce((winner, level) => {
    const levelCount = counts.get(level) ?? 0;
    const winnerCount = counts.get(winner) ?? 0;
    return levelCount >= winnerCount ? level : winner;
  });

  if (dominant === "busy") return crowdMeta(4);
  if (dominant === "moderate") return crowdMeta(3);
  return crowdMeta(2);
};

export default function DestinationMap({
  destinations,
  selected,
  onSelect,
  showCrowdLayer,
  routeLink,
}: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const crowdRef = useRef<import("leaflet").LayerGroup | null>(null);
  const destinationMarkersRef = useRef(
    new Map<string, import("leaflet").Marker>(),
  );
  const selectedIdRef = useRef(selected.id);
  const markerClickRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const routeLinkRef = useRef(routeLink);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
    routeLinkRef.current = routeLink;
    selectedIdRef.current = selected.id;
  }, [onSelect, routeLink, selected.id]);

  useEffect(() => {
    let active = true;
    import("leaflet").then((module) => {
      if (!active || !elementRef.current || mapRef.current) return;
      const L = module.default;
      const map = L.map(elementRef.current, {
        zoomControl: true,
        minZoom: 5,
        maxZoom: 18,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      crowdRef.current = L.layerGroup();

      const bounds = L.latLngBounds(
        destinations.map((destination) => [destination.lat, destination.lng]),
      );
      map.fitBounds(bounds, { padding: [36, 36] });
      setMapReady(true);
    });
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [destinations]);

  useEffect(() => {
    let disposed = false;

    const renderLayers = async () => {
      const map = mapRef.current;
      const markerLayer = markersRef.current;
      const crowdLayer = crowdRef.current;
      if (!map || !markerLayer || !crowdLayer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      markerLayer.clearLayers();
      crowdLayer.clearLayers();
      destinationMarkersRef.current.clear();

      const zoom = map.getZoom();
      const clusterRadius = zoom >= 13 ? 0 : Math.max(54, 92 - zoom * 4);
      const clusters: {
        destinations: Destination[];
        x: number;
        y: number;
      }[] = [];

      destinations.forEach((destination) => {
        const point = map.project([destination.lat, destination.lng], zoom);
        const nearby = clusters.find(
          (cluster) =>
            Math.hypot(cluster.x - point.x, cluster.y - point.y) <=
            clusterRadius,
        );

        if (!nearby) {
          clusters.push({
            destinations: [destination],
            x: point.x,
            y: point.y,
          });
          return;
        }

        const size = nearby.destinations.length;
        nearby.destinations.push(destination);
        nearby.x = (nearby.x * size + point.x) / (size + 1);
        nearby.y = (nearby.y * size + point.y) / (size + 1);
      });

      clusters.forEach((cluster) => {
        if (cluster.destinations.length > 1) {
          const crowd = dominantCrowd(cluster.destinations);
          const size = Math.min(
            68,
            Math.round(38 + Math.sqrt(cluster.destinations.length) * 6),
          );
          const center = map.unproject([cluster.x, cluster.y], zoom);
          const icon = L.divIcon({
            className: "gemgo-cluster-shell",
            html: `<span class="gemgo-cluster" style="--cluster-size:${size}px;--cluster-color:${crowd.color};--cluster-background:${crowd.clusterBackground}" aria-label="${cluster.destinations.length} places, mostly ${crowd.label.toLowerCase()}">${cluster.destinations.length}</span>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
          const marker = L.marker(center, {
            icon,
            keyboard: true,
            title: `${cluster.destinations.length} places · ${crowd.label}`,
          });

          marker.on("click", () => {
            const bounds = L.latLngBounds(
              cluster.destinations.map(
                (destination) =>
                  [destination.lat, destination.lng] as [number, number],
              ),
            );
            map.fitBounds(bounds, {
              animate: true,
              maxZoom: Math.min(13, zoom + 3),
              padding: [56, 56],
            });
          });
          marker.addTo(markerLayer);
          return;
        }

        const destination = cluster.destinations[0];
        const crowd = crowdMeta(destination.popularity);
        const active = destination.id === selectedIdRef.current;
        const icon = L.divIcon({
          className: "gemgo-marker-shell",
          html: `<span class="gemgo-marker${active ? " is-selected" : ""}" style="--marker-color:${crowd.color}"><img src="${crowd.logo}" alt="" aria-hidden="true"></span>`,
          iconSize: [44, 52],
          iconAnchor: [22, 49],
          popupAnchor: [0, -47],
        });
        const marker = L.marker([destination.lat, destination.lng], {
          icon,
          title: destination.name,
        });
        marker.bindTooltip(destination.name, {
          direction: "top",
          offset: [0, -35],
        });
        marker.bindPopup(
          `<article class="map-popup">
            <div class="map-popup-image" aria-hidden="true"><span>${destination.name.slice(0, 2).toUpperCase()}</span></div>
            <small>${destination.kind} · ${destination.region}</small>
            <h3>${destination.name}</h3>
            <p>${destination.description}</p>
            <div class="map-popup-crowd"><i style="background:${crowd.color}"></i>${crowd.label}</div>
            <a href="${routeLinkRef.current(destination)}" target="_blank" rel="noreferrer">Directions</a>
          </article>`,
          { maxWidth: 280, minWidth: 230 },
        );
        marker.on("click", () => {
          markerClickRef.current = true;
          onSelectRef.current(destination);
          marker.openPopup();
        });
        marker.addTo(markerLayer);
        destinationMarkersRef.current.set(destination.id, marker);
      });

      destinations.forEach((destination) => {
        const crowd = crowdMeta(destination.popularity);
        L.circle([destination.lat, destination.lng], {
          radius: 5000 + destination.popularity * 2500,
          color: crowd.color,
          fillColor: crowd.color,
          fillOpacity: 0.15,
          opacity: 0.25,
          weight: 1,
          interactive: false,
        }).addTo(crowdLayer);
      });
    };

    renderLayers();

    const map = mapRef.current;
    map?.on("zoomend", renderLayers);

    return () => {
      disposed = true;
      map?.off("zoomend", renderLayers);
    };
  }, [destinations, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const crowdLayer = crowdRef.current;
    if (!map || !crowdLayer) return;

    if (showCrowdLayer) crowdLayer.addTo(map);
    else if (map.hasLayer(crowdLayer)) map.removeLayer(crowdLayer);
  }, [mapReady, showCrowdLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    destinationMarkersRef.current.forEach((marker, id) => {
      marker
        .getElement()
        ?.querySelector(".gemgo-marker")
        ?.classList.toggle("is-selected", id === selected.id);
    });

    if (markerClickRef.current) {
      markerClickRef.current = false;
      return;
    }

    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), {
      duration: 0.7,
    });
  }, [selected]);

  return (
    <>
      <div ref={elementRef} className="leaflet-map" aria-label="Interactive map of all 58 destinations" />
      <div className="map-legend">
        <span><i className="low" />Usually manageable</span>
        <span><i className="moderate" />Often moderate</span>
        <span><i className="busy" />Usually busy</span>
        <small>{destinations.length} places · grouped circles split as you zoom · general pattern, not live occupancy</small>
      </div>
    </>
  );
}
