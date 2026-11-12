"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ArrowRight, CloudRain, Package, Sparkles, Waves } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const RECS = [
  { id: "r1", icon: Package, title: "Apply 40 kg/ha of NPK (20-20-0)", detail: "Nitrogen levels are low in Section B3. Apply within 3 days.", href: "/fertilizer", tone: "bg-sage-50 border-sage-100" },
  { id: "r2", icon: Waves, title: "Irrigate Field D within 24 h", detail: "Soil moisture at 18% during pegging. Pod set is at risk.", href: "/weather", tone: "bg-alert-soft/70 border-alert-soft" },
  { id: "r3", icon: CloudRain, title: "Drain Field B for 3 days", detail: "High humidity and standing water favour brown planthopper.", href: "/krishi-ai?q=My%20paddy%20has%20circular%20dry%20patches", tone: "bg-champagne border-peach/60" },
];

export function RecommendationsCard() {
  const [all, setAll] = useState(false);
  const shown = all ? RECS : RECS.slice(0, 1);
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        icon={<Sparkles className="text-amber" fill="currentColor" strokeWidth={1.2} />}
        title="AI Recommendations"
        action={
          <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-olive hover:text-olive-deep">
            {all ? "Show less" : "View All"}
            <ArrowRight className={cn("size-4 transition-transform", all && "-rotate-90")} aria-hidden />
          </button>
        }
      />
      <ul className="mt-4 space-y-2.5">
        {shown.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.id} className="animate-rise">
              <Link href={r.href} className={cn("group flex items-center gap-4 rounded-[18px] border p-4 transition-colors hover:border-sage-200", r.tone)}>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-olive-deep">
                  <Icon className="size-8" strokeWidth={1.4} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[16px] font-semibold leading-snug text-ink">{r.title}</span>
                  <span className="mt-0.5 block text-[13.5px] text-ink/75">{r.detail}</span>
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-olive text-white group-hover:bg-olive-deep">
                  <ArrowRight className="size-[18px]" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
