"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

/**
 * Canopy cover (%) for Field A, a demo series from a logistic growth curve
 * calibrated so today's value matches the field monitor reading (56%).
 */
const SOWN = new Date("2026-10-18");
function series(days: number) {
  const today = new Date();
  const dasToday = (today.getTime() - SOWN.getTime()) / 86_400_000;
  const shift = dasToday - 3; // inflection point keeps today ≈ 56%
  const cover = (das: number) => Math.max(0, Math.round(90 / (1 + Math.exp(-(das - shift) / 6))));
  const step = days / 7;
  return Array.from({ length: 7 }, (_, k) => {
    const back = Math.round((6 - k) * step);
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    return { day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), cover: cover(dasToday - back) };
  });
}

export function GrowthRateCard() {
  const [range, setRange] = useState("7");
  const data = useMemo(() => series(Number(range)), [range]);
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        icon={<Sprout strokeWidth={1.7} />}
        title="Growth Rate"
        subtitle="Canopy cover · Field A wheat"
        action={
          <div className="w-[136px]">
            <label htmlFor="growth-range" className="sr-only">Time range</label>
            <Select id="growth-range" value={range} onChange={(e) => setRange(e.target.value)} className="h-10 rounded-full bg-card text-[13.5px]">
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
            </Select>
          </div>
        }
      />
      <div className="mt-4 h-[168px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" minTickGap={6} />
            <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip cursor={{ fill: "rgba(237,226,210,.35)" }} content={<ChartTooltip unit="%" />} />
            <Bar dataKey="cover" name="Canopy cover" radius={[10, 10, 10, 10]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART.ramp[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
