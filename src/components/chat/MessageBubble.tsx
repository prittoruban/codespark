"use client";

import { Markdown } from "@/components/ui/Markdown";
import { agent } from "@/services";
import { useAppState } from "@/lib/app-state";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { speak } from "@/services/voice";
import { BookOpenCheck, Check, ChevronDown, Copy, Pause, Sparkles, ThumbsDown, ThumbsUp, Volume2, Wrench } from "lucide-react";
import { useState } from "react";

export function MessageBubble({ message, onFollowUp, speakingId, setSpeakingId }: { message: ChatMessage; onFollowUp: (q: string) => void; speakingId: string | null; setSpeakingId: (id: string | null) => void }) {
  const { toast } = useAppState();
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  if (message.role === "user") {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[85%] space-y-2 sm:max-w-[70%]">
          {message.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.image} alt="Uploaded crop photo" className="ml-auto max-h-56 rounded-[18px] border border-line object-cover" />
          )}
          <p className="rounded-[20px] rounded-br-md bg-olive px-4 py-3 text-[15px] leading-relaxed text-white">{message.content}</p>
        </div>
      </div>
    );
  }

  const speaking = speakingId === message.id;
  const toggleSpeak = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(message.id);
    speak(message.content.split("\n---\n")[0], message.lang, { onEnd: () => setSpeakingId(null) });
  };

  return (
    <div className="animate-rise flex gap-3">
      <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage-300 to-olive text-white">
        <Sparkles className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 max-w-[min(100%,720px)] flex-1">
        <div className="rounded-[20px] rounded-tl-md border border-line bg-card px-4 py-4 shadow-card sm:px-5">
          {!!message.tools?.length && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <Wrench className="size-3.5 text-muted" aria-hidden />
              {message.tools.map((t) => (
                <span key={t.tool} title={t.output} className="rounded-full bg-ivory px-2.5 py-1 text-[11.5px] font-medium text-ink/75 ring-1 ring-line">
                  {agent.TOOL_META[t.tool].label}
                </span>
              ))}
            </div>
          )}
          <Markdown text={message.content} />

          {!!message.citations?.length && (
            <div className="mt-4 border-t border-line pt-3">
              <button type="button" onClick={() => setShowSources((s) => !s)} aria-expanded={showSources} className="flex items-center gap-2 text-[13px] font-medium text-olive-deep">
                <BookOpenCheck className="size-4" aria-hidden />
                {message.citations.length} source{message.citations.length > 1 ? "s" : ""} from the knowledge base
                <ChevronDown className={cn("size-4 transition-transform", showSources && "rotate-180")} aria-hidden />
              </button>
              {showSources && (
                <ol className="mt-3 space-y-2">
                  {message.citations.map((c, i) => (
                    <li key={c.id} className="rounded-2xl bg-ivory p-3 ring-1 ring-line">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13.5px] font-semibold text-ink">
                          <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-sage-100 text-[11px] text-olive-deep">{i + 1}</span>
                          {c.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted">match {Math.round(c.score * 100)}%</span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium text-olive">{c.source}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">“{c.snippet}”</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1 pl-1">
          <button type="button" onClick={toggleSpeak} aria-label={speaking ? "Stop reading aloud" : "Read aloud"} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium hover:bg-champagne", speaking ? "text-olive" : "text-muted")}>
            {speaking ? <Pause className="size-3.5" /> : <Volume2 className="size-3.5" />}
            {speaking ? "Stop" : "Listen"}
          </button>
          <button
            type="button"
            aria-label="Copy answer"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast({ title: "Copy not available", tone: "alert" });
              }
            }}
            className="rounded-full p-2 text-muted hover:bg-champagne"
          >
            {copied ? <Check className="size-3.5 text-olive" /> : <Copy className="size-3.5" />}
          </button>
          <button type="button" aria-label="Helpful" aria-pressed={vote === "up"} onClick={() => { setVote("up"); toast({ title: "Thanks for the feedback" }); }} className={cn("rounded-full p-2 hover:bg-champagne", vote === "up" ? "text-olive" : "text-muted")}>
            <ThumbsUp className="size-3.5" />
          </button>
          <button type="button" aria-label="Not helpful" aria-pressed={vote === "down"} onClick={() => { setVote("down"); toast({ title: "Feedback noted", body: "This answer will be reviewed by an agronomist.", tone: "info" }); }} className={cn("rounded-full p-2 hover:bg-champagne", vote === "down" ? "text-alert" : "text-muted")}>
            <ThumbsDown className="size-3.5" />
          </button>
        </div>

        {!!message.followUps?.length && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.followUps.map((f) => (
              <button key={f} type="button" onClick={() => onFollowUp(f)} className="rounded-full border border-line bg-card px-3.5 py-2 text-left text-[13px] text-ink/85 transition-colors hover:border-sage-200 hover:bg-sage-50">
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
