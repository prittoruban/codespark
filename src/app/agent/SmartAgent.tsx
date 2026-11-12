"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppState } from "@/lib/app-state";
import type { AgentRun, AgentStepResult, ToolName } from "@/lib/types";
import { cn } from "@/lib/utils";
import { agent } from "@/services";
import { ArrowDown, ArrowRight, BookOpen, Brain, Check, CloudSun, FlaskConical, IndianRupee, Leaf, Loader2, MessageSquareText, Play, ScanSearch, Sparkles, Workflow } from "lucide-react";
import { useState } from "react";

const TOOL_ICON: Record<ToolName, typeof Leaf> = {
  knowledge_base: BookOpen,
  weather: CloudSun,
  soil_analysis: FlaskConical,
  fertilizer_optimizer: Leaf,
  disease_detection: ScanSearch,
  market_prices: IndianRupee,
};

const EXAMPLES = [
  "Should I top-dress urea on Field A this week?",
  "Yellow stripes on my wheat leaves. What disease is it?",
  "When should I irrigate Field D groundnut?",
  "What is the paddy price at the Kanchipuram mandi?",
  "Is my soil too acidic for maize?",
];

type StepState = "pending" | "running" | "done";

export function SmartAgent() {
  const { lang } = useAppState();
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [hasImage, setHasImage] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [states, setStates] = useState<Record<string, StepState>>({});
  const [results, setResults] = useState<AgentStepResult[]>([]);
  const [answer, setAnswer] = useState<Awaited<ReturnType<typeof agent.synthesize>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"route" | "tools" | "synth" | "done" | null>(null);

  const execute = async (q = query) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setAnswer(null);
    setResults([]);
    setPhase("route");
    setRun(null);
    await new Promise((r) => setTimeout(r, 700));
    const r = agent.route(q, { hasImage });
    setRun(r);
    setStates(Object.fromEntries(r.plan.map((s) => [s.id, "pending" as StepState])));
    setPhase("tools");
    const out: AgentStepResult[] = [];
    for (const step of r.plan) {
      setStates((s) => ({ ...s, [step.id]: "running" }));
      const res = await agent.executeStep(step, q, { hasImage, lang });
      out.push(res);
      setResults([...out]);
      setStates((s) => ({ ...s, [step.id]: "done" }));
    }
    setPhase("synth");
    await new Promise((r2) => setTimeout(r2, 600));
    setAnswer(await agent.synthesize(r, out, lang));
    setPhase("done");
    setBusy(false);
  };

  const totalMs = results.reduce((s, r) => s + r.ms, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="info" dot>Agentic workflow · Tool routing</Badge>}
        title="Smart Agent"
        description="See how AGRENSE handles a question: classify the intent, pick the right tools, run them in order and combine the results into one grounded answer."
      />

      <Card className="p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute();
          }}
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <label htmlFor="agent-q" className="sr-only">Question for the agent</label>
          <div className="relative flex-1">
            <MessageSquareText className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input id="agent-q" value={query} onChange={(e) => setQuery(e.target.value)} className="h-13 w-full rounded-full border border-line bg-ivory py-3.5 pl-12 pr-4 text-[15.5px] focus:border-olive focus:bg-card focus:outline-none focus:ring-4 focus:ring-olive/10" placeholder="Ask a farm question…" />
          </div>
          <div className="lg:w-64">
            <Toggle id="has-image" checked={hasImage} onChange={setHasImage} label="Photo attached" description="Simulate an attached leaf photo" />
          </div>
          <Button type="submit" size="lg" loading={busy}>{!busy && <Play />} Run agent</Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" disabled={busy} onClick={() => { setQuery(e); execute(e); }} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] text-ink/85 hover:border-sage-200 hover:bg-sage-50 disabled:opacity-50">
              {e}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon={<Workflow strokeWidth={1.7} />} title="Execution trace" subtitle={run ? `${run.plan.length} tools · ${(totalMs / 1000).toFixed(1)} s` : "Run a query to see the agent work"} />

          {!phase && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-[20px] bg-ivory p-8 text-center ring-1 ring-line">
              <div className="flex items-center gap-2 text-muted">
                {[MessageSquareText, Brain, Workflow, Sparkles].map((I, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="flex size-11 items-center justify-center rounded-full bg-card text-olive ring-1 ring-line"><I className="size-5" aria-hidden /></span>
                    {i < 3 && <ArrowRight className="size-4" aria-hidden />}
                  </span>
                ))}
              </div>
              <p className="max-w-sm text-[14px] text-muted">Query → intent router → tools → grounded synthesis. Pick an example above to start.</p>
            </div>
          )}

          {phase && (
            <ol className="mt-5 space-y-3">
              <li className={cn("rounded-[20px] p-4 ring-1", phase === "route" ? "bg-champagne/70 ring-peach" : "bg-sage-50 ring-sage-100")}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-full", phase === "route" ? "bg-card text-amber" : "bg-olive text-white")}>
                    {phase === "route" ? <Loader2 className="size-5 animate-spin" /> : <Brain className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[16px] font-semibold text-ink">Intent router</p>
                    <p className="text-[13px] text-muted">{run ? <>Classified as <strong className="text-ink">{run.intent}</strong> · {Math.round(run.confidence * 100)}% confidence</> : "Classifying intent and extracting entities…"}</p>
                  </div>
                </div>
                {run && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pl-[52px]">
                    {run.entities.map((e) => (
                      <span key={e.label} className="rounded-full bg-card px-2.5 py-1 text-[12px] ring-1 ring-line"><span className="text-muted">{e.label}:</span> <span className="font-medium text-ink">{e.value}</span></span>
                    ))}
                  </div>
                )}
              </li>

              {run?.plan.map((step) => {
                const st = states[step.id];
                const res = results.find((r) => r.stepId === step.id);
                const Icon = TOOL_ICON[step.tool];
                return (
                  <li key={step.id}>
                    <ArrowDown className="mx-auto mb-2 size-4 text-line" aria-hidden />
                    <div className={cn("rounded-[20px] p-4 ring-1 transition-colors", st === "running" ? "bg-champagne/70 ring-peach" : st === "done" ? "bg-card ring-line" : "bg-ivory/60 ring-line/60 opacity-60")}>
                      <div className="flex items-center gap-3">
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", st === "done" ? "bg-sage-100 text-olive-deep" : "bg-card text-olive ring-1 ring-line")}>
                          {st === "running" ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" aria-hidden />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-display text-[15.5px] font-semibold text-ink">
                            {agent.TOOL_META[step.tool].label}
                            <code className="hidden rounded-md bg-ivory px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted ring-1 ring-line sm:inline">{step.tool}()</code>
                          </p>
                          <p className="text-[13px] text-muted">{step.reason}</p>
                        </div>
                        {st === "done" && res && <span className="shrink-0 text-[12px] text-muted">{res.ms} ms</span>}
                      </div>
                      {res && (
                        <div className="animate-rise mt-3 pl-[52px]">
                          <p className="text-[14px] text-ink/85">{res.output}</p>
                          {res.data && (
                            <dl className="mt-2.5 flex flex-wrap gap-2">
                              {Object.entries(res.data).map(([k, v]) => (
                                <div key={k} className="rounded-xl bg-ivory px-3 py-1.5 ring-1 ring-line">
                                  <dt className="text-[11px] text-muted">{k}</dt>
                                  <dd className="text-[13.5px] font-semibold text-ink">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}

              {(phase === "synth" || phase === "done") && (
                <li>
                  <ArrowDown className="mx-auto mb-2 size-4 text-line" aria-hidden />
                  <div className={cn("rounded-[20px] p-4 ring-1", phase === "synth" ? "bg-champagne/70 ring-peach" : "bg-sage-50 ring-sage-100")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("flex size-10 items-center justify-center rounded-full", phase === "synth" ? "bg-card text-amber" : "bg-olive text-white")}>
                        {phase === "synth" ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                      </span>
                      <div>
                        <p className="font-display text-[16px] font-semibold text-ink">Grounded synthesis</p>
                        <p className="text-[13px] text-muted">{phase === "synth" ? "Combining tool outputs with retrieved guidance…" : `Answer composed with ${answer?.citations.length ?? 0} citation${answer?.citations.length === 1 ? "" : "s"}`}</p>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ol>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <CardHeader icon={<Sparkles strokeWidth={1.7} />} title="Final answer" />
            {answer ? (
              <div className="animate-rise mt-4">
                <Markdown text={answer.text} />
                {answer.citations.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t border-line pt-3">
                    {answer.citations.map((c, i) => (
                      <li key={c.id} className="text-[12.5px] text-muted"><span className="font-medium text-olive-deep">[{i + 1}]</span> {c.title} · {c.source}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-ivory p-4 text-[13.5px] text-muted ring-1 ring-line">{busy ? "Waiting for tools to finish…" : "The combined answer will appear here."}</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader icon={<Workflow strokeWidth={1.7} />} title="Tool registry" subtitle="Each tool maps to a replaceable service" />
            <ul className="mt-4 space-y-2">
              {(Object.keys(agent.TOOL_META) as ToolName[]).map((t) => {
                const Icon = TOOL_ICON[t];
                const used = run?.plan.some((p) => p.tool === t);
                return (
                  <li key={t} className={cn("flex items-start gap-3 rounded-2xl p-3 ring-1", used ? "bg-sage-50 ring-sage-100" : "bg-ivory ring-line")}>
                    <Icon className={cn("mt-0.5 size-[18px] shrink-0", used ? "text-olive-deep" : "text-muted")} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{agent.TOOL_META[t].label}</p>
                      <p className="text-[12.5px] text-muted">{agent.TOOL_META[t].description}</p>
                    </div>
                    {used && <Badge tone="success">used</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
