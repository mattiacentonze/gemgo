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
  rgb: [number, number, number];
};

const crowdMeta = (popularity: number): CrowdMeta => {
  if (popularity >= 4) {
    return {
      color: "#e2493f",
      clusterBackground: "#fff0ed",
      label: "Usually busy",
      level: "busy",
      logo: "/assets/gemgo-logo-red.svg",
      rgb: [226, 73, 63],
    };
  }
  if (popularity >= 3) {
    return {
      color: "#ee9b37",
      clusterBackground: "#fff6e7",
      label: "Often moderate",
      level: "moderate",
      logo: "/assets/gemgo-logo-orange.svg",
      rgb: [238, 155, 55],
    };
  }
  return {
    color: "#35a66f",
    clusterBackground: "#ecf8f1",
    label: "Usually manageable",
    level: "manageable",
    logo: "/assets/gemgo-logo-green.svg",
    rgb: [53, 166, 111],
  };
};

const dominantCrowd = (destinations: Destination[]) => {
  const levels: CrowdLevel[] = ["manageable", "moderate", "busy"];
  const counts = new Map(levels.map((level) => [level, 0]));

  destinations.forEach((destination) => {
    const level = crowdMeta(destination.popularity).level;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  });

  // When categories tie, communicate the more cautious state.
  const dominant = levels.reduce((winner, level) => {
    const levelCount = counts.get(level) ?? 0;
    const winnerCount = counts.get(winner) ?? 0;
    return levelCount >= winnerCount ? level : winner;
  });

  if (dominant === "busy") return crowdMeta(4);
  if (dominant === "moderate") return crowdMeta(3);
  return crowdMeta(2);
};

