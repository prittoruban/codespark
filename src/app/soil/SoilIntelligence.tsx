"use client";

import { axisProps, CHART } from "@/components/charts/theme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Badge, DemoTag, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar, Ring } from "@/components/ui/Progress";
import { useAppState } from "@/lib/app-state";
import type { NutrientKey, SoilParameter, SoilReport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ocrService } from "@/services";
import { buildParameter, SOIL_HISTORY } from "@/services/ocr";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Download, FileText, FlaskConical, History, Loader2, MessageCircle, Pencil, RotateCcw, ScanText, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Phase = "idle" | "processing" | "done";

const STATUS_TONE: Record<string, BadgeTone> = { low: "alert", deficient: "alert", acidic: "progress", alkaline: "progress", high: "info", medium: "success", normal: "success", sufficient: "success" };
const PRIMARY: NutrientKey[] = ["N", "P", "K", "pH", "OC"];

function NutrientTile({ p, editing, onChange }: { p: SoilParameter; editing: boolean; onChange: (v: number) => void }) {
  const scaleMax = p.key === "pH" ? 10 : p.range[1] * 1.6;
  const scaleMin = p.key === "pH" ? 4 : 0;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));
  const warn = ["low", "deficient", "acidic", "alkaline"].includes(p.status);
  return (
    <div className={cn("rounded-[20px] border p-4", warn ? "border-peach bg-gradient-to-b from-champagne/70 to-card" : "border-line bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13.5px] font-medium text-ink/80">{p.label}</p>
        <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
      </div>
      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <label className="sr-only" htmlFor={`edit-${p.key}`}>{p.label}</label>
          <input id={`edit-${p.key}`} type="number" step="any" value={p.value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full rounded-xl border border-line bg-ivory px-3 font-display text-[22px] font-semibold focus:border-olive focus:outline-none" />
          <span className="text-[13px] text-muted">{p.unit}</span>
        </div>
      ) : (
        <p className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-ink">
          {p.value}
          <span className="ml-1 text-[14px] font-medium text-muted">{p.unit}</span>
        </p>
      )}
      <div className="relative mt-4 h-2 rounded-full bg-champagne">
        <span className="absolute inset-y-0 rounded-full bg-sage-200" style={{ left: `${pos(p.range[0])}%`, width: `${pos(p.range[1]) - pos(p.range[0])}%` }} />
        <span className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow", warn ? "bg-amber" : "bg-olive")} style={{ left: `${pos(p.value)}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-muted">
        <span>Optimal {p.range[0]}–{p.range[1]}</span>
        <span title="OCR confidence">OCR {Math.round(p.confidence * 100)}%</span>
      </div>
    </div>
  );
}

function insightsFor(r: SoilReport) {
  const get = (k: NutrientKey) => r.parameters.find((p) => p.key === k)!;
  const out: { tone: "alert" | "caution" | "ok"; title: string; detail: string }[] = [];
  if (get("N").status === "low") out.push({ tone: "alert", title: "Nitrogen is low", detail: `${get("N").value} kg/ha is below the 280 kg/ha threshold. Split nitrogen doses and consider neem-coated urea.` });
  if (get("OC").status === "low") out.push({ tone: "alert", title: "Organic carbon is low", detail: `${get("OC").value}% is below 0.5%. Add 10 t/ha FYM or a green manure crop to rebuild soil carbon.` });
  if (get("Zn").status === "deficient") out.push({ tone: "caution", title: "Zinc deficiency", detail: `${get("Zn").value} ppm is below 0.6 ppm. Apply zinc sulphate at 25 kg/ha as a basal dose.` });
  if (get("pH").status === "acidic") out.push({ tone: "caution", title: "Slightly acidic soil", detail: `pH ${get("pH").value}. Most crops tolerate this. Lime only if pH drops below 6.0.` });
  if (get("pH").status === "alkaline") out.push({ tone: "caution", title: "Alkaline soil", detail: `pH ${get("pH").value}. Use acid-forming fertilizers and check whether gypsum is needed.` });
  if (get("P").status !== "low" && get("K").status !== "low") out.push({ tone: "ok", title: "Phosphorus and potassium adequate", detail: "No extra P or K beyond the maintenance dose. This avoids overspending on DAP." });
  return out;
}

