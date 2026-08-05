"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Destination, Locale, TransportCode } from "../domain";
import type { Accommodation } from "../content";
import { msg } from "../i18n/catalogs.mjs";
import { commonsImageParams } from "../lib/commons-media";
import { fetchRoadGeometry } from "../lib/geo.mjs";

type Props = {
  destinations: Destination[];
  selected: Destination;
  onSelect: (destination: Destination) => void;
  showCrowdLayer: boolean;
  routeLink: (destination: Destination) => string;
  locale: Locale;
  routeStops?: Destination[];
  routeModes?: TransportCode[];
  routeOrigin?: { lat: number; lng: number } | null;
  accommodations: Accommodation[];
  showAccommodations: boolean;
  onToggleAccommodations: () => void;
};

type CrowdLevel = "manageable" | "moderate" | "busy";

type CrowdMeta = {
  color: string;
  clusterBackground: string;
  labelKey: string;
  level: CrowdLevel;
  logo: string;
  rgb: [number, number, number];
};

const crowdMeta = (popularity: number): CrowdMeta => {
  if (popularity >= 4) {
    return {
      color: "#e2493f",
      clusterBackground: "#fff0ed",
      labelKey: "map.legendBusy",
      level: "busy",
      logo: "/assets/gemgo-logo-red.svg?v=2",
      rgb: [226, 73, 63],
    };
  }
  if (popularity >= 3) {
    return {
      color: "#ee9b37",
      clusterBackground: "#fff6e7",
      labelKey: "map.legendModerate",
      level: "moderate",
      logo: "/assets/gemgo-logo-orange.svg?v=2",
      rgb: [238, 155, 55],
    };
  }
  return {
    color: "#35a66f",
    clusterBackground: "#ecf8f1",
    labelKey: "map.legendLow",
    level: "manageable",
    logo: "/assets/gemgo-logo-green.svg?v=2",
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

const routeStyle: Record<TransportCode, { color: string; dashArray?: string }> = {
  walking: { color: "#3178c6", dashArray: "3 8" },
  cycling: { color: "#2f9e62" },
  e_bike: { color: "#0b9fa5" },
  driving: { color: "#7856a8" },
  public_transport: { color: "#ef8f2f", dashArray: "9 8" },
};

export default function DestinationMap({
  destinations,
  selected,
  onSelect,
  showCrowdLayer,
  routeLink,
  locale,
  routeStops = [],
  routeModes = [],
  routeOrigin = null,
  accommodations,
  showAccommodations,
  onToggleAccommodations,
}: Props) {
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      msg(locale, key, params),
    [locale],
  );
  const regionLabel = useCallback(
    (destination: Destination) => t(`data.region.${destination.region}`),
    [t],
  );
  const kindLabel = useCallback(
    (destination: Destination) => t(`data.kind.${destination.kind}`),
    [t],
  );
  const description = useCallback(
    (destination: Destination) =>
      t("data.description", {
        name: destination.name,
        kind: kindLabel(destination).toLocaleLowerCase(locale),
        region: regionLabel(destination),
      }),
    [kindLabel, locale, regionLabel, t],
  );
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const crowdCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const accommodationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const destinationMarkersRef = useRef(
    new Map<string, import("leaflet").Marker>(),
  );
  const selectedIdRef = useRef(selected.id);
  const markerClickRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const routeLinkRef = useRef(routeLink);
  const initialDestinationsRef = useRef(destinations);
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
      routeLayerRef.current = L.layerGroup().addTo(map);
      accommodationLayerRef.current = L.layerGroup().addTo(map);

      const canvas = document.createElement("canvas");
      canvas.className = "crowd-veil";
      canvas.setAttribute("aria-hidden", "true");
      map.getPanes().overlayPane.appendChild(canvas);
      crowdCanvasRef.current = canvas;

      const initialDestinations = initialDestinationsRef.current;
      if (initialDestinations.length > 0) {
        const bounds = L.latLngBounds(
          initialDestinations.map((destination) => [destination.lat, destination.lng]),
        );
        map.fitBounds(bounds, { padding: [36, 36] });
      }
      setMapReady(true);
    });
    return () => {
      active = false;
      crowdCanvasRef.current?.remove();
      crowdCanvasRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      accommodationLayerRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || destinations.length === 0) return;
    let disposed = false;
    import("leaflet").then((module) => {
      if (disposed || !mapRef.current) return;
      const L = module.default;
      const bounds = L.latLngBounds(
        destinations.map((destination) => [destination.lat, destination.lng]),
      );
      map.fitBounds(bounds, { animate: false, padding: [36, 36] });
    });
    return () => {
      disposed = true;
    };
  }, [destinations, mapReady]);

  useEffect(() => {
    const element = elementRef.current;
    const map = mapRef.current;
    if (!element || !map || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.contentRect;
      if (!size || size.width === 0 || size.height === 0) return;
      map.invalidateSize({ animate: false });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [mapReady]);

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
            <div class="map-popup-media" data-photo-name="${safeText(destination.name)}"><span>GemGo</span></div>
            <header>
              <img src="${crowd.logo}" alt="" aria-hidden="true">
              <div>
                <small>${safeText(kindLabel(destination))} · ${safeText(regionLabel(destination))}</small>
                <h3>${safeText(destination.name)}</h3>
              </div>
              <span class="map-popup-crowd"><i style="background:${crowd.color}"></i>${safeText(t(crowd.labelKey))}</span>
            </header>
            <p>${safeText(description(destination))}</p>
            <a href="${routeLinkRef.current(destination)}" target="_blank" rel="noreferrer">${safeText(t("map.directions"))}</a>
          </article>`,
          { maxWidth: 390, minWidth: 280, closeButton: true },
        );
        marker.on("click", () => {
          markerClickRef.current = true;
          onSelectRef.current(destination);
          marker.openPopup();
        });
        marker.on("popupopen", () => {
          const popupElement = marker.getPopup()?.getElement();
          const close = marker
            .getPopup()
            ?.getElement()
            ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button");
          if (close) {
            close.title = t("global.close");
            close.setAttribute("aria-label", t("global.close"));
          }
          const media = popupElement?.querySelector<HTMLElement>(".map-popup-media");
          if (media && !media.dataset.loaded) {
            media.dataset.loaded = "true";
            const params = commonsImageParams(
              destination.name,
              regionLabel(destination),
              640,
              6,
            );
            fetch(`https://commons.wikimedia.org/w/api.php?${params}`)
              .then((response) => response.json())
              .then((payload) => {
                const pages = Object.values(payload?.query?.pages ?? {}) as Array<{
                  imageinfo?: Array<{
                    thumburl?: string;
                    descriptionurl?: string;
                    extmetadata?: Record<string, { value?: string }>;
                  }>;
                }>;
                const free = pages
                  .map((page) => page.imageinfo?.[0])
                  .find((info) => {
                    const license = info?.extmetadata?.LicenseShortName?.value ?? "";
                    return Boolean(
                      info?.thumburl &&
                        /^(CC0|CC BY|CC BY-SA|Public domain)/i.test(license),
                    );
                  });
                if (!free?.thumburl || !media.isConnected) return;
                const author = (free.extmetadata?.Artist?.value ?? t("media.contributor"))
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                const license = free.extmetadata?.LicenseShortName?.value ?? "CC";
                media.innerHTML = `<img src="${safeText(free.thumburl)}" alt="${safeText(destination.name)}"><a href="${safeText(free.descriptionurl ?? "https://commons.wikimedia.org/")}" target="_blank" rel="noreferrer">${safeText(author)} · ${safeText(license)}</a>`;
              })
              .catch(() => undefined);
          }
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
          html: `<span class="gemgo-cluster" style="--cluster-size:${size}px;--cluster-color:${crowd.color};--cluster-background:${crowd.clusterBackground}" aria-label="${safeText(t("map.clusterLabel", { count: cluster.destinations.length, crowd: t(crowd.labelKey).toLocaleLowerCase(locale) }))}">${cluster.destinations.length}</span>`,
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
  }, [
    description,
    destinations,
    kindLabel,
    locale,
    mapReady,
    regionLabel,
    t,
  ]);

  useEffect(() => {
    let disposed = false;

    const renderAccommodations = async () => {
      const layer = accommodationLayerRef.current;
      if (!mapRef.current || !layer) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      layer.clearLayers();
      if (!showAccommodations) return;

      accommodations.forEach((stay) => {
        const icon = L.divIcon({
          className: "accommodation-marker-shell",
          html: '<span class="accommodation-marker" aria-hidden="true"><span>⌂</span></span>',
          iconSize: [34, 40],
          iconAnchor: [17, 39],
          popupAnchor: [0, -35],
        });
        const marker = L.marker([stay.lat, stay.lng], {
          icon,
          keyboard: true,
          title: stay.name,
          alt: t("stays.mapMarker", { name: stay.name }),
          zIndexOffset: 1000,
          riseOnHover: true,
          riseOffset: 250,
        });
        const checkedDate = new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(`${stay.checkedAt}T12:00:00`));
        marker.bindPopup(
          `<article class="map-popup accommodation-popup">
            <div class="accommodation-popup-badge">${safeText(t("stays.mapBadge"))}</div>
            <small>${safeText(stay.area)} · ${safeText(t(`data.region.${stay.region}`))}</small>
            <h3>${safeText(stay.name)}</h3>
            <div class="accommodation-popup-meta">
              <strong>★ ${stay.rating}/10</strong>
              <span>${safeText(t("stays.reviews", { count: stay.reviewCount }))}</span>
              <span>${safeText(stay.priceBand)} · ${safeText(t("stays.indicativePrice"))}</span>
            </div>
            <p>${safeText(t("stays.checked", { date: checkedDate }))}</p>
            <a href="${safeText(stay.bookingUrl)}" target="_blank" rel="noreferrer">${safeText(t("stays.openBooking"))}</a>
          </article>`,
          { maxWidth: 340, minWidth: 260, closeButton: true },
        );
        marker.on("popupopen", () => {
          const close = marker
            .getPopup()
            ?.getElement()
            ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button");
          if (close) {
            close.title = t("global.close");
            close.setAttribute("aria-label", t("global.close"));
          }
        });
        marker.addTo(layer);
      });
    };

    renderAccommodations();
    return () => {
      disposed = true;
    };
  }, [accommodations, locale, mapReady, showAccommodations, t]);

  useEffect(() => {
    let disposed = false;
    const drawRoute = async () => {
      const map = mapRef.current;
      const layer = routeLayerRef.current;
      if (!map || !layer || disposed) return;
      const L = (await import("leaflet")).default;
      if (disposed) return;
      layer.clearLayers();
      const points = routeOrigin ? [{ ...routeOrigin, id: "origin", name: "Origin" } as Destination, ...routeStops] : routeStops;
      for (let index = 0; index < points.length; index += 1) {
        const stop = points[index];
        if (index > 0) {
          const previous = points[index - 1];
          const modeIndex = routeOrigin ? Math.max(0, index - 2) : index - 1;
          const mode = routeModes[modeIndex] ?? "public_transport";
          const style = routeStyle[mode];
          let coordinates: [number, number][] = [[previous.lat, previous.lng], [stop.lat, stop.lng]];
          try {
            const road = await fetchRoadGeometry(previous, stop, mode);
            if (disposed) return;
            if (road) coordinates = road.coordinates;
          } catch {
            // A direct, dashed fallback keeps the itinerary usable when routing is offline.
          }
          L.polyline(
            coordinates,
            {
              color: style.color,
              weight: 5,
              opacity: 0.88,
              dashArray: coordinates.length === 2 ? (style.dashArray ?? "6 8") : style.dashArray,
              lineCap: "round",
              className: `gemgo-route gemgo-route-${mode}`,
            },
          ).addTo(layer);
        }
        if (!(routeOrigin && index === 0)) L.marker([stop.lat, stop.lng], {
          interactive: false,
          icon: L.divIcon({
            className: "route-number-shell",
            html: `<span class="route-number">${routeOrigin ? index : index + 1}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(layer);
      }
    };
    drawRoute();
    return () => {
      disposed = true;
    };
  }, [mapReady, routeModes, routeOrigin, routeStops]);

  useEffect(() => {
    const mapElement = elementRef.current;
    if (!mapElement || !mapReady) return;
    const zoomIn = mapElement.querySelector<HTMLAnchorElement>(
      ".leaflet-control-zoom-in",
    );
    const zoomOut = mapElement.querySelector<HTMLAnchorElement>(
      ".leaflet-control-zoom-out",
    );
    if (zoomIn) {
      zoomIn.title = t("map.zoomIn");
      zoomIn.setAttribute("aria-label", t("map.zoomIn"));
    }
    if (zoomOut) {
      zoomOut.title = t("map.zoomOut");
      zoomOut.setAttribute("aria-label", t("map.zoomOut"));
    }
  }, [mapReady, t]);

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
        aria-label={t("map.interactiveWithStays", {
          count: destinations.length,
          stays: showAccommodations ? accommodations.length : 0,
        })}
      />
      <div className="map-legend">
        <span><i className="low" />{t("map.legendLow")}</span>
        <span><i className="moderate" />{t("map.legendModerate")}</span>
        <span><i className="busy" />{t("map.legendBusy")}</span>
        <button
          type="button"
          className="accommodation-layer-toggle"
          aria-pressed={showAccommodations}
          onClick={onToggleAccommodations}
        >
          <i className="accommodation" aria-hidden="true">⌂</i>
          <span>{t("stays.mapLayer")}</span>
          <small>{showAccommodations ? t("stays.layerShown") : t("stays.layerHidden")}</small>
        </button>
        <small>{t("map.legendNote", { count: destinations.length })}</small>
      </div>
    </>
  );
}
