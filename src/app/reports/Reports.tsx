"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { EFFICIENCY_DATA } from "@/components/dashboard/EfficiencyCard";
import { DemoTag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { FARMS } from "@/data/farms";
import { formatINR } from "@/lib/utils";
import { BarChart3, Download, FileBarChart, Leaf, Printer, TrendingDown, TrendingUp, Wheat } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Demo season history for the portfolio. */
const SEASONS = [
  { season: "Rabi 23", yield: 3.9, cost: 9800, nApplied: 168 },
  { season: "Kharif 24", yield: 4.6, cost: 10400, nApplied: 172 },
  { season: "Rabi 24", yield: 4.1, cost: 9100, nApplied: 151 },
  { season: "Kharif 25", yield: 4.9, cost: 8300, nApplied: 138 },
  { season: "Rabi 25", yield: 4.4, cost: 7600, nApplied: 126 },
  { season: "Kharif 26", yield: 5.1, cost: 7200, nApplied: 119 },
];

export function Reports() {
  const [range, setRange] = useState<"3" | "6">("6");
  const data = SEASONS.slice(-Number(range));
  const first = data[0];
  const last = data[data.length - 1];
  const pct = (a: number, b: number) => Math.round(((b - a) / a) * 100);

  const exportCsv = () => {
    const rows = [["Season", "Yield (t/ha)", "Fertilizer cost (INR/ha)", "N applied (kg/ha)"], ...data.map((d) => [d.season, d.yield, d.cost, d.nApplied])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "agrense-season-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kpis = [
    { label: "Average yield", value: `${last.yield} t/ha`, delta: pct(first.yield, last.yield), good: true, icon: Wheat },
    { label: "Fertilizer cost", value: formatINR(last.cost) + "/ha", delta: pct(first.cost, last.cost), good: false, icon: BarChart3 },
    { label: "Nitrogen applied", value: `${last.nApplied} kg/ha`, delta: pct(first.nApplied, last.nApplied), good: false, icon: Leaf },
    { label: "Area monitored", value: `${FARMS.reduce((s, f) => s + f.areaHa, 0).toFixed(1)} ha`, delta: 0, good: true, icon: FileBarChart },
  ];

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader
        title="Reports"
        description="Season-over-season trends for yield, input cost and nitrogen efficiency across your farms."
        actions={
          <>
            <Segmented label="Range" value={range} onChange={setRange} options={[{ value: "3", label: "3 seasons" }, { value: "6", label: "6 seasons" }]} />
            <Button variant="secondary" onClick={exportCsv}><Download /> CSV</Button>
            <Button variant="secondary" onClick={() => window.print()}><Printer /> Print</Button>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const improving = k.delta === 0 ? null : k.good ? k.delta > 0 : k.delta < 0;
          const Icon = k.icon;
          return (
            <Card as="div" key={k.label} className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-muted">{k.label}</dt>
                <Icon className="size-[18px] text-olive" aria-hidden />
              </div>
              <dd className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[30px]">{k.value}</dd>
              {improving !== null && (
                <dd className={`mt-2 flex items-center gap-1 text-[12.5px] font-medium ${improving ? "text-olive" : "text-alert"}`}>
                  {k.delta > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {k.delta > 0 ? "+" : ""}{k.delta}% since {first.season}
                </dd>
              )}
            </Card>
          );
        })}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardHeader icon={<Wheat strokeWidth={1.7} />} title="Yield trend" subtitle="Area-weighted average, t/ha" />
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="season" {...axisProps} />
                <YAxis {...axisProps} domain={[0, 6]} />
                <Tooltip content={<ChartTooltip unit=" t/ha" />} cursor={{ fill: "rgba(237,226,210,.35)" }} />
                <Bar dataKey="yield" name="Yield" fill={CHART.olive} radius={[10, 10, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader icon={<BarChart3 strokeWidth={1.7} />} title="Inputs vs. cost" subtitle="Nitrogen applied (kg/ha) and fertilizer spend (₹/ha)" />
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="season" {...axisProps} />
                <YAxis yAxisId="n" {...axisProps} domain={[80, 200]} />
                <YAxis yAxisId="c" orientation="right" {...axisProps} tickFormatter={(v) => `₹${v / 1000}k`} domain={[5000, 12000]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                <Line yAxisId="n" dataKey="nApplied" name="N applied (kg/ha)" stroke={CHART.deep} strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="c" dataKey="cost" name="Cost (₹/ha)" stroke={CHART.amber} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Nitrogen use efficiency, 2026" subtitle="% of applied N taken up by the crop" />
          <div className="mt-4 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EFFICIENCY_DATA} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} domain={[20, 70]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                <Line dataKey="agrense" name="AGRENSE-optimised" stroke={CHART.deep} strokeWidth={3} dot={false} />
                <Line dataKey="conventional" name="Conventional" stroke={CHART.sageLight} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <CardHeader icon={<FileBarChart strokeWidth={1.7} />} title="Summary" />
            <DemoTag label="Demo history" />
          </div>
          <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink/85">
            <p>Since <strong>{first.season}</strong>, yield has risen <strong>{pct(first.yield, last.yield)}%</strong> while nitrogen applied fell <strong>{Math.abs(pct(first.nApplied, last.nApplied))}%</strong>. Soil-test-based dosing and split application are working.</p>
            <p>Fertilizer spend is down to <strong>{formatINR(last.cost)}/ha</strong>, about <strong>{formatINR((first.cost - last.cost) * FARMS.reduce((s, f) => s + f.areaHa, 0))}</strong> saved per season across the portfolio.</p>
            <p>Next priority: <strong>Field D</strong> (critical moisture stress and acidic pH 5.6). Liming before the next crop should lift its health score.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
