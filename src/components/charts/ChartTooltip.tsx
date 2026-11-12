"use client";

/** Tooltip body matching the card language. Pass as <Tooltip content={<ChartTooltip unit="%" />} />. */
export function ChartTooltip({ active, payload, label, unit = "", labelFormatter, format }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[]; label?: string | number; unit?: string; labelFormatter?: (l: string | number) => string; format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[13px] shadow-float">
      <p className="mb-1 font-medium text-ink">{labelFormatter ? labelFormatter(label ?? "") : label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-ink">{format && typeof p.value === "number" ? format(p.value) : `${p.value}${unit}`}</span>
        </p>
      ))}
    </div>
  );
}
