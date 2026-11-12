"use client";

import { weatherService, WEATHER_LOCATIONS } from "@/services";
import type { WeatherBundle } from "./types";
import { useCallback, useEffect, useState } from "react";

export function useWeather(locationId = "chennai") {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = WEATHER_LOCATIONS.find((l) => l.id === locationId) ?? WEATHER_LOCATIONS[0];
      setData(await weatherService.getWeather(loc));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weather");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

/** Avoids hydration mismatch for time-dependent text (greeting, dates). */
export function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
