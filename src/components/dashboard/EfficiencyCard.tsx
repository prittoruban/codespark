"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Leaf } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Nitrogen use efficiency (%) — AGRENSE-optimised plots vs conventional blanket dosing (demo season data). */
export const EFFICIENCY_DATA = [
  { month: "Mar", agrense: 41, conventional: 36 },
  { month: "Apr", agrense: 46, conventional: 37 },
  { month: "May", agrense: 53, conventional: 40 },
  { month: "Jun", agrense: 61, conventional: 42 },
  { month: "Jul", agrense: 64, conventional: 41 },
  { month: "Aug", agrense: 58, conventional: 38 },
  { month: "Sep", agrense: 54, conventional: 35 },
  { month: "Oct", agrense: 52, conventional: 34 },
];
const avg = Math.round(EFFICIENCY_DATA.reduce((s, d) => s + d.agrense, 0) / EFFICIENCY_DATA.length);
const peak = EFFICIENCY_DATA.reduce((a, b) => (b.agrense > a.agrense ? b : a));

function PeakLabel({ cx = 0, cy = 0 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={CHART.deep} stroke="#fff" strokeWidth={2.5} />
      <g transform={`translate(${cx - 52} ${cy - 40})`}>
        <rect width="104" height="26" rx="13" fill={CHART.deep} />
        <text x="52" y="17.5" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight={600}>Average {avg}%</text>
      </g>
    </g>
  );
}

export function EfficiencyCard({ className }: { className?: string }) {
  return (
    <Card className={`p-5 sm:p-6 ${className ?? ""}`}>
      <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Fertilizer Efficiency Comparison" subtitle="Nitrogen use efficiency, % of applied N taken up" />
      <div className="mt-5 h-[178px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={EFFICIENCY_DATA} margin={{ top: 44, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="eff-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={CHART.sage} stopOpacity={0.32} />
                <stop offset="1" stopColor={CHART.sage} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical stroke={CHART.grid} horizontal={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} domain={[20, 70]} ticks={[30, 40, 50, 60, 70]} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ChartTooltip unit="%" />} />
            <Area type="monotone" dataKey="conventional" name="Conventional" stroke={CHART.sageLight} strokeWidth={3.5} fill="none" />
            <Area type="monotone" dataKey="agrense" name="Recommended (AGRENSE)" stroke={CHART.deep} strokeWidth={3.5} fill="url(#eff-a)" />
            <ReferenceDot x={peak.month} y={peak.agrense} shape={<PeakLabel />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-ink/85">
        <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-olive-deep" />Recommended (AGRENSE)</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-sage-300" />Conventional</span>
      </div>
    </Card>
  );
}