export function SoilIntelligence() {
  const router = useRouter();
  const { setSoilReport, soilReport, toast } = useAppState();
  const [phase, setPhase] = useState<Phase>(soilReport ? "done" : "idle");
  const [stage, setStage] = useState(0);
  const [preview, setPreview] = useState<{ src: string | null; name: string }>({ src: soilReport ? "/samples/soil-health-card.svg" : null, name: soilReport?.sourceFile ?? "" });
  const [report, setReport] = useState<SoilReport | null>(soilReport);
  const [editing, setEditing] = useState(false);
  const [chart, setChart] = useState<"npk" | "oc">("npk");

  // Restore the last digitised card (persisted per viewer) once app state hydrates.
  useEffect(() => {
    if (soilReport && !report && phase === "idle") {
      setReport(soilReport);
      setPreview({ src: null, name: soilReport.sourceFile });
      setPhase("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soilReport]);

  const run = async (file: { name: string; size: number }, src: string | null) => {
    setPreview({ src, name: file.name });
    setPhase("processing");
    setStage(0);
    setEditing(false);
    const r = await ocrService.extract(file, setStage);
    setReport(r);
    setSoilReport(r);
    setPhase("done");
    toast({ title: "Soil Health Card digitised", body: `${r.parameters.length} parameters extracted · ${Math.round(r.overallConfidence * 100)}% confidence` });
  };

  const onFile = (f: File) => {
    const ok = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!ok) {
      toast({ title: "Unsupported file", body: "Upload a photo (JPG, PNG) or a PDF of the card.", tone: "alert" });
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", body: "Maximum size is 15 MB.", tone: "alert" });
      return;
    }
    run({ name: f.name, size: f.size }, f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const updateValue = (key: NutrientKey, value: number) => {
    if (!report || Number.isNaN(value)) return;
    const params = report.parameters.map((p) => (p.key === key ? buildParameter(key, value, 1) : p));
    setReport({ ...report, parameters: params });
  };

  const saveEdits = () => {
    if (report) setSoilReport(report);
    setEditing(false);
    toast({ title: "Corrections saved", body: "Edited values are marked as verified (100% confidence)." });
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report.cardNumber.replace(/\//g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const get = (k: NutrientKey) => report?.parameters.find((p) => p.key === k);
  const history = report
    ? [...SOIL_HISTORY, { season: "Rabi 2026 (this card)", N: get("N")!.value, P: get("P")!.value, K: get("K")!.value, OC: get("OC")!.value, pH: get("pH")!.value }]
    : SOIL_HISTORY;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="info" dot>OCR · Structured extraction</Badge>}
        title="Soil Intelligence"
        description="Upload a Soil Health Card. AGRENSE reads it, structures all 12 parameters and flags deficiencies for your fertilizer plan."
        actions={
          phase === "done" && (
            <>
              <Button variant="secondary" onClick={() => { setPhase("idle"); setReport(null); setSoilReport(null); }}>
                <RotateCcw /> Scan another card
              </Button>
              <Button onClick={() => router.push("/fertilizer")}>
                Generate fertilizer plan <ArrowRight />
              </Button>
            </>
          )
        }
      />

      {phase === "idle" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="p-5 sm:p-6">
            <Dropzone accept="image/*,application/pdf" onFile={onFile} title="Drop your Soil Health Card here" hint="Photo or scanned PDF, up to 15 MB. Hold the card flat, in good light, with all four corners visible.">
              <Button variant="secondary" onClick={() => run({ name: "soil-health-card.svg", size: 6094 }, "/samples/soil-health-card.svg")}>
                <FileText /> Use sample card
              </Button>
            </Dropzone>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Multilingual OCR", "English, Hindi, Tamil and Telugu cards"],
                ["12 parameters", "NPK, pH, EC, OC and six micronutrients"],
                ["Human review", "Edit any value before it's used"],
              ].map(([t, d]) => (
                <li key={t} className="rounded-2xl bg-ivory p-3.5 ring-1 ring-line">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink"><CheckCircle2 className="size-4 text-olive" aria-hidden />{t}</p>
                  <p className="mt-1 text-[12.5px] text-muted">{d}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="overflow-hidden">
            <div className="relative h-44">
              <Image src="/images/soil-sample.jpg" alt="Soil sample being collected" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            </div>
            <div className="p-5">
              <CardHeader icon={<History strokeWidth={1.7} />} title="Card history" subtitle="Field A · Tiruvallur" />
              <ul className="mt-4 divide-y divide-line">
                {SOIL_HISTORY.slice().reverse().map((h) => (
                  <li key={h.season} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="font-medium text-ink">{h.season}</span>
                    <span className="text-muted">N {h.N} · P {h.P} · K {h.K} · pH {h.pH}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      {phase === "processing" && (
        <Card className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[20px] bg-ivory ring-1 ring-line">
            {preview.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.src} alt="Uploaded Soil Health Card" className="max-h-[460px] w-auto object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <FileText className="size-14 text-olive" aria-hidden />
                <p className="text-sm">{preview.name}</p>
              </div>
            )}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-full">
              <span className="absolute inset-x-0 h-24 animate-[scan-line_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-olive/15 to-olive/35" />
            </span>
          </div>
          <div>
            <p className="flex items-center gap-2 font-display text-[20px] font-semibold text-ink">
              <ScanText className="size-5 text-olive" aria-hidden /> Reading your card
            </p>
            <p className="mt-1 text-[14px] text-muted">{preview.name}</p>
            <ProgressBar className="mt-5" value={(stage / ocrService.stages.length) * 100} label="Extraction progress" />
            <ol className="mt-6 space-y-3">
              {ocrService.stages.map((s, i) => (
                <li key={s.id} className={cn("flex items-start gap-3 rounded-2xl p-3 transition-colors", i === stage ? "bg-sage-50 ring-1 ring-sage-100" : "")}>
                  <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px]", i < stage ? "bg-olive text-white" : i === stage ? "bg-card text-olive ring-2 ring-olive" : "bg-champagne text-muted")}>
                    {i < stage ? <Check className="size-3.5" /> : i === stage ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                  </span>
                  <span>
                    <span className={cn("block text-[14.5px] font-medium", i <= stage ? "text-ink" : "text-muted")}>{s.label}</span>
                    <span className="block text-[12.5px] text-muted">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {phase === "done" && report && (
        <>
          <Card className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <Ring value={report.overallConfidence * 100} size={76}>
                <span className="font-display text-[17px] font-bold text-ink">{Math.round(report.overallConfidence * 100)}%</span>
              </Ring>
              <div>
                <p className="text-[12.5px] text-muted">Extraction confidence</p>
                <p className="font-display text-[19px] font-semibold text-ink">Card {report.cardNumber}</p>
                <p className="text-[13px] text-muted">{report.sourceFile}</p>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-[13.5px] md:border-l md:border-line md:pl-6 lg:grid-cols-4">
              {[
                ["Farmer", report.farmerName],
                ["Village", report.district],
                ["Survey no.", report.surveyNo],
                ["Sampled", new Date(report.sampleDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card className="p-5 sm:p-6">
              <CardHeader
                icon={<FlaskConical strokeWidth={1.7} />}
                title="Primary nutrients"
                subtitle="Values as read from the card. Edit any value to correct OCR errors."
                action={
                  editing ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setReport(soilReport); setEditing(false); }}><X /> Cancel</Button>
                      <Button size="sm" onClick={saveEdits}><Check /> Save</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Pencil /> Edit values</Button>
                  )
                }
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PRIMARY.map((k) => (
                  <NutrientTile key={k} p={get(k)!} editing={editing} onChange={(v) => updateValue(k, v)} />
                ))}
                <div className="rounded-[20px] border border-line bg-ivory p-4">
                  <p className="text-[13.5px] font-medium text-ink/80">Electrical conductivity</p>
                  <p className="mt-2 font-display text-[32px] font-bold leading-none text-ink">{get("EC")!.value}<span className="ml-1 text-[14px] font-medium text-muted">dS/m</span></p>
                  <p className="mt-4 text-[12.5px] text-muted">Below 1 dS/m: no salinity risk</p>
                </div>
              </div>

              <h3 className="mt-7 font-display text-[16px] font-semibold text-ink">Micronutrients & secondary</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-[12.5px] text-muted">
                      <th className="py-2 font-medium">Parameter</th>
                      <th className="py-2 font-medium">Value</th>
                      <th className="py-2 font-medium">Critical limit</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["S", "Zn", "Fe", "Cu", "Mn", "B"] as NutrientKey[]).map((k) => {
                      const p = get(k)!;
                      return (
                        <tr key={k} className="border-b border-line/70 last:border-0">
                          <td className="py-2.5 font-medium text-ink">{p.label} ({p.key})</td>
                          <td className="py-2.5">
                            {editing ? (
                              <input aria-label={p.label} type="number" step="any" value={p.value} onChange={(e) => updateValue(k, Number(e.target.value))} className="h-9 w-24 rounded-lg border border-line bg-ivory px-2 focus:border-olive focus:outline-none" />
                            ) : (
                              <span>{p.value} <span className="text-muted">{p.unit}</span></span>
                            )}
                          </td>
                          <td className="py-2.5 text-muted">{p.range[0]} {p.unit}</td>
                          <td className="py-2.5"><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                          <td className="py-2.5 text-right text-muted">{Math.round(p.confidence * 100)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex flex-col gap-5">
              <Card className="p-5 sm:p-6">
                <CardHeader icon={<AlertTriangle strokeWidth={1.7} />} title="Deficiency insights" subtitle="Thresholds from the Soil Health Card rating chart" />
                <ul className="mt-4 space-y-2.5">
                  {insightsFor(report).map((i) => (
                    <li key={i.title} className={cn("rounded-[18px] p-3.5", i.tone === "alert" ? "bg-alert-soft/70" : i.tone === "caution" ? "bg-champagne" : "bg-sage-50")}>
                      <p className={cn("text-[14px] font-semibold", i.tone === "alert" ? "text-alert" : i.tone === "caution" ? "text-[#8a5a00]" : "text-olive-deep")}>{i.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-ink/75">{i.detail}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={download}><Download /> Export JSON</Button>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/krishi-ai?q=" + encodeURIComponent("My soil has low nitrogen and low organic carbon. What should I do?"))}><MessageCircle /> Ask Krishi AI</Button>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <CardHeader
                  icon={<History strokeWidth={1.7} />}
                  title="Historical comparison"
                  subtitle="Field A, last four cards"
                  action={<Segmented size="sm" label="Chart metric" value={chart} onChange={setChart} options={[{ value: "npk", label: "N·P·K" }, { value: "oc", label: "OC · pH" }]} />}
                />
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart === "npk" ? (
                      <BarChart data={history} margin={{ top: 6, right: 0, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={CHART.grid} />
                        <XAxis dataKey="season" {...axisProps} tickFormatter={(s: string) => s.replace(" (this card)", "*").replace("Kharif", "Kh").replace("Rabi", "Rb")} />
                        <YAxis {...axisProps} />
                        <Tooltip content={<ChartTooltip unit=" kg/ha" />} cursor={{ fill: "rgba(237,226,210,.35)" }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                        <Bar dataKey="N" name="Nitrogen" fill={CHART.deep} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="K" name="Potassium" fill={CHART.sage} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="P" name="Phosphorus" fill={CHART.amber} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={history} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={CHART.grid} />
                        <XAxis dataKey="season" {...axisProps} tickFormatter={(s: string) => s.replace(" (this card)", "*").replace("Kharif", "Kh").replace("Rabi", "Rb")} />
                        <YAxis yAxisId="oc" {...axisProps} domain={[0.3, 0.7]} tickFormatter={(v) => `${v}%`} />
                        <YAxis yAxisId="ph" orientation="right" {...axisProps} domain={[5.5, 7.5]} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                        <Line yAxisId="oc" dataKey="OC" name="Organic carbon (%)" stroke={CHART.deep} strokeWidth={3} dot={{ r: 4 }} />
                        <Line yAxisId="ph" dataKey="pH" name="pH" stroke={CHART.amber} strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[12.5px] text-muted">Nitrogen and organic carbon have declined every season since 2023. This points to residue burning or no organic inputs. <DemoTag className="ml-1" label="Demo history" /></p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
