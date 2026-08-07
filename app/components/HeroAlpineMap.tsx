"use client";

import { useEffect, useRef } from "react";
import destinationData from "../data/destinations.json";

type PublicDestination = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  popularity_score: number;
};

const NEUSCHWANSTEIN: [number, number] = [47.5576, 10.7498];
const FALKENSTEIN: [number, number] = [47.5701, 10.5521];

export default function HeroAlpineMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    let map: import("leaflet").Map | null = null;

    import("leaflet").then((module) => {
      if (!active || !containerRef.current) return;
      const L = module.default;
      map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tapHold: false,
      });

      L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution: "Map: © OpenStreetMap contributors, SRTM · style: © OpenTopoMap",
        maxZoom: 17,
      }).addTo(map);

      const destinations = (destinationData as { destinations: PublicDestination[] }).destinations;
      destinations.forEach((destination) => {
        const highPressure = destination.popularity_score >= 0.45;
        L.circleMarker([destination.latitude, destination.longitude], {
          radius: highPressure ? 4.5 : 4,
          color: "rgba(255,255,255,.95)",
          weight: 2,
          fillColor: highPressure ? "#ef5a4e" : "#13a66d",
          fillOpacity: 0.9,
          interactive: false,
        }).addTo(map!);
      });

      L.circleMarker(NEUSCHWANSTEIN, {
        radius: 10,
        color: "rgba(239,90,78,.26)",
        weight: 10,
        fillColor: "#ef5a4e",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);

      L.circleMarker(FALKENSTEIN, {
        radius: 11,
        color: "rgba(19,166,109,.26)",
        weight: 12,
        fillColor: "#079764",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);

      L.polyline([NEUSCHWANSTEIN, [47.61, 10.66], FALKENSTEIN], {
        color: "#e34f43",
        weight: 3,
        opacity: 0.92,
        dashArray: "8 7",
        lineCap: "round",
      }).addTo(map);

      map.fitBounds([[45.35, 6.45], [48.35, 13.25]], { padding: [6, 6], animate: false });
      window.setTimeout(() => map?.invalidateSize({ animate: false }), 0);
    });

    return () => {
      active = false;
      map?.remove();
    };
  }, []);

  return <div ref={containerRef} className="hero-relief-map" aria-hidden="true" />;
}