const safeText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
  const crowdCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

      const canvas = document.createElement("canvas");
      canvas.className = "crowd-veil";
      canvas.setAttribute("aria-hidden", "true");
      map.getPanes().overlayPane.appendChild(canvas);
      crowdCanvasRef.current = canvas;

      const bounds = L.latLngBounds(
        destinations.map((destination) => [destination.lat, destination.lng]),
      );
      map.fitBounds(bounds, { padding: [36, 36] });
      setMapReady(true);
    });
    return () => {
      active = false;
      crowdCanvasRef.current?.remove();
      crowdCanvasRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [destinations]);

  useEffect(() => {
    let disposed = false;

    const renderMarkers = async () => {
      const map = mapRef.current;
      const markerLayer = markersRef.current;
      if (!map || !markerLayer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      markerLayer.clearLayers();
      destinationMarkersRef.current.clear();

      const zoom = map.getZoom();
      // Preserve normal pins for groups of five or fewer. At street-level zoom
      // clustering is disabled entirely so expanding a cluster always ends in
      // visible, individually selectable destinations.
      const clusterRadius = zoom >= 12 ? 0 : Math.max(38, 80 - zoom * 4);
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

      const addDestinationMarker = (destination: Destination) => {
        const crowd = crowdMeta(destination.popularity);
        const isActive = destination.id === selectedIdRef.current;
        const icon = L.divIcon({
          className: "gemgo-marker-shell",
          html: `<span class="gemgo-marker${isActive ? " is-selected" : ""}" style="--marker-color:${crowd.color}"><img src="${crowd.logo}" alt="" aria-hidden="true"></span>`,
          iconSize: [30, 36],
          iconAnchor: [15, 35],
          popupAnchor: [0, -32],
        });
        const marker = L.marker([destination.lat, destination.lng], {
          icon,
          keyboard: true,
        });
        marker.bindPopup(
          `<article class="map-popup">
            <header>
              <img src="${crowd.logo}" alt="" aria-hidden="true">
              <div>
                <small>${safeText(destination.kind)} · ${safeText(destination.region)}</small>
                <h3>${safeText(destination.name)}</h3>
              </div>
              <span class="map-popup-crowd"><i style="background:${crowd.color}"></i>${crowd.label}</span>
            </header>
            <p>${safeText(destination.description)}</p>
            <a href="${routeLinkRef.current(destination)}" target="_blank" rel="noreferrer">Directions</a>
          </article>`,
          { maxWidth: 390, minWidth: 280, closeButton: true },
        );
        marker.on("click", () => {
          markerClickRef.current = true;
          onSelectRef.current(destination);
          marker.openPopup();
        });
        marker.addTo(markerLayer);
        destinationMarkersRef.current.set(destination.id, marker);
      };

      clusters.forEach((cluster) => {
        // Keep normal markers visible until an area would contain more than five.
        if (cluster.destinations.length <= 5) {
          cluster.destinations.forEach(addDestinationMarker);
          return;
        }

        const crowd = dominantCrowd(cluster.destinations);
        const size = Math.min(
          62,
          Math.round(36 + Math.sqrt(cluster.destinations.length) * 5),
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
            maxZoom: Math.min(12, zoom + 4),
            padding: [56, 56],
          });
        });
        marker.addTo(markerLayer);
      });
    };

    renderMarkers();

    const map = mapRef.current;
    map?.on("zoomend", renderMarkers);

    return () => {
      disposed = true;
      map?.off("zoomend", renderMarkers);
    };
  }, [destinations, mapReady]);

  useEffect(() => {
    let frame = 0;
    let disposed = false;

    const drawCrowdVeil = () => {
      frame = 0;
      const map = mapRef.current;
      const canvas = crowdCanvasRef.current;
      if (!map || !canvas || !showCrowdLayer || disposed) return;

      const size = map.getSize();
      const scale = 4;
      const width = Math.max(1, Math.ceil(size.x / scale));
      const height = Math.max(1, Math.ceil(size.y / scale));
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      canvas.style.transform = `translate3d(${topLeft.x}px, ${topLeft.y}px, 0)`;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return;
      const image = context.createImageData(width, height);
      const projected = destinations.map((destination) => ({
        point: map.latLngToContainerPoint([destination.lat, destination.lng]),
        crowd: crowdMeta(destination.popularity),
      }));

      // A compact, map-anchored influence field: nearby points blend into an
      // irregular veil instead of producing oversized circular overlays.
      const influencePx = Math.max(36, Math.min(88, 76 - map.getZoom() * 2));
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const px = x * scale;
          const py = y * scale;
          let totalWeight = 0;
          let red = 0;
          let green = 0;
          let blue = 0;

          projected.forEach(({ point, crowd }) => {
            const distance = Math.hypot(point.x - px, point.y - py);
            if (distance >= influencePx) return;
            const normalized = 1 - distance / influencePx;
            const weight = normalized * normalized * (0.8 + normalized);
            totalWeight += weight;
            red += crowd.rgb[0] * weight;
            green += crowd.rgb[1] * weight;
            blue += crowd.rgb[2] * weight;
          });

          if (totalWeight === 0) continue;
          const index = (y * width + x) * 4;
          image.data[index] = Math.round(red / totalWeight);
          image.data[index + 1] = Math.round(green / totalWeight);
          image.data[index + 2] = Math.round(blue / totalWeight);
          image.data[index + 3] = Math.round(
            Math.min(72, 18 + totalWeight * 42),
          );
        }
      }
      context.putImageData(image, 0, 0);
    };

    const scheduleDraw = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(drawCrowdVeil);
    };

    const map = mapRef.current;
    const canvas = crowdCanvasRef.current;
    if (!map || !canvas) return;
    canvas.classList.toggle("is-visible", showCrowdLayer);
    if (showCrowdLayer) scheduleDraw();
    else {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    map.on("moveend zoomend resize", scheduleDraw);

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      map.off("moveend zoomend resize", scheduleDraw);
    };
  }, [destinations, mapReady, showCrowdLayer]);

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

    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 12), {
      duration: 0.7,
    });
  }, [selected]);

  return (
    <>
      <div
        ref={elementRef}
        className="leaflet-map"
        aria-label="Interactive map of all 58 destinations"
      />
      <div className="map-legend">
        <span><i className="low" />Usually manageable</span>
        <span><i className="moderate" />Often moderate</span>
        <span><i className="busy" />Usually busy</span>
        <small>
          {destinations.length} places · clusters appear only above five nearby
          pins · Crowds shows a map-anchored estimate, not live occupancy
        </small>
      </div>
    </>
  );
}
