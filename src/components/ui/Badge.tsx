import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeTone = "live" | "success" | "progress" | "info" | "alert" | "neutral" | "model" | "guideline";

const tones: Record<BadgeTone, string> = {
  live: "bg-forest/90 text-white",
  success: "bg-sage-100 text-olive-deep",
  progress: "bg-champagne text-[#8a5a00] border border-peach",
  info: "bg-sage-50 text-olive-deep border border-sage-100",
  alert: "bg-alert-soft text-alert",
  neutral: "bg-ivory text-muted border border-line",
  model: "bg-champagne text-[#8a5a00]",
  guideline: "bg-sage-100 text-forest",
};

export function Badge({ tone = "neutral", dot, children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none", tones[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", tone === "live" ? "bg-wheat" : tone === "alert" ? "bg-alert" : tone === "progress" ? "bg-amber" : "bg-olive")} aria-hidden />}
      {children}
    </span>
  );
}

/** Small "simulated data" marker — keeps mock values honest. */
export function DemoTag({ label = "Demo data", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-medium text-muted", className)} title="Simulated for this frontend demo. Will be replaced by live backend data.">
      {label}
    </span>
  );
}
