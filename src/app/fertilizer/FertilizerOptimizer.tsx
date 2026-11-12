"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Badge, DemoTag } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, Segmented, Select, Toggle } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Ring } from "@/components/ui/Progress";
import { CROP_STAGES, CROPS, FARMS } from "@/data/farms";
import { useAppState } from "@/lib/app-state";
import { useWeather } from "@/lib/hooks";
import type { FertilizerInput, FertilizerPlan } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { fertilizerService } from "@/services";
import { BadgeCheck, CalendarClock, Check, CircleDollarSign, CloudRain, Download, FileText, FlaskConical, Info, Leaf, Lightbulb, Sparkles, Sprout, Wind } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DEFAULT: FertilizerInput = { crop: "Wheat", stage: "Tillering", areaHa: 12.5, targetYield: 4.8, N: 212, P: 18.4, K: 245, pH: 6.4, OC: 0.48, organicPreference: false, irrigation: "irrigated" };

export function FertilizerOptimizer() {
  const { soilReport, toast } = useAppState();
  const [input, setInput] = useState<FertilizerInput>(DEFAULT);
  const [plan, setPlan] = useState<FertilizerPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCard, setFromCard] = useState(false);
  const weather = useWeather("chennai");

  const set = <K extends keyof FertilizerInput>(k: K, v: FertilizerInput[K]) => setInput((i) => ({ ...i, [k]: v }));

  const optimize = async (inp = input) => {
    if (inp.areaHa <= 0 || inp.targetYield <= 0) {
      toast({ title: "Check your inputs", body: "Area and target yield must be greater than zero.", tone: "alert" });
      return;
    }
    setLoading(true);
    const p = await fertilizerService.optimize(inp);
    setPlan(p);
    setLoading(false);
  };

  // Pre-fill from the latest digitised Soil Health Card.
  useEffect(() => {
    if (!soilReport) {
      optimize(DEFAULT);
      return;
    }
    const v = (k: string) => soilReport.parameters.find((p) => p.key === k)?.value ?? 0;
    const next = { ...DEFAULT, N: v("N"), P: v("P"), K: v("K"), pH: v("pH"), OC: v("OC") };
    setInput(next);
    setFromCard(true);
    optimize(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soilReport]);

  const applyFarm = (id: string) => {
    const f = FARMS.find((x) => x.id === id);
    if (!f) return;
    setInput((i) => ({ ...i, crop: f.crop, stage: f.stage, areaHa: f.areaHa, pH: f.soilPh, irrigation: f.irrigation === "Rainfed" ? "rainfed" : "irrigated" }));
  };

  const exportCsv = () => {
    if (!plan) return;
    const rows = [["Product", "Grade", "kg/ha", `Total for ${plan.input.areaHa} ha (bags)`, "Cost/ha (INR)"], ...plan.products.map((p) => [p.name, p.grade, p.kgPerHa, p.bagsTotal, p.costPerHa]), [], ["Stage", "Timing", "Share", "Products"], ...plan.schedule.map((s) => [s.stage, s.timing, s.share, s.products])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `fertilizer-plan-${plan.input.crop.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rainAdvisory = weather.data?.advisories.find((a) => a.kind === "fertilizer");
  const costData = useMemo(() => (plan ? [{ name: "Conventional", value: plan.cost.conventionalPerHa }, { name: "AGRENSE", value: plan.cost.optimizedPerHa }] : []), [plan]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="info" dot>Sustainable nutrient planning</Badge>}
        title="Fertilizer Optimizer"
        description="Crop-, stage- and soil-specific doses that cut waste, cost and emissions. Model estimates are marked separately from verified agronomic guidance."
        actions={
          plan && (
            <>
              <Button variant="secondary" onClick={exportCsv}><Download /> Export plan</Button>
              <ButtonLink href={`/krishi-ai?q=${encodeURIComponent("Can I use neem-coated urea instead?")}`} variant="secondary"><Sparkles /> Ask Krishi AI</ButtonLink>
            </>
          )
        }
      />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Inputs */}
        <Card as="aside" className="h-fit p-5 sm:p-6 xl:sticky xl:top-6">
          <CardHeader icon={<Sprout strokeWidth={1.7} />} title="Field & soil inputs" />
          <div className={cn("mt-4 flex items-start gap-2.5 rounded-2xl p-3 text-[13px]", fromCard ? "bg-sage-50 text-olive-deep ring-1 ring-sage-100" : "bg-champagne text-[#7a5200]")}>
            {fromCard ? <BadgeCheck className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            {fromCard ? (
              <span>Soil values loaded from card <strong>{soilReport?.cardNumber}</strong>.</span>
            ) : (
              <span>Using Field A&apos;s last soil test. <Link href="/soil" className="font-semibold underline">Upload a Soil Health Card</Link> for exact values.</span>
            )}
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              optimize();
            }}
          >
            <div>
              <Label htmlFor="farm">Field</Label>
              <Select id="farm" defaultValue="field-a" onChange={(e) => applyFarm(e.target.value)}>
                {FARMS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="crop">Crop</Label>
                <Select id="crop" value={input.crop} onChange={(e) => setInput((i) => ({ ...i, crop: e.target.value, stage: CROP_STAGES[e.target.value][0] }))}>
                  {CROPS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="stage">Growth stage</Label>
                <Select id="stage" value={input.stage} onChange={(e) => set("stage", e.target.value)}>
                  {CROP_STAGES[input.crop].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="area">Area</Label>
                <Input id="area" type="number" min={0.1} step={0.1} value={input.areaHa} onChange={(e) => set("areaHa", Number(e.target.value))} suffix="ha" />
              </div>
              <div>
                <Label htmlFor="yield">Target yield</Label>
                <Input id="yield" type="number" min={0.5} step={0.1} value={input.targetYield} onChange={(e) => set("targetYield", Number(e.target.value))} suffix="t/ha" />
              </div>
            </div>
            <div>
              <Label>Water source</Label>
              <Segmented label="Water source" value={input.irrigation} onChange={(v) => set("irrigation", v)} options={[{ value: "irrigated", label: "Irrigated" }, { value: "rainfed", label: "Rainfed" }]} />
            </div>
            <fieldset className="rounded-[20px] border border-line p-4">
              <legend className="px-1.5 text-[13px] font-medium text-ink">Soil test values</legend>
              <div className="grid grid-cols-3 gap-2.5">
                {([["N", "N", "kg/ha"], ["P", "P", "kg/ha"], ["K", "K", "kg/ha"], ["pH", "pH", ""], ["OC", "OC", "%"]] as const).map(([k, label, unit]) => (
                  <div key={k}>
                    <label htmlFor={`soil-${k}`} className="mb-1 block text-[12px] text-muted">{label} {unit && <span>({unit})</span>}</label>
                    <input id={`soil-${k}`} type="number" step="any" min={0} value={input[k]} onChange={(e) => set(k, Number(e.target.value))} className="h-11 w-full rounded-xl border border-line bg-ivory px-3 text-[15px] focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/10" />
                  </div>
                ))}
              </div>
            </fieldset>
            <Toggle id="organic" checked={input.organicPreference} onChange={(v) => set("organicPreference", v)} label="Integrated nutrient management" description="Replace 25% of N with vermicompost + biofertilizer. Costs more, builds soil carbon" />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              <Sparkles /> {loading ? "Optimizing…" : "Optimize fertilizer plan"}
            </Button>
          </form>
        </Card>

        {/* Results */}
        <div className={cn("min-w-0 space-y-5 transition-opacity", loading && "pointer-events-none opacity-60")}>
          {!plan ? (
            <Card className="flex min-h-[400px] items-center justify-center p-6 text-muted">Computing plan…</Card>
          ) : (
            <>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <CardHeader icon={<FlaskConical strokeWidth={1.7} />} title={`Nutrient requirement · ${plan.input.crop}`} subtitle={`${plan.input.stage} · ${plan.input.areaHa} ha · target ${plan.input.targetYield} t/ha`} />
                  <div className="flex items-center gap-3">
                    <Ring value={plan.confidence * 100} size={58} stroke={6}>
                      <span className="text-[13px] font-bold text-ink">{Math.round(plan.confidence * 100)}%</span>
                    </Ring>
                    <div className="text-[12.5px] leading-tight">
                      <p className="font-medium text-ink">Model confidence</p>
                      <Badge tone="model" className="mt-1">Model estimate</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {([["N", "Nitrogen (N)", plan.required.N, plan.blanket.N], ["P₂O₅", "Phosphorus (P₂O₅)", plan.required.P2O5, plan.blanket.P2O5], ["K₂O", "Potassium (K₂O)", plan.required.K2O, plan.blanket.K2O]] as const).map(([k, label, req, blanket]) => {
                    const diff = req - blanket;
                    return (
                      <div key={k} className="rounded-[20px] border border-line bg-gradient-to-b from-ivory to-card p-4">
                        <p className="text-[13.5px] text-ink/75">{label}</p>
                        <p className="mt-1.5 font-display text-[36px] font-bold leading-none tracking-[-0.02em] text-ink">
                          {req}
                          <span className="ml-1 text-[14px] font-medium text-muted">kg/ha</span>
                        </p>
                        <p className={cn("mt-2 text-[12.5px] font-medium", diff <= 0 ? "text-olive" : "text-[#8a5a00]")}>
                          {diff === 0 ? `Same as blanket dose (${blanket})` : diff < 0 ? `${Math.abs(diff)} kg/ha less than blanket dose (${blanket})` : `${diff} kg/ha more than blanket dose (${blanket})`}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {rainAdvisory && (
                  <div className={cn("mt-4 flex items-start gap-3 rounded-[18px] p-3.5", rainAdvisory.severity === "alert" ? "bg-alert-soft/70" : "bg-sage-50")}>
                    {rainAdvisory.severity === "alert" ? <CloudRain className="mt-0.5 size-5 shrink-0 text-alert" /> : <Wind className="mt-0.5 size-5 shrink-0 text-olive" />}
                    <div className="text-[13.5px]">
                      <p className="font-semibold text-ink">Application timing: {rainAdvisory.title}</p>
                      <p className="text-ink/75">{rainAdvisory.detail} {rainAdvisory.window && <strong>{rainAdvisory.window}.</strong>}</p>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 sm:p-6">
                <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Recommended products" subtitle="Indicative subsidised prices · bags for the full area" action={<DemoTag label="Demo prices" />} />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-line text-[12.5px] text-muted">
                        <th className="py-2.5 font-medium">Product</th>
                        <th className="py-2.5 font-medium">Supplies</th>
                        <th className="py-2.5 text-right font-medium">Dose</th>
                        <th className="py-2.5 text-right font-medium">For {plan.input.areaHa} ha</th>
                        <th className="py-2.5 text-right font-medium">Cost / ha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.products.map((p) => (
                        <tr key={p.name} className="border-b border-line/70 last:border-0">
                          <td className="py-3">
                            <p className="font-semibold text-ink">{p.name}</p>
                            <p className="flex items-center gap-1.5 text-[12px] text-muted">
                              {p.grade}
                              <Badge tone={p.type === "chemical" ? "neutral" : "success"} className="py-0.5">{p.type}</Badge>
                            </p>
                          </td>
                          <td className="py-3 text-[13px] text-ink/75">{p.supplies}</td>
                          <td className="py-3 text-right font-medium">{p.kgPerHa.toLocaleString("en-IN")} kg/ha</td>
                          <td className="py-3 text-right text-ink/80">{p.type === "bio" ? `${p.bagsTotal} kg` : `${p.bagsTotal} bags`}</td>
                          <td className="py-3 text-right font-medium">{formatINR(p.costPerHa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <CardHeader icon={<CalendarClock strokeWidth={1.7} />} title="Application schedule" subtitle="Split doses matched to crop stages" />
                <ol className="relative mt-5 space-y-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-line">
                  {plan.schedule.map((s) => (
                    <li key={s.stage} className="relative flex gap-4">
                      <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", s.status === "done" ? "bg-olive text-white" : s.status === "due" ? "bg-amber text-white" : "bg-champagne text-muted")}>
                        {s.status === "done" ? <Check className="size-4" /> : <Sprout className="size-4" />}
                      </span>
                      <div className={cn("flex-1 rounded-[18px] p-3.5", s.status === "due" ? "bg-champagne/70 ring-1 ring-peach" : "bg-ivory ring-1 ring-line")}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-display text-[15.5px] font-semibold text-ink">{s.stage} <span className="font-sans text-[13px] font-normal text-muted">· {s.timing}</span></p>
                          <Badge tone={s.status === "done" ? "success" : s.status === "due" ? "progress" : "neutral"} dot={s.status === "due"}>{s.status === "due" ? "Due now" : s.status === "done" ? "Completed" : "Upcoming"}</Badge>
                        </div>
                        <p className="mt-1 text-[14px] text-ink">{s.share} · {s.products}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">{s.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5 sm:p-6">
                  <CardHeader icon={<CircleDollarSign strokeWidth={1.7} />} title="Cost comparison" subtitle="Per hectare, vs typical blanket practice" />
                  <div className="mt-4 h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costData} layout="vertical" margin={{ top: 0, right: 64, left: 6, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke={CHART.grid} />
                        <XAxis type="number" {...axisProps} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
                        <YAxis type="category" dataKey="name" {...axisProps} width={92} />
                        <Tooltip content={<ChartTooltip format={formatINR} />} cursor={{ fill: "rgba(237,226,210,.35)" }} />
                        <Bar dataKey="value" name="Cost / ha" radius={[0, 12, 12, 0]} barSize={34}>
                          {costData.map((d) => <Cell key={d.name} fill={d.name === "AGRENSE" ? CHART.deep : CHART.sageLight} />)}
                          <LabelList dataKey="value" position="right" formatter={(v: number) => formatINR(v)} style={{ fill: CHART.axis, fontSize: 12 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 rounded-2xl bg-sage-50 p-3 text-[14px] text-olive-deep">
                    {plan.cost.savingsTotal >= 0 ? (
                      <>Estimated saving <strong className="font-display text-[18px]">{formatINR(plan.cost.savingsTotal)}</strong> across {plan.input.areaHa} ha this season.</>
                    ) : (
                      <>This plan costs {formatINR(-plan.cost.savingsTotal)} more, mainly from organic inputs that rebuild soil carbon.</>
                    )}
                  </p>
                </Card>

                <Card className="p-5 sm:p-6">
                  <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Environmental impact" subtitle="Compared with blanket application" />
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      ["Nitrogen avoided", `${plan.impact.nitrogenSavedKg.toLocaleString("en-IN")} kg`, "across the field"],
                      ["N₂O emissions avoided", `${plan.impact.n2oAvoidedKgCO2e.toLocaleString("en-IN")} kg`, "CO₂-equivalent (IPCC Tier 1)"],
                      ["Nutrient reduction", `${plan.impact.efficiencyGain}%`, "fewer kg of N+P+K"],
                      ["Runoff risk", plan.impact.runoffRisk, "nitrate leaching"],
                    ].map(([k, v, sub]) => (
                      <div key={k} className="rounded-[18px] bg-ivory p-3.5 ring-1 ring-line">
                        <dt className="text-[12.5px] text-muted">{k}</dt>
                        <dd className={cn("mt-1 font-display text-[22px] font-bold text-ink", k === "Runoff risk" && "capitalize", k === "Runoff risk" && (v === "low" ? "text-olive" : v === "high" ? "text-alert" : "text-[#8a5a00]"))}>{v}</dd>
                        <dd className="text-[11.5px] text-muted">{sub}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </div>

              <Card className="p-5 sm:p-6">
                <CardHeader icon={<Lightbulb strokeWidth={1.7} />} title="Why this recommendation" subtitle="Each step is labelled with its basis" />
                <ul className="mt-4 space-y-2.5">
                  {plan.explanations.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-[16px] p-2.5 hover:bg-ivory">
                      <Badge tone={e.basis === "model" ? "model" : "guideline"} className="mt-0.5 w-[118px] justify-center">
                        {e.basis === "model" ? <><Sparkles className="size-3" /> Model estimate</> : <><FileText className="size-3" /> Verified guideline</>}
                      </Badge>
                      <p className="flex-1 text-[14px] leading-relaxed text-ink/85">{e.text}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-muted">Verified guideline: published package-of-practice or Soil Health Card rating rules. Model estimate: adjustments computed by the AGRENSE engine. Check final doses with your local agriculture officer.</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
