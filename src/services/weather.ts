import type { FieldAdvisory, ForecastDay, HourlyPoint, WeatherBundle, WeatherCondition } from "@/lib/types";
import { hashString, round, seeded, sleep } from "@/lib/utils";

/**
 * Weather service.
 * - `simulated` (default): deterministic, seasonally plausible data per location.
 * - `open-meteo`: set NEXT_PUBLIC_WEATHER_PROVIDER=open-meteo to fetch live data
 *   from api.open-meteo.com (no key required). Advisories are derived either way.
 */
export interface WeatherService {
  getWeather(location: WeatherLocation): Promise<WeatherBundle>;
}

export interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const WEATHER_LOCATIONS: WeatherLocation[] = [
  { id: "chennai", name: "Chennai, TN", lat: 13.08, lon: 80.27 },
  { id: "coimbatore", name: "Coimbatore, TN", lat: 11.02, lon: 76.96 },
  { id: "madurai", name: "Madurai, TN", lat: 9.93, lon: 78.12 },
  { id: "ludhiana", name: "Ludhiana, PB", lat: 30.9, lon: 75.85 },
  { id: "nashik", name: "Nashik, MH", lat: 20.0, lon: 73.79 },
];

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function deriveAdvisories(daily: ForecastDay[], humidity: number, windKmh: number): FieldAdvisory[] {
  const advisories: FieldAdvisory[] = [];
  const next48Rain = daily.slice(0, 2).reduce((s, d) => s + d.rainMm, 0);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const dryDay = daily.find((d, i) => i > 0 && d.rainChance < 30 && d.windKmh < 15);

  if (next48Rain > 20) {
    advisories.push({
      id: "fert-hold",
      kind: "fertilizer",
      title: "Hold nitrogen top-dressing",
      detail: `${round(next48Rain)} mm of rain is expected in the next 48 h. Urea applied now is likely to leach. Wait until it has passed.`,
      severity: "alert",
      window: dryDay ? `Next window: ${fmt(dryDay.date)}` : undefined,
    });
  } else {
    advisories.push({
      id: "fert-go",
      kind: "fertilizer",
      title: "Good window for top-dressing",
      detail: `Only ${round(next48Rain, 1)} mm of rain is expected in the next 48 h. Apply split nitrogen into moist soil in the early morning.`,
      severity: "info",
      window: `Best: ${fmt(daily[0].date)}, 6–9 AM`,
    });
  }

  const weekRain = daily.reduce((s, d) => s + d.rainMm, 0);
  advisories.push(
    weekRain < 10
      ? {
          id: "irr",
          kind: "irrigation",
          title: "Irrigation needed this week",
          detail: `Only ${round(weekRain, 1)} mm of rain is forecast over 7 days. Schedule irrigation for crops at critical stages within 3 days.`,
          severity: "caution",
        }
      : {
          id: "irr",
          kind: "irrigation",
          title: "Reduce irrigation",
          detail: `${round(weekRain)} mm of rain is forecast over 7 days. Skip the next scheduled irrigation and check field drainage.`,
          severity: "info",
        },
  );

  if (humidity > 80) {
    advisories.push({
      id: "disease",
      kind: "spray",
      title: "High fungal disease risk",
      detail: `Humidity is ${humidity}%. Scout for rust, blast and leaf spot. Spray preventive fungicide only if symptoms appear.`,
      severity: "caution",
    });
  }
  advisories.push(
    windKmh > 15
      ? { id: "spray", kind: "spray", title: "Avoid spraying today", detail: `Wind is ${windKmh} km/h, which is above the 15 km/h drift limit. Spray at dawn tomorrow instead.`, severity: "caution" }
      : { id: "spray", kind: "spray", title: "Spraying conditions suitable", detail: `Wind is ${windKmh} km/h. Spray before 10 AM to limit evaporation losses.`, severity: "info" },
  );
  return advisories;
}

function conditionFor(rainChance: number, cloud: number): WeatherCondition {
  if (rainChance > 75) return "storm";
  if (rainChance > 50) return "rain";
  if (cloud > 0.7) return "cloudy";
  if (cloud > 0.35) return "partly-cloudy";
  return "sunny";
}

