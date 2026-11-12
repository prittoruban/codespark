"use client";

import { Badge, DemoTag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Ring } from "@/components/ui/Progress";
import { FARMS } from "@/data/farms";
import type { Farm, HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarDays, Droplets, FlaskConical, Leaf, MapPin, Sparkles, Sprout, Waves, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const STATUS: Record<HealthStatus, { label: string; tone: "success" | "progress" | "alert" }> = {
  healthy: { label: "Healthy", tone: "success" },
  attention: { label: "Needs attention", tone: "progress" },
  critical: { label: "Critical", tone: "alert" },
};

function daysSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function FarmDetail({ farm, onClose }: { farm: Farm; onClose: () => void }) {
  return (
    <Card className="animate-rise overflow-hidden">
      <div className="relative h-48 sm:h-56">
        <Image src={farm.image} alt={`${farm.crop} at ${farm.name}`} fill sizes="(min-width:1280px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <button type="button" onClick={onClose} aria-label="Close field details" className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/85 text-ink hover:bg-white"><X className="size-4" /></button>
        <div className="absolute bottom-4 left-5 text-white">
          <Badge tone={STATUS[farm.status].tone} dot>{STATUS[farm.status].label}</Badge>
          <h2 className="mt-2 font-display text-[24px] font-semibold">{farm.name}</h2>
          <p className="flex items-center gap-1.5 text-[14px] text-white/90"><MapPin className="size-4" />{farm.village}, {farm.district} · {farm.lat.toFixed(2)}°N {farm.lon.toFixed(2)}°E</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-4">
        {[
          [Sprout, "Crop", `${farm.crop} · ${farm.variety}`],
          [CalendarDays, "Sown", `${daysSince(farm.sowingDate)} days ago`],
          [Waves, "Irrigation", farm.irrigation],
          [FlaskConical, "Soil pH", `${farm.soilPh}`],
        ].map(([I, k, v]) => {
          const Icon = I as typeof Sprout;
          return (
            <div key={k as string} className="rounded-[18px] bg-ivory p-3.5 ring-1 ring-line">
              <Icon className="size-[18px] text-olive" aria-hidden />
              <p className="mt-2 text-[12px] text-muted">{k as string}</p>
              <p className="text-[14.5px] font-semibold text-ink">{v as string}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-5">
        <ButtonLink href="/fertilizer" size="sm"><Leaf /> Fertilizer plan</ButtonLink>
        <ButtonLink href={`/krishi-ai?q=${encodeURIComponent(`What should I do for ${farm.name.split(" — ")[0]} ${farm.crop.toLowerCase()} at ${farm.stage.toLowerCase()}?`)}`} size="sm" variant="secondary"><Sparkles /> Ask Krishi AI</ButtonLink>
        <ButtonLink href="/crop-doctor" size="sm" variant="secondary">Scan a leaf</ButtonLink>
        <ButtonLink href="/weather" size="sm" variant="secondary">Weather</ButtonLink>
      </div>
    </Card>
  );
}

export function MyFarms() {
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | HealthStatus>("all");
  const selected = FARMS.find((f) => f.id === params.get("field")) ?? null;
  const list = useMemo(() => FARMS.filter((f) => filter === "all" || f.status === filter), [filter]);
  const totalArea = FARMS.reduce((s, f) => s + f.areaHa, 0);
  const avgHealth = Math.round(FARMS.reduce((s, f) => s + f.health * f.areaHa, 0) / totalArea);

  return (
    <div className="space-y-5">
      <PageHeader title="My Farms" description="Every field at a glance: crop, stage, moisture and health from the latest monitoring pass." actions={<DemoTag label="Demo portfolio" />} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Fields", `${FARMS.length}`, "across 4 districts"],
          ["Total area", `${totalArea.toFixed(1)} ha`, "under monitoring"],
          ["Avg. crop health", `${avgHealth}%`, "area-weighted"],
          ["Need action", `${FARMS.filter((f) => f.status !== "healthy").length}`, "fields flagged"],
        ].map(([k, v, s]) => (
          <Card as="div" key={k} className="p-4 sm:p-5">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="mt-1 font-display text-[30px] font-bold leading-none tracking-[-0.02em] text-ink">{v}</dd>
            <dd className="mt-1.5 text-[12px] text-muted">{s}</dd>
          </Card>
        ))}
      </dl>

      {selected && <FarmDetail farm={selected} onClose={() => router.push("/farms", { scroll: false })} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Fields</h2>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented label="Filter by status" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "healthy", label: "Healthy" }, { value: "attention", label: "Attention" }, { value: "critical", label: "Critical" }]} />
        </div>
      </div>

      <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {list.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => router.push(`/farms?field=${f.id}`, { scroll: false })} className={cn("group block h-full w-full overflow-hidden rounded-[24px] border bg-card text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float", selected?.id === f.id ? "border-olive ring-2 ring-olive/20" : "border-line")}>
              <div className="relative h-44">
                <Image src={f.image} alt="" fill sizes="(min-width:1536px) 25vw, (min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="absolute left-4 top-4"><Badge tone={STATUS[f.status].tone} dot>{STATUS[f.status].label}</Badge></span>
                <p className="absolute bottom-3 left-4 text-[13px] font-medium text-white">{f.crop} · {f.stage}</p>
              </div>
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-display text-[17px] font-semibold leading-tight text-ink">{f.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-muted"><MapPin className="size-3.5" />{f.village}, {f.state}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/80">
                    <span>{f.areaHa} ha</span>
                    <span className={cn("flex items-center gap-1", f.moisture < 22 && "font-medium text-alert")}><Droplets className="size-3.5" />{f.moisture}%</span>
                    <span>pH {f.soilPh}</span>
                  </div>
                </div>
                <Ring value={f.health} size={58} stroke={6} tone={f.status === "healthy" ? "olive" : f.status === "attention" ? "amber" : "alert"}>
                  <span className="text-[13px] font-bold text-ink">{f.health}</span>
                </Ring>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
