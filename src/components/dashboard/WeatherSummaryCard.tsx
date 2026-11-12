"use client";

import { CONDITION_LABEL, WeatherIcon, WheatStalks } from "@/components/weather/WeatherIcon";
import { useWeather } from "@/lib/hooks";
import { Droplet, MapPin, Wind } from "lucide-react";
import Link from "next/link";

export function WeatherSummaryCard() {
  const { data, loading } = useWeather("chennai");
  const c = data?.current;
  return (
    <Link
      href="/weather"
      aria-label="Open Weather Intelligence"
      className="group relative block overflow-hidden rounded-[24px] border border-peach/70 bg-gradient-to-br from-[#fff1d9] via-[#ffe6c2] to-[#ffdcae] p-5 shadow-card transition-shadow hover:shadow-float sm:p-6"
    >
      <WheatStalks className="pointer-events-none absolute hidden sm:block -right-2 -top-1 h-[125%] w-[110px] opacity-95" />
      <div className="relative flex items-center gap-4 sm:gap-5 sm:pr-20">
        <div className="flex items-center gap-2">
          {c ? <WeatherIcon condition={c.condition} className="size-14 sm:size-16" /> : <span className="size-14 animate-pulse rounded-full bg-white/50" />}
          <div>
            <p className="font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[42px]">
              {loading || !c ? "--" : c.temp}
              <span className="align-top text-[26px] font-semibold">°C</span>
            </p>
            <p className="mt-1.5 text-[14.5px] text-ink/80">{c ? CONDITION_LABEL[c.condition] : "Loading…"}</p>
          </div>
        </div>
        <div className="hidden h-16 w-px bg-ink/10 sm:block" />
        <ul className="space-y-1.5 whitespace-nowrap text-[14px] text-ink/85">
          <li className="flex items-center gap-2.5">
            <MapPin className="size-4 text-ink/80" aria-hidden />
            {c?.location ?? "—"}
          </li>
          <li className="flex items-center gap-2.5">
            <Wind className="size-4 text-ink/80" aria-hidden />
            {c ? `${c.windKmh} km/h` : "—"}
          </li>
          <li className="flex items-center gap-2.5">
            <Droplet className="size-4 text-ink/80" aria-hidden />
            {c ? `${c.humidity}% Humidity` : "—"}
          </li>
        </ul>
      </div>
    </Link>
  );
}