export const simulatedWeatherService: WeatherService = {
  async getWeather(loc) {
    await sleep(450);
    const today = new Date();
    const dayKey = today.toISOString().slice(0, 10);
    const rand = seeded(hashString(loc.id + dayKey));
    // Latitude-based seasonal baseline for November.
    const base = loc.lat > 25 ? 21 : loc.lat > 15 ? 26 : 27;

    const daily: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const rainChance = Math.round(rand() * (loc.lat < 15 ? 85 : 40));
      const rainMm = rainChance > 45 ? round(rand() * 22 + 2, 1) : round(rand() * 1.5, 1);
      const max = round(base + 2 + rand() * 4 - (rainChance > 60 ? 3 : 0));
      return {
        date: d.toISOString(),
        min: round(max - 7 - rand() * 3),
        max,
        condition: conditionFor(rainChance, rand()),
        rainChance,
        rainMm,
        humidity: Math.round(55 + rand() * 30 + (rainChance > 50 ? 10 : 0)),
        windKmh: Math.round(4 + rand() * 16),
      };
    });

    const hourNow = today.getHours();
    const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, i) => {
      const h = (hourNow + i) % 24;
      const diurnal = Math.sin(((h - 8) / 24) * Math.PI * 2);
      return {
        time: `${String(h).padStart(2, "0")}:00`,
        temp: round(daily[0].min + (daily[0].max - daily[0].min) * (0.5 + diurnal / 2)),
        rainChance: Math.max(0, Math.round(daily[i < 12 ? 0 : 1].rainChance + (rand() - 0.5) * 20)),
        humidity: Math.round(daily[0].humidity + -diurnal * 12),
      };
    });

    const humidity = hourly[0].humidity;
    const windKmh = daily[0].windKmh;
    return {
      current: {
        location: loc.name,
        temp: hourly[0].temp,
        feelsLike: round(hourly[0].temp + (humidity > 70 ? 3 : 1)),
        condition: daily[0].condition,
        humidity,
        windKmh,
        windDir: DIRS[Math.floor(rand() * DIRS.length)],
        rainMm: daily[0].rainMm,
        uv: Math.round(5 + rand() * 5),
        pressure: Math.round(1006 + rand() * 8),
        updatedAt: today.toISOString(),
      },
      hourly,
      daily,
      advisories: deriveAdvisories(daily, humidity, windKmh),
      source: "simulated",
    };
  },
};

const WMO = (code: number): WeatherCondition =>
  code >= 95 ? "storm" : code >= 51 ? "rain" : code >= 3 ? "cloudy" : code >= 1 ? "partly-cloudy" : "sunny";

export const openMeteoWeatherService: WeatherService = {
  async getWeather(loc) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code,surface_pressure,uv_index` +
      `&hourly=temperature_2m,precipitation_probability,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,relative_humidity_2m_mean&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const j = await res.json();
    const c = j.current;
    const daily: ForecastDay[] = j.daily.time.map((t: string, i: number) => ({
      date: new Date(t).toISOString(),
      min: Math.round(j.daily.temperature_2m_min[i]),
      max: Math.round(j.daily.temperature_2m_max[i]),
      condition: WMO(j.daily.weather_code[i]),
      rainChance: j.daily.precipitation_probability_max[i] ?? 0,
      rainMm: j.daily.precipitation_sum[i] ?? 0,
      humidity: Math.round(j.daily.relative_humidity_2m_mean?.[i] ?? c.relative_humidity_2m),
      windKmh: Math.round(j.daily.wind_speed_10m_max[i]),
    }));
    const start = Math.max(0, j.hourly.time.findIndex((t: string) => new Date(t) >= new Date()));
    const hourly: HourlyPoint[] = j.hourly.time.slice(start, start + 24).map((t: string, k: number) => ({
      time: t.slice(11, 16),
      temp: Math.round(j.hourly.temperature_2m[start + k]),
      rainChance: j.hourly.precipitation_probability[start + k] ?? 0,
      humidity: j.hourly.relative_humidity_2m[start + k],
    }));
    const windKmh = Math.round(c.wind_speed_10m);
    return {
      current: {
        location: loc.name,
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        condition: WMO(c.weather_code),
        humidity: c.relative_humidity_2m,
        windKmh,
        windDir: DIRS[Math.round(c.wind_direction_10m / 45) % 8],
        rainMm: c.precipitation,
        uv: Math.round(c.uv_index ?? 0),
        pressure: Math.round(c.surface_pressure),
        updatedAt: new Date().toISOString(),
      },
      hourly,
      daily,
      advisories: deriveAdvisories(daily, c.relative_humidity_2m, windKmh),
      source: "open-meteo",
    };
  },
};
