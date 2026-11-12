import type { WeatherCondition } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Illustrated condition icons in the reference style (golden sun, soft white cloud). */
export function WeatherIcon({ condition, className }: { condition: WeatherCondition; className?: string }) {
  const sun = (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const p = (v: number) => v.toFixed(2);
        return <line key={i} x1={p(24 + Math.cos(a) * 15)} y1={p(22 + Math.sin(a) * 15)} x2={p(24 + Math.cos(a) * 19)} y2={p(22 + Math.sin(a) * 19)} stroke="#f2b233" strokeWidth="2.6" strokeLinecap="round" />;
      })}
      <circle cx="24" cy="22" r="11" fill="url(#wi-sun)" />
    </g>
  );
  const cloud = (dx = 0, dy = 0, tone = "#ffffff") => (
    <path transform={`translate(${dx} ${dy})`} d="M20 50h26a10 10 0 0 0 0-20 13 13 0 0 0-25-3 9 9 0 0 0-1 23Z" fill={tone} stroke="#e9dccb" strokeWidth="1" />
  );
  return (
    <svg viewBox="0 0 64 64" className={cn("size-14", className)} aria-hidden>
      <defs>
        <radialGradient id="wi-sun" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#ffd978" />
          <stop offset="1" stopColor="#f0a92a" />
        </radialGradient>
      </defs>
      {condition === "sunny" && <g transform="translate(8 10)">{sun}</g>}
      {condition === "partly-cloudy" && (
        <>
          {sun}
          {cloud(2, 0)}
        </>
      )}
      {condition === "cloudy" && (
        <>
          {cloud(-8, -10, "#f3ede4")}
          {cloud(2, 0)}
        </>
      )}
      {(condition === "rain" || condition === "storm") && (
        <>
          {cloud(0, -8, condition === "storm" ? "#e6e0d6" : "#ffffff")}
          {[22, 32, 42].map((x) => (
            <line key={x} x1={x} y1="48" x2={x - 3} y2="57" stroke="#7a9a22" strokeWidth="2.4" strokeLinecap="round" />
          ))}
          {condition === "storm" && <path d="M34 42l-5 9h5l-3 8 8-11h-5l3-6Z" fill="#e9a52a" />}
        </>
      )}
    </svg>
  );
}

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  rain: "Light Rain",
  storm: "Thunderstorm",
};

/** Decorative wheat stalks used on the weather card (as in the reference). */
export function WheatStalks({ className }: { className?: string }) {
  const grain = (x: number, y: number, r: number, k: string) => <ellipse key={k} cx={x} cy={y} rx="3.4" ry="7" transform={`rotate(${r} ${x} ${y})`} fill="url(#ws-g)" />;
  const stalk = (ox: number, rot: number, k: number) => (
    <g key={k} transform={`translate(${ox} 0) rotate(${rot} 30 120)`}>
      <path d="M30 120C30 90 31 60 33 26" stroke="#d8a647" strokeWidth="2" fill="none" />
      {Array.from({ length: 7 }, (_, i) => [grain(27, 30 + i * 9, -28, `l${i}`), grain(37, 28 + i * 9, 28, `r${i}`)])}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`a${i}`} x1={33} y1={26 + i * 9} x2={22 + (i % 2) * 22} y2={10 + i * 8} stroke="#e7bf6a" strokeWidth=".8" />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 110 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="ws-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d27f" />
          <stop offset="1" stopColor="#d18f2a" />
        </linearGradient>
      </defs>
      {stalk(10, -14, 0)}
      {stalk(32, 4, 1)}
      {stalk(52, 18, 2)}
    </svg>
  );
}
