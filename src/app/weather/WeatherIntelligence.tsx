"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CONDITION_LABEL, WeatherIcon, WheatStalks } from "@/components/weather/WeatherIcon";
import { Badge, DemoTag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useWeather } from "@/lib/hooks";
import type { FieldAdvisory, ForecastDay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WEATHER_LOCATIONS } from "@/services";
import { CalendarCheck2, CloudRain, Droplets, Gauge, Leaf, RefreshCw, SprayCan, Sun, Thermometer, Waves, Wind } from "lucide-react";
import { useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ADVISORY_ICON = { irrigation: Waves, fertilizer: Leaf, spray: SprayCan, harvest: Sun } as const;

function dayLabel(iso: string, i: number) {
  if (i === 0) return "Today";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}

function fertWindow(d: ForecastDay): { ok: boolean; reason: string } {
  if (d.rainMm > 10) return { ok: false, reason: `${d.rainMm} mm rain` };
  if (d.windKmh > 15) return { ok: false, reason: `Wind ${d.windKmh} km/h` };
  if (d.rainChance > 60) return { ok: false, reason: `${d.rainChance}% rain chance` };
  return { ok: true, reason: d.rainMm > 2 ? "Light rain helps incorporation" : "Dry, calm" };
}

function AdvisoryItem({ a }: { a: FieldAdvisory }) {
  const Icon = ADVISORY_ICON[a.kind];
  return (
    <li className={cn("flex gap-3 rounded-[18px] p-3.5", a.severity === "alert" ? "bg-alert-soft/70" : a.severity === "caution" ? "bg-champagne" : "bg-sage-50")}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-card", a.severity === "alert" ? "text-alert" : a.severity === "caution" ? "text-[#a86b00]" : "text-olive")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-ink">{a.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink/75">{a.detail}</p>
        {a.window && <p className="mt-1 text-[12.5px] font-medium text-olive-deep">{a.window}</p>}
      </div>
    </li>
  );
}

export function WeatherIntelligence() {
  const [loc, setLoc] = useState("chennai");
  const { data, loading, error, refresh } = useWeather(loc);
  const c = data?.current;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="live" dot>Real-time weather</Badge>}
        title="Weather Intelligence"
        description="Hyperlocal conditions and forecasts, turned into irrigation, spraying and fertilizer-timing advice."
        actions={
          <>
            <div className="w-[190px]">
              <label htmlFor="loc" className="sr-only">Location</label>
              <Select id="loc" value={loc} onChange={(e) => setLoc(e.target.value)} className="h-11 rounded-full bg-card">
                {WEATHER_LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>
            <Button variant="secondary" onClick={refresh} loading={loading} aria-label="Refresh weather">
              {!loading && <RefreshCw />} Refresh
            </Button>
          </>
        }
      />

      {error && (
        <Card className="flex items-center justify-between gap-3 border-alert-soft p-4 text-[14px] text-alert">
          Couldn&apos;t load weather: {error}
          <Button size="sm" variant="secondary" onClick={refresh}>Retry</Button>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Current conditions" className={cn("relative overflow-hidden rounded-[24px] border border-peach/70 bg-gradient-to-br from-[#fff1d9] via-[#ffe6c2] to-[#ffdcae] p-5 shadow-card sm:p-7", loading && "opacity-70")}>
          <WheatStalks className="pointer-events-none absolute -right-2 top-6 h-[55%] w-[150px] opacity-80" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-medium text-ink/80">{c?.location ?? "—"}</p>
            <div className="flex items-center gap-2">
              {data?.source === "simulated" ? <DemoTag label="Simulated feed" className="bg-white/50" /> : <Badge tone="success">Open-Meteo live</Badge>}
              <span className="text-[12px] text-ink/60" suppressHydrationWarning>{c ? `Updated ${new Date(c.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
            </div>
          </div>
          <div className="relative mt-4 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              {c && <WeatherIcon condition={c.condition} className="size-20 sm:size-24" />}
              <div>
                <p className="font-display text-[56px] font-bold leading-none tracking-[-0.04em] text-ink sm:text-[64px]">
                  {c?.temp ?? "--"}<span className="align-top text-[30px] font-semibold">°C</span>
                </p>
                <p className="mt-1 text-[15px] text-ink/80">{c ? `${CONDITION_LABEL[c.condition]} · feels like ${c.feelsLike}°C` : "Loading…"}</p>
              </div>
            </div>
            <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-4 rounded-[20px] bg-white/45 p-4 text-[14px] sm:grid-cols-3 2xl:grid-cols-6">
              {[
                [Droplets, "Humidity", c ? `${c.humidity}%` : "—"],
                [Wind, "Wind", c ? `${c.windKmh} km/h ${c.windDir}` : "—"],
                [CloudRain, "Rain today", c ? `${c.rainMm} mm` : "—"],
                [Sun, "UV index", c ? `${c.uv}` : "—"],
                [Gauge, "Pressure", c ? `${c.pressure} hPa` : "—"],
                [Thermometer, "Range", data ? `${data.daily[0].min}° / ${data.daily[0].max}°` : "—"],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Sun;
                return (
                  <div key={k as string} className="flex items-center gap-2.5">
                    <I className="size-[18px] text-ink/70" aria-hidden />
                    <div>
                      <dt className="text-[12px] text-ink/60">{k as string}</dt>
                      <dd className="font-semibold text-ink">{v as string}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>

        <Card className="p-5 sm:p-6">
          <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Field advisories" subtitle="Generated from the forecast for your crops" />
          <ul className="mt-4 space-y-2.5">{data?.advisories.map((a) => <AdvisoryItem key={a.id} a={a} />)}</ul>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader icon={<Sun strokeWidth={1.7} />} title="7-day forecast" />
        <ul className="no-scrollbar -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-7">
          {data?.daily.map((d, i) => (
            <li key={d.date} className={cn("min-w-[118px] rounded-[20px] p-3.5 text-center ring-1", i === 0 ? "bg-champagne ring-peach" : "bg-ivory ring-line")}>
              <p className="text-[13.5px] font-semibold text-ink">{dayLabel(d.date, i)}</p>
              <p className="text-[11.5px] text-muted">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              <WeatherIcon condition={d.condition} className="mx-auto my-1.5 size-12" />
              <p className="font-display text-[18px] font-bold text-ink">{d.max}° <span className="text-[14px] font-medium text-muted">{d.min}°</span></p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[12px] text-olive-deep"><Droplets className="size-3" aria-hidden />{d.rainChance}% · {d.rainMm} mm</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardHeader icon={<Thermometer strokeWidth={1.7} />} title="Next 24 hours" subtitle="Temperature and chance of rain" />
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.hourly ?? []} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="wx-t" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={CHART.amber} stopOpacity={0.3} />
                    <stop offset="1" stopColor={CHART.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="time" {...axisProps} interval={3} />
                <YAxis yAxisId="t" {...axisProps} tickFormatter={(v) => `${v}°`} domain={["dataMin - 2", "dataMax + 2"]} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} hide />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                <Bar yAxisId="r" dataKey="rainChance" name="Rain chance (%)" fill={CHART.sageLight} radius={[6, 6, 0, 0]} barSize={10} />
                <Area yAxisId="t" type="monotone" dataKey="temp" name="Temperature (°C)" stroke={CHART.amber} strokeWidth={3} fill="url(#wx-t)" />
                <Line yAxisId="r" type="monotone" dataKey="humidity" name="Humidity (%)" stroke={CHART.deep} strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader icon={<CloudRain strokeWidth={1.7} />} title="Rainfall outlook" subtitle="Expected millimetres per day" />
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.daily ?? []).map((d, i) => ({ ...d, label: dayLabel(d.date, i) }))} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `${v}`} />
                <Tooltip content={<ChartTooltip unit=" mm" />} cursor={{ fill: "rgba(237,226,210,.35)" }} />
                <Bar dataKey="rainMm" name="Rainfall" fill={CHART.olive} radius={[8, 8, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader icon={<CalendarCheck2 strokeWidth={1.7} />} title="Fertilizer application windows" subtitle="Top-dressing is safe with under 10 mm rain, wind under 15 km/h and rain chance under 60%" />
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {data?.daily.map((d, i) => {
            const w = fertWindow(d);
            return (
              <li key={d.date} className={cn("rounded-[18px] p-3 ring-1", w.ok ? "bg-sage-50 ring-sage-100" : "bg-card ring-line")}>
                <p className="text-[13px] font-semibold text-ink">{dayLabel(d.date, i)}</p>
                <Badge tone={w.ok ? "success" : "alert"} className="mt-1.5">{w.ok ? "Good window" : "Avoid"}</Badge>
                <p className="mt-1.5 text-[12px] text-muted">{w.reason}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
