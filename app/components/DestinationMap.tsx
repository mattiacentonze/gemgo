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

const crowdMeta = (popularity: number) => {
  if (popularity >= 4) return { color: "#e2493f", label: "Usually busy" };
  if (popularity >= 3) return { color: "#ee9b37", label: "Often moderate" };
  return { color: "#35a66f", label: "Usually manageable" };
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
  const [mapReady, setMapReady] = useState(false);

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
    const renderLayers = async () => {
      const map = mapRef.current;
      const markerLayer = markersRef.current;
      const crowdLayer = crowdRef.current;
      if (!map || !markerLayer || !crowdLayer) return;
      const L = (await import("leaflet")).default;
      markerLayer.clearLayers();
      crowdLayer.clearLayers();

      destinations.forEach((destination) => {
        const crowd = crowdMeta(destination.popularity);
        const active = destination.id === selected.id;
        const icon = L.divIcon({
          className: "gemgo-marker-shell",
          html: `<span class="gemgo-marker${active ? " is-selected" : ""}" style="--marker-color:${crowd.color}"><b>GEMGO</b></span>`,
          iconSize: [48, 52],
          iconAnchor: [24, 50],
          popupAnchor: [0, -46],
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
            <a href="${routeLink(destination)}" target="_blank" rel="noreferrer">Directions</a>
          </article>`,
          { maxWidth: 280, minWidth: 230 },
        );
        marker.on("click", () => {
          onSelect(destination);
          marker.openPopup();
        });
        marker.addTo(markerLayer);

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

      if (showCrowdLayer) crowdLayer.addTo(map);
      else if (map.hasLayer(crowdLayer)) map.removeLayer(crowdLayer);
    };
    renderLayers();
  }, [destinations, mapReady, onSelect, routeLink, selected.id, showCrowdLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
        <small>{destinations.length} places · general pattern, not live occupancy</small>
      </div>
    </>
  );
}
