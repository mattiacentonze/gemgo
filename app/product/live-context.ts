"use client";

import { useEffect, useState } from "react";
import { fetchRoadGeometry, geocodePlace } from "../lib/geo";
import type { Experience, TransportMode } from "./types";
import type { OriginPoint, WeatherContext } from "./recommendation-engine";

const routeMode = (transport: TransportMode) => {
  if (transport === "car") return "driving";
  if (transport === "bicycle") return "cycling";
  if (transport === "walking") return "walking";
  if (transport === "mixed") return "walking";
  return "public_transport";
};

export const useOriginPoint = (query: string) => {
  const [origin, setOrigin] = useState<OriginPoint | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "error">("idle");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      queueMicrotask(() => {
        setOrigin(null);
        setStatus("idle");
      });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      geocodePlace(trimmed, controller.signal)
        .then((result: { label: string; lat: number; lng: number } | null) => {
          if (!result) {
            setOrigin(null);
            setStatus("not-found");
            return;
          }
          setOrigin(result);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          setOrigin(null);
          setStatus("error");
        });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { origin, status };
};

export const useLiveWeather = (origin: OriginPoint | null, startsAt?: string) => {
  const [weather, setWeather] = useState<WeatherContext>({ source: "unavailable" });

  useEffect(() => {
    if (!origin) {
      queueMicrotask(() => setWeather({ source: "unavailable" }));
      return;
    }
    const controller = new AbortController();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(origin.lat));
    url.searchParams.set("longitude", String(origin.lng));
    url.searchParams.set("current", "temperature_2m,weather_code,precipitation_probability");
    url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", "auto");
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("weather-unavailable");
        return response.json();
      })
      .then((payload) => {
        const weatherPayload = payload as {
          current?: {
            temperature_2m?: number;
            precipitation_probability?: number;
            weather_code?: number;
          };
          hourly?: {
            time?: string[];
            temperature_2m?: number[];
            precipitation_probability?: number[];
            weather_code?: number[];
          };
        };
        const current = weatherPayload.current;
        const hourly = weatherPayload.hourly;
        const requested = startsAt ? Date.parse(startsAt) : Number.NaN;
        const forecastIndex = Number.isFinite(requested)
          ? (hourly?.time ?? []).findIndex((time) => Math.abs(Date.parse(time) - requested) <= 30 * 60 * 1000)
          : -1;
        if (forecastIndex >= 0 && hourly) {
          setWeather({
            temperature: Number(hourly.temperature_2m?.[forecastIndex]),
            precipitationProbability: Number(hourly.precipitation_probability?.[forecastIndex]),
            weatherCode: Number(hourly.weather_code?.[forecastIndex]),
            source: "forecast",
          });
          return;
        }
        setWeather({
          temperature: Number(current?.temperature_2m),
          precipitationProbability: Number(current?.precipitation_probability),
          weatherCode: Number(current?.weather_code),
          source: "live",
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setWeather({ source: "unavailable" });
      });
    return () => controller.abort();
  }, [origin, startsAt]);

  return weather;
};

export const useRoadTimes = (
  origin: OriginPoint | null,
  experiences: Experience[],
  transport: TransportMode,
) => {
  const [routeTimes, setRouteTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!origin || transport === "public" || experiences.length === 0) {
      queueMicrotask(() =>
        setRouteTimes((current) =>
          Object.keys(current).length === 0 ? current : {},
        ),
      );
      return;
    }
    const controller = new AbortController();
    const mode = routeMode(transport);
    Promise.all(
      experiences.slice(0, 3).map(async (experience) => {
        try {
          const route = await fetchRoadGeometry(
            { lat: origin.lat, lng: origin.lng },
            { lat: experience.latitude, lng: experience.longitude },
            mode,
            controller.signal,
          );
          return [experience.id, route?.durationMinutes ? Math.round(route.durationMinutes) : null] as const;
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") return [experience.id, null] as const;
          return [experience.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (controller.signal.aborted) return;
      setRouteTimes(
        Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry[1] !== null)),
      );
    });
    return () => controller.abort();
  }, [experiences, origin, transport]);

  return routeTimes;
};

export const useSelectedRoute = (
  origin: OriginPoint | null,
  experience: Experience | null,
  transport: TransportMode,
) => {
  const [coordinates, setCoordinates] = useState<Array<[number, number]>>([]);

  useEffect(() => {
    if (!origin || !experience || transport === "public") {
      queueMicrotask(() =>
        setCoordinates((current) => (current.length === 0 ? current : [])),
      );
      return;
    }
    const controller = new AbortController();
    fetchRoadGeometry(
      { lat: origin.lat, lng: origin.lng },
      { lat: experience.latitude, lng: experience.longitude },
      routeMode(transport),
      controller.signal,
    )
      .then((route: { coordinates?: Array<[number, number]> } | null) => {
        setCoordinates(route?.coordinates ?? []);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setCoordinates([]);
      });
    return () => controller.abort();
  }, [experience, origin, transport]);

  return coordinates;
};
