"use client";

import { Composer } from "@/components/chat/Composer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useAssistant } from "@/components/chat/useAssistant";
import { Badge, DemoTag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Field";
import { FARMS } from "@/data/farms";
import { KNOWLEDGE_BASE, SUGGESTED_PROMPTS } from "@/data/knowledge-base";
import { useAppState } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { agent } from "@/services";
import { speak } from "@/services/voice";
import { BookOpen, Database, Leaf, MessageSquarePlus, Sparkles, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function KrishiChat() {
  const { lang, setLang } = useAppState();
  const { messages, thinking, send, reset } = useAssistant(lang);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const sentInitial = useRef(false);

  const ask = async (text: string, image?: { src: string; name: string }) => {
    const reply = await send(text, image);
    if (reply && autoSpeak) {
      setSpeakingId(reply.id);
      speak(reply.content.split("\n---\n")[0], reply.lang, { onEnd: () => setSpeakingId(null) });
    }
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant"), [messages]);
  const farm = FARMS[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="flex h-[calc(100dvh-250px)] min-h-[520px] sm:h-[calc(100dvh-196px)] flex-col overflow-hidden md:h-[calc(100dvh-120px)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sage-300 to-olive text-white">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-[19px] font-semibold leading-tight text-ink">Krishi AI</h1>
              <p className="text-[12.5px] text-muted">Agricultural advisory · ICAR, TNAU, PPQS, IMD, KVK & SHC sources</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Language> label="Response language" size="sm" value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ value: l.code, label: l.native }))} />
            <button type="button" onClick={() => setAutoSpeak((a) => !a)} aria-pressed={autoSpeak} aria-label={autoSpeak ? "Turn off spoken replies" : "Turn on spoken replies"} title="Spoken replies" className={`flex size-9 items-center justify-center rounded-full border border-line ${autoSpeak ? "bg-sage-100 text-olive-deep" : "bg-card text-muted"} hover:bg-champagne`}>
              {autoSpeak ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <Button variant="secondary" size="sm" onClick={reset} disabled={!messages.length}>
              <MessageSquarePlus /> <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.length === 0 && !thinking ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-4 text-center sm:pt-10">
              <div className="relative mb-5 size-20 overflow-hidden rounded-[24px] shadow-card">
                <Image src="/images/healthy-leaves.jpg" alt="" fill sizes="80px" className="object-cover" />
              </div>
              <h2 className="font-display text-[24px] font-semibold tracking-[-0.01em] text-ink">Ask anything about your farm</h2>
              <p className="mt-2 max-w-md text-[15px] text-muted">Answers come from verified agronomy guidance and your live field data: weather, soil cards and crop stage. Speak, type or attach a photo.</p>
              <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-2" role="group" aria-label="Suggested questions">
                {SUGGESTED_PROMPTS[lang].map((p) => (
                  <button key={p} type="button" onClick={() => ask(p)} className="rounded-[18px] border border-line bg-ivory px-4 py-3.5 text-left text-[14px] text-ink transition-colors hover:border-sage-200 hover:bg-sage-50">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} onFollowUp={(q) => ask(q)} speakingId={speakingId} setSpeakingId={setSpeakingId} />)
          )}
          {thinking && (
            <div className="flex items-center gap-3" role="status">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sage-300 to-olive text-white">
                <Sparkles className="size-[18px] animate-pulse" aria-hidden />
              </span>
              <div className="flex items-center gap-2.5 rounded-full border border-line bg-ivory px-4 py-2.5 text-[13.5px] text-muted">
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-olive" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
                {thinking.label}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line bg-ivory/60 p-3 sm:p-4">
          <Composer onSend={ask} disabled={!!thinking} />
          <p className="mt-2 px-2 text-center text-[11.5px] text-muted">Advisory only. Confirm pesticide doses with the product label or your local KVK.</p>
        </div>
      </Card>

      <aside className="hidden flex-col gap-5 xl:flex">
        <Card className="overflow-hidden">
          <div className="relative h-28">
            <Image src={farm.image} alt="" fill sizes="340px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <p className="absolute bottom-3 left-4 font-display text-[16px] font-semibold text-white">{farm.name}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line p-4 text-center">
            {[
              ["Crop", farm.crop],
              ["Stage", farm.stage],
              ["Area", `${farm.areaHa} ha`],
            ].map(([k, v]) => (
              <div key={k} className="px-1">
                <p className="text-[11.5px] text-muted">{k}</p>
                <p className="truncate text-[14px] font-semibold text-ink">{v}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-3 text-[12.5px] text-muted">Answers use this field as context unless you name another field or crop.</p>
        </Card>

        <Card className="p-5">
          <CardHeader icon={<Database strokeWidth={1.7} />} title="Retrieval context" subtitle="Sources and tools behind the last answer" />
          {lastAssistant ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Tools called</p>
                <ul className="space-y-2">
                  {lastAssistant.tools?.map((t) => (
                    <li key={t.tool} className="rounded-2xl bg-ivory p-3 ring-1 ring-line">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-ink">{agent.TOOL_META[t.tool].label}</p>
                        <span className="text-[11px] text-muted">{t.ms} ms</span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-snug text-muted">{t.output}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Citations</p>
                {lastAssistant.citations?.length ? (
                  <ul className="space-y-1.5">
                    {lastAssistant.citations.map((c, i) => (
                      <li key={c.id} className="flex items-start gap-2 text-[13px]">
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-[11px] font-medium text-olive-deep">{i + 1}</span>
                        <span>
                          <span className="font-medium text-ink">{c.title}</span>
                          <span className="block text-[12px] text-muted">{c.source}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Badge tone="neutral">General guidance (no specific source)</Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-ivory p-4 text-[13px] text-muted ring-1 ring-line">Ask a question to see which documents and tools were used.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <BookOpen className="size-[18px] text-olive" aria-hidden /> Knowledge library
            </p>
            <DemoTag label="Demo corpus" />
          </div>
          <ul className="mt-3 space-y-1">
            {KNOWLEDGE_BASE.slice(0, 4).map((k) => (
              <li key={k.id}>
                <button type="button" onClick={() => ask(k.title)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[13px] text-ink/85 hover:bg-champagne">
                  <Leaf className="size-3.5 shrink-0 text-olive" aria-hidden />
                  {k.title}
                </button>
              </li>
            ))}
          </ul>
          <Link href="/resources" className="mt-2 inline-block px-2 text-[13px] font-medium text-olive hover:underline">
            Browse all {KNOWLEDGE_BASE.length} documents
          </Link>
        </Card>
      </aside>
    </div>
  );
}
