import { cn } from "@/lib/utils";

export function ProgressBar({ value, tone = "olive", className, label }: { value: number; tone?: "olive" | "amber" | "alert"; className?: string; label?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-champagne", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", tone === "olive" ? "bg-olive" : tone === "amber" ? "bg-amber" : "bg-alert")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Circular gauge for scores (health, confidence). */
export function Ring({ value, size = 72, stroke = 7, children, tone = "olive" }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; tone?: "olive" | "amber" | "alert" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === "olive" ? "var(--olive)" : tone === "amber" ? "var(--amber)" : "var(--alert)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--champagne)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
