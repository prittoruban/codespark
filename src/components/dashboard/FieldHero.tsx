"use client";

import { FARMS } from "@/data/farms";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Droplet, FlaskConical, Leaf, ScanLine, Sprout, Thermometer, Waves } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";

interface Readings {
  height: number;
  nitrate: number;
  canopyTemp: number;
  growth: number;
  moisture: number;
  ph: number;
}

const BASE: Record<string, Readings> = {
  "field-a": { height: 14, nitrate: 820, canopyTemp: 32, growth: 56, moisture: 31, ph: 6.4 },
  "field-b": { height: 68, nitrate: 640, canopyTemp: 30, growth: 71, moisture: 44, ph: 7.1 },
  "field-c": { height: 52, nitrate: 710, canopyTemp: 31, growth: 48, moisture: 27, ph: 6.8 },
  "field-d": { height: 22, nitrate: 410, canopyTemp: 34, growth: 39, moisture: 18, ph: 5.6 },
};

function Chip({ icon, children, label }: { icon: ReactNode; children: ReactNode; label: string }) {
  return (
    <span title={label} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/10 px-3.5 text-[14.5px] font-medium text-white backdrop-blur-[2px] sm:h-10 sm:text-[16px] [&_svg]:size-[17px]">
      {icon}
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}

function MetricPill({ icon, tone, children, className }: { icon: ReactNode; tone: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("absolute hidden items-center gap-2.5 rounded-full border border-white/50 bg-[#6b5a2a]/45 py-1 pl-1 pr-4 text-[15px] font-medium text-white shadow-lg backdrop-blur-md sm:inline-flex", className)}>
      <span className={cn("flex size-8 items-center justify-center rounded-full text-white [&_svg]:size-4", tone)}>{icon}</span>
      {children}
    </span>
  );
}

export function FieldHero() {
  const { toast } = useAppState();
  const [idx, setIdx] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [readings, setReadings] = useState<Record<string, Readings>>(BASE);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const farm = FARMS[idx];
  const r = readings[farm.id];

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      setReadings((prev) => ({
        ...prev,
        [farm.id]: { ...prev[farm.id], growth: Math.min(99, prev[farm.id].growth + 1), canopyTemp: prev[farm.id].canopyTemp + (Math.random() > 0.5 ? 0 : -1) },
      }));
      setScanning(false);
      setLastScan(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      toast({
        title: `${farm.name.split(" — ")[0]} scan complete`,
        body: farm.status === "healthy" ? "No stress hotspots detected. Canopy is developing on schedule." : farm.status === "attention" ? "Two patches with mild stress were flagged for scouting." : "Moisture stress detected across 38% of the plot. Irrigate soon.",
        tone: farm.status === "critical" ? "alert" : "success",
      });
    }, 3200);
  };

  const move = (d: number) => setIdx((i) => (i + d + FARMS.length) % FARMS.length);

  return (
    <section aria-label="Live field monitoring" className="relative isolate overflow-hidden rounded-[28px] border border-white/70 shadow-card">
      <Image key={farm.image} src={farm.image} alt={`${farm.crop} at ${farm.name}`} fill priority sizes="(min-width: 1280px) 60vw, 100vw" className="animate-rise -z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#2b1d05]/55 via-[#2b1d05]/10 to-[#2b1d05]/45" />

      <div className="flex min-h-[440px] flex-col p-5 sm:min-h-[500px] sm:p-7 xl:min-h-[488px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8d27a]/60 bg-[#2f3f0c]/80 px-3 py-1 text-[14px] font-medium text-white">
              <span className="size-2 animate-pulse rounded-full bg-wheat" aria-hidden />
              Live
            </span>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.01em] text-white drop-shadow-sm sm:text-[38px]">{farm.crop} Field Monitoring</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 text-[15px] text-white/90 sm:text-[17px]">
              <span>{farm.name.split(" — ")[0]}</span>
              <span aria-hidden>•</span>
              <span>{farm.areaHa} ha</span>
              <span aria-hidden>•</span>
              <span>{farm.stage} Stage</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => move(-1)} aria-label="Previous field" className="flex size-9 items-center justify-center rounded-full border border-white/50 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Next field" className="flex size-9 items-center justify-center rounded-full border border-white/50 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Chip icon={<Sprout />} label="Plant height">{r.height} cm</Chip>
          <Chip icon={<Droplet />} label="Soil nitrate">{r.nitrate} ppm</Chip>
          <Chip icon={<Thermometer />} label="Canopy temperature">{r.canopyTemp}°C</Chip>
        </div>

        {/* Scanning reticle */}
        <div className="pointer-events-none relative mx-auto my-4 flex flex-1 items-center justify-center" aria-hidden>
          <div className="relative size-[170px] sm:size-[200px]">
            <span className="absolute -inset-6">
              {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
                <span key={c} className={cn("absolute size-7 border-white/85", c)} />
              ))}
            </span>
            <svg viewBox="0 0 200 200" className={cn("absolute inset-0", scanning ? "animate-[spin-slow_4s_linear_infinite]" : "animate-spin-slow")}>
              {Array.from({ length: 72 }, (_, i) => {
                const a = (i * 5 * Math.PI) / 180;
                const long = i % 6 === 0;
                const p = (v: number) => v.toFixed(2);
                return <line key={i} x1={p(100 + Math.cos(a) * (long ? 86 : 89))} y1={p(100 + Math.sin(a) * (long ? 86 : 89))} x2={p(100 + Math.cos(a) * 96)} y2={p(100 + Math.sin(a) * 96)} stroke="white" strokeOpacity={long ? 0.95 : 0.7} strokeWidth={long ? 1.6 : 1} />;
              })}
            </svg>
            <span className="absolute inset-[13%] rounded-full border-2 border-white/90" />
            {scanning && (
              <span className="absolute inset-[13%] overflow-hidden rounded-full">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scan-line_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent to-wheat/60" />
              </span>
            )}
          </div>
        </div>

        <MetricPill icon={<Leaf />} tone="bg-olive" className="right-[8%] top-[40%] xl:right-[12%]">Growth: {r.growth}%</MetricPill>
        <MetricPill icon={<Waves />} tone="bg-[#2f8f83]" className="left-[8%] top-[60%] xl:left-[12%]">Moisture: {r.moisture}%</MetricPill>
        <MetricPill icon={<FlaskConical />} tone="bg-[#a2541f]" className="bottom-[22%] right-[8%] xl:right-[12%]">Soil pH: {r.ph}</MetricPill>

        {/* Mobile metric row (pills are absolutely positioned on larger screens) */}
        <div className="mb-3 grid grid-cols-3 gap-2 sm:hidden">
          {[
            ["Growth", `${r.growth}%`],
            ["Moisture", `${r.moisture}%`],
            ["Soil pH", `${r.ph}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/40 bg-black/25 px-3 py-2 text-white backdrop-blur">
              <p className="text-[11px] text-white/80">{k}</p>
              <p className="text-[17px] font-semibold">{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className="inline-flex h-12 w-full max-w-[320px] items-center justify-center gap-2.5 rounded-full border border-white/60 bg-[#5c4d1d]/40 text-[16.5px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-[#5c4d1d]/60 disabled:cursor-progress"
          >
            <ScanLine className={cn("size-5", scanning && "animate-pulse")} aria-hidden />
            {scanning ? "Scanning Field…" : "Scan Field"}
          </button>
          <p className="text-[12px] text-white/80" aria-live="polite">{scanning ? "Capturing multispectral imagery…" : lastScan ? `Last scan ${lastScan}` : "Drone + sensor fusion · demo feed"}</p>
        </div>
      </div>
    </section>
  );
}
