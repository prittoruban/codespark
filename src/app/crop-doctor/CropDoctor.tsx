"use client";

import { Badge, DemoTag } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar, Ring } from "@/components/ui/Progress";
import { useAppState } from "@/lib/app-state";
import type { DiseaseResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { detectDisease, DISEASE_CROPS } from "@/services/disease";
import { Bug, CheckCircle2, ClipboardList, Cpu, FlaskConical, History, Leaf, RotateCcw, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

type Crop = (typeof DISEASE_CROPS)[number];

const SAMPLES: { label: string; src: string; crop: Crop; note: string }[] = [
  { label: "Wheat · rust symptoms", src: "/samples/wheat-rust-leaf.svg", crop: "Wheat", note: "Illustrated" },
  { label: "Tomato · leaf spots", src: "/samples/tomato-blight-leaf.svg", crop: "Tomato", note: "Illustrated" },
  { label: "Healthy foliage", src: "/images/healthy-leaves.jpg", crop: "Tomato", note: "Photo" },
];

interface ScanRecord {
  id: string;
  src: string;
  crop: string;
  result: DiseaseResult;
  at: string;
}

export function CropDoctor() {
  const { toast } = useAppState();
  const [crop, setCrop] = useState<Crop>("Wheat");
  const [image, setImage] = useState<{ src: string; key: string } | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [tab, setTab] = useState<"chemical" | "organic" | "prevention">("organic");
  const [history, setHistory] = useState<ScanRecord[]>([]);

  const analyse = async (src: string, key: string, c: Crop) => {
    setImage({ src, key });
    setResult(null);
    setAnalysing(true);
    try {
      const r = await detectDisease(src, c, key);
      setResult(r);
      setHistory((h) => [{ id: key + Date.now(), src, crop: c, result: r, at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }, ...h].slice(0, 5));
    } catch {
      toast({ title: "Couldn't read that image", body: "Try a JPG or PNG photo of a single leaf.", tone: "alert" });
      setImage(null);
    } finally {
      setAnalysing(false);
    }
  };

  const onFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Please upload a photo", body: "JPG, PNG or WebP of the affected leaf.", tone: "alert" });
      return;
    }
    analyse(URL.createObjectURL(f), f.name + f.size, crop);
  };

  const top = result?.predictions[0];
  const sevTone = result?.severity === "severe" ? "alert" : result?.severity === "moderate" ? "progress" : "success";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="info" dot>Computer vision · Disease detection</Badge>}
        title="Crop Doctor"
        description="Photograph an affected leaf. AGRENSE finds lesion regions, predicts the likely disease and recommends organic and chemical treatment."
        actions={image && !analysing && <Button variant="secondary" onClick={() => { setImage(null); setResult(null); }}><RotateCcw /> New scan</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardHeader icon={<Leaf strokeWidth={1.7} />} title="Leaf photo" />
            <div className="no-scrollbar max-w-full overflow-x-auto">
              <Segmented<Crop> label="Crop" size="sm" value={crop} onChange={(c) => { setCrop(c); if (image) analyse(image.src, image.key, c); }} options={DISEASE_CROPS.map((c) => ({ value: c, label: c }))} />
            </div>
          </div>

          {!image ? (
            <>
              <Dropzone className="mt-5" accept="image/*" onFile={onFile} title="Upload or drop a leaf photo" hint="Fill the frame with one leaf, in daylight and without flash. Both sides help." />
              <p className="mb-2 mt-5 text-[13px] font-medium text-ink">Or try a sample</p>
              <ul className="grid grid-cols-3 gap-3">
                {SAMPLES.map((s) => (
                  <li key={s.src}>
                    <button type="button" onClick={() => { setCrop(s.crop); analyse(s.src, s.src, s.crop); }} className="group w-full overflow-hidden rounded-[18px] border border-line bg-ivory text-left transition-shadow hover:shadow-float">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.src} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className="block px-3 py-2">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{s.label}</span>
                        <span className="text-[11px] text-muted">{s.note}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="relative mt-5 flex justify-center overflow-hidden rounded-[20px] bg-ivory ring-1 ring-line">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="Leaf being analysed" className="block max-h-[460px] w-auto max-w-full" />
                {result && !result.healthy && (
                  <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    {result.regions.map((r, i) => (
                      <ellipse key={i} cx={r.x * 100} cy={r.y * 100} rx={r.r * 100} ry={r.r * 100} fill="rgba(233,165,42,.18)" stroke="#e9a52a" strokeWidth="2" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                )}
              </div>
              {analysing && (
                <span className="pointer-events-none absolute inset-0">
                  <span className="absolute inset-x-0 h-28 animate-[scan-line_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-wheat/25 to-olive/40" />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1.5 text-[12.5px] text-white backdrop-blur">Segmenting lesions…</span>
                </span>
              )}
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-[12px] text-muted">
            <Cpu className="size-3.5" aria-hidden /> Lesion segmentation runs in your browser. Disease classification is simulated (cropnet-demo-0.3) until the ML endpoint is connected.
          </p>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          {!result && !analysing && (
            <Card className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-champagne text-olive"><ScanSearch className="size-8" aria-hidden /></span>
              <p className="mt-4 font-display text-[19px] font-semibold text-ink">No photo analysed yet</p>
              <p className="mt-1 max-w-sm text-[14px] text-muted">Upload a leaf photo or pick a sample. The diagnosis, severity and treatment plan will appear here.</p>
              <ul className="mt-6 grid w-full max-w-md gap-2 text-left text-[13px]">
                {["Covers 14 diseases across 5 crops", "Shows affected area and severity", "Organic options listed first"].map((t) => (
                  <li key={t} className="flex items-center gap-2 rounded-xl bg-ivory px-3 py-2 ring-1 ring-line"><CheckCircle2 className="size-4 text-olive" aria-hidden />{t}</li>
                ))}
              </ul>
            </Card>
          )}

          {analysing && (
            <Card className="space-y-4 p-6">
              <p className="font-display text-[18px] font-semibold text-ink">Analysing {crop.toLowerCase()} leaf…</p>
              {["Colour segmentation", "Lesion localisation", "Disease classification"].map((s, i) => (
                <div key={s}>
                  <p className="mb-1.5 text-[13px] text-muted">{s}</p>
                  <ProgressBar value={100} className={cn("[&>div]:animate-pulse", i === 2 && "opacity-60")} />
                </div>
              ))}
            </Card>
          )}

          {result && top && (
            <>
              <Card className="animate-rise p-5 sm:p-6">
                <div className="flex items-start gap-5">
                  <Ring value={top.confidence * 100} size={88} stroke={8} tone={result.healthy ? "olive" : result.severity === "severe" ? "alert" : "amber"}>
                    <span className="text-center">
                      <span className="block font-display text-[20px] font-bold leading-none text-ink">{Math.round(top.confidence * 100)}%</span>
                      <span className="text-[10.5px] text-muted">confidence</span>
                    </span>
                  </Ring>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {result.healthy ? <Badge tone="success" dot>Healthy</Badge> : <Badge tone={sevTone} dot>{result.severity} infection</Badge>}
                      <Badge tone="neutral">{result.crop}</Badge>
                    </div>
                    <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">{top.name}</h2>
                    <p className="text-[14px] italic text-muted">{top.pathogen}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Affected area", `${result.affectedArea}%`],
                    ["Lesion hotspots", `${result.regions.length}`],
                    ["Inference", `${(result.inferenceMs / 1000).toFixed(1)} s`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-[16px] bg-ivory p-3 ring-1 ring-line">
                      <dt className="text-[11.5px] text-muted">{k}</dt>
                      <dd className="font-display text-[20px] font-bold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5">
                  <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wide text-muted">Differential diagnosis</p>
                  <ul className="space-y-2">
                    {result.predictions.map((p) => (
                      <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                        <span className="truncate text-[13.5px] text-ink">{p.name}</span>
                        <span className="text-[13px] font-medium text-ink">{Math.round(p.confidence * 100)}%</span>
                        <ProgressBar value={p.confidence * 100} tone={p === top ? "olive" : "amber"} className="col-span-2 h-1.5" />
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <CardHeader icon={<ClipboardList strokeWidth={1.7} />} title="Symptoms & treatment" />
                <ul className="mt-3 space-y-1.5">
                  {result.symptoms.map((s) => (
                    <li key={s} className="flex gap-2 text-[14px] text-ink/85"><Bug className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />{s}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Segmented label="Treatment type" value={tab} onChange={setTab} options={[{ value: "organic", label: "Organic" }, { value: "chemical", label: "Chemical" }, { value: "prevention", label: "Prevention" }]} />
                </div>
                <ul className="mt-3 space-y-2">
                  {result[tab].map((s) => (
                    <li key={s} className="flex items-start gap-2.5 rounded-[14px] bg-ivory p-3 text-[14px] text-ink ring-1 ring-line">
                      {tab === "chemical" ? <FlaskConical className="mt-0.5 size-4 shrink-0 text-olive" /> : tab === "organic" ? <Leaf className="mt-0.5 size-4 shrink-0 text-olive" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0 text-olive" />}
                      {s}
                    </li>
                  ))}
                </ul>
                {tab === "chemical" && <p className="mt-2 text-[12px] text-muted">Follow the label dose and pre-harvest interval. Wear protective equipment.</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink href={`/krishi-ai?q=${encodeURIComponent(result.healthy ? `How do I keep my ${result.crop.toLowerCase()} crop healthy?` : `How do I manage ${top.name} in ${result.crop.toLowerCase()}?`)}`} size="sm"><Sparkles /> Ask Krishi AI</ButtonLink>
                  <Button size="sm" variant="secondary" onClick={() => toast({ title: "Saved to field log", body: `${top.name} · ${result.crop} · ${new Date().toLocaleDateString("en-IN")}` })}><ClipboardList /> Save to field log</Button>
                </div>
              </Card>
            </>
          )}

          {history.length > 1 && (
            <Card className="p-5">
              <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink"><History className="size-[18px] text-olive" aria-hidden />Recent scans <DemoTag label="This session" /></p>
              <ul className="mt-3 space-y-2">
                {history.slice(1).map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.src} alt="" className="size-11 rounded-xl object-cover ring-1 ring-line" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{h.result.predictions[0].name}</span>
                      <span className="text-[12px] text-muted">{h.crop} · {h.at}</span>
                    </span>
                    <span className="text-[13px] font-medium text-ink">{Math.round(h.result.predictions[0].confidence * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
