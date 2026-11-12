"use client";

import { useAssistant } from "@/components/chat/useAssistant";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { SUGGESTED_PROMPTS } from "@/data/knowledge-base";
import { useAppState } from "@/lib/app-state";
import { LANGUAGES, speechCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isSpeechRecognitionSupported, isSpeechSynthesisSupported, listen, speak } from "@/services/voice";
import { Check, Keyboard, Languages, Mic, MicOff, Pause, Play, SendHorizontal, Sparkles, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "listening" | "thinking" | "speaking";

function Waveform({ active, bars = 28 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn("w-[4px] rounded-full bg-olive/80", active ? "animate-wave" : "")}
          style={{ height: `${active ? 18 + ((i * 37) % 30) : 6}px`, animationDelay: `${(i % 7) * 90}ms`, opacity: active ? 1 : 0.35 }}
        />
      ))}
    </div>
  );
}

export function VoiceAssistant() {
  const { lang, setLang, t, toast } = useAppState();
  const { messages, send, thinking } = useAssistant(lang);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [caps, setCaps] = useState({ asr: false, tts: false, voice: false });
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const check = () => {
      const tts = isSpeechSynthesisSupported();
      const voices = tts ? window.speechSynthesis.getVoices() : [];
      setCaps({ asr: isSpeechRecognitionSupported(), tts, voice: voices.some((v) => v.lang.startsWith(speechCode(lang).slice(0, 2))) });
    };
    check();
    if (isSpeechSynthesisSupported()) window.speechSynthesis.onvoiceschanged = check;
    return () => {
      stopRef.current?.();
      if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
    };
  }, [lang]);

  const respond = async (text: string) => {
    setPhase("thinking");
    setTranscript(text);
    const reply = await send(text);
    if (!reply) {
      setPhase("idle");
      return;
    }
    if (!caps.tts) {
      setPhase("idle");
      return;
    }
    setPhase("speaking");
    speak(reply.content.split("\n---\n")[0], lang, { onEnd: () => setPhase("idle") });
  };

  const start = () => {
    if (phase === "speaking") window.speechSynthesis?.cancel();
    if (phase === "listening") {
      stopRef.current?.();
      setPhase("idle");
      return;
    }
    setTranscript("");
    setPhase("listening");
    stopRef.current = listen(lang, {
      onInterim: setTranscript,
      onFinal: (text, simulated) => {
        if (simulated) toast({ title: "Simulated voice input", body: "Microphone speech recognition isn't available here, so a sample question was used.", tone: "info" });
        respond(text);
      },
      onError: (m) => {
        setPhase("idle");
        toast({ title: m, tone: "alert" });
      },
    });
  };

  const last = [...messages].reverse().find((m) => m.role === "assistant");
  const orbLabel = phase === "listening" ? t("chat.listening") : phase === "thinking" ? thinking?.label ?? "…" : phase === "speaking" ? t("voice.speaking") : t("voice.tap");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge tone="info" dot>Multilingual · Speech in, speech out</Badge>}
        title="Voice Assistant"
        description="Talk to AGRENSE in your own language. Ask about crops, weather, soil or fertilizer, hands-free in the field."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-champagne/80 to-transparent" />
          <div className="relative flex flex-col items-center text-center">
            <div role="radiogroup" aria-label="Voice language" className="flex flex-wrap justify-center gap-2">
              {LANGUAGES.map((l) => (
                <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)} disabled={phase !== "idle"} className={cn("rounded-full border px-4 py-2 text-[14px] transition-colors disabled:opacity-50", lang === l.code ? "border-olive bg-olive text-white" : "border-line bg-card text-ink hover:bg-champagne")}>
                  {l.native}
                </button>
              ))}
            </div>

            <div className="relative my-10 flex size-[220px] items-center justify-center sm:size-[250px]">
              {(phase === "listening" || phase === "speaking") && (
                <>
                  <span className="animate-pulse-ring absolute inset-6 rounded-full bg-olive/20" />
                  <span className="animate-pulse-ring absolute inset-6 rounded-full bg-wheat/30" style={{ animationDelay: ".6s" }} />
                </>
              )}
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#fff4e0] to-[#ffe2b8] shadow-[inset_0_2px_12px_rgba(255,255,255,.8)]" />
              <span className="absolute inset-5 rounded-full border border-white/70 bg-gradient-to-br from-[#fffaf2] to-[#ffeccc]" />
              <button
                type="button"
                onClick={start}
                disabled={phase === "thinking"}
                aria-label={phase === "listening" ? "Stop listening" : phase === "speaking" ? "Stop speaking and ask again" : "Start speaking"}
                className={cn("relative z-10 flex size-28 items-center justify-center rounded-full text-white shadow-float transition-transform hover:scale-[1.03] disabled:cursor-progress sm:size-32", phase === "listening" ? "bg-gradient-to-br from-[#d0602a] to-alert" : "bg-gradient-to-br from-sage-400 to-olive-deep")}
              >
                {phase === "listening" ? <Square className="size-9" fill="currentColor" /> : phase === "thinking" ? <Sparkles className="size-10 animate-pulse" /> : phase === "speaking" ? <Volume2 className="size-10" /> : <Mic className="size-11" />}
              </button>
            </div>

            <p className="font-display text-[19px] font-semibold text-ink" aria-live="polite">{orbLabel}</p>
            <Waveform active={phase === "listening" || phase === "speaking"} />
            <p className="mt-2 min-h-[52px] max-w-xl text-[17px] leading-relaxed text-ink/85">{transcript ? `“${transcript}”` : <span className="text-muted">{SUGGESTED_PROMPTS[lang][0]}</span>}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {phase === "speaking" && (
                <Button variant="secondary" size="sm" onClick={() => { window.speechSynthesis?.cancel(); setPhase("idle"); }}><Pause /> Stop reply</Button>
              )}
              {phase === "idle" && last && caps.tts && (
                <Button variant="secondary" size="sm" onClick={() => { setPhase("speaking"); speak(last.content.split("\n---\n")[0], last.lang, { onEnd: () => setPhase("idle") }); }}><Play /> Replay answer</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowKeyboard((s) => !s)} aria-expanded={showKeyboard}><Keyboard /> Type instead</Button>
            </div>
            {showKeyboard && (
              <form
                className="mt-3 flex w-full max-w-xl gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim() && phase === "idle") {
                    respond(typed.trim());
                    setTyped("");
                  }
                }}
              >
                <label htmlFor="voice-typed" className="sr-only">Type your question</label>
                <input id="voice-typed" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("chat.placeholder")} className="h-12 flex-1 rounded-full border border-line bg-ivory px-5 text-[15px] focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/10" />
                <button type="submit" aria-label="Ask" disabled={phase !== "idle"} className="flex size-12 items-center justify-center rounded-full bg-olive text-white hover:bg-olive-deep disabled:opacity-50"><SendHorizontal className="size-5" /></button>
              </form>
            )}
          </div>

          {last && (
            <div className="animate-rise relative mt-8 rounded-[20px] border border-line bg-ivory p-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-olive-deep"><Sparkles className="size-4" /> AGRENSE replied in {LANGUAGES.find((l) => l.code === last.lang)?.native}</p>
              <Markdown text={last.content.split("\n---\n")[0]} />
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <CardHeader icon={<Languages strokeWidth={1.7} />} title="Speech capabilities" subtitle="Checked in this browser" />
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {[
                ["Speech recognition", caps.asr, caps.asr ? `Web Speech API (${speechCode(lang)})` : "Not supported. Simulated input is used"],
                ["Spoken replies", caps.tts, caps.tts ? "speechSynthesis available" : "Not supported. Text replies only"],
                [`Native ${LANGUAGES.find((l) => l.code === lang)?.label} voice`, caps.voice, caps.voice ? "Installed on this device" : "Not installed. Default voice used"],
              ].map(([k, ok, d]) => (
                <li key={k as string} className="flex items-start gap-3 rounded-2xl bg-ivory p-3 ring-1 ring-line">
                  <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", ok ? "bg-sage-100 text-olive-deep" : "bg-champagne text-[#8a5a00]")}>{ok ? <Check className="size-3.5" /> : <MicOff className="size-3.5" />}</span>
                  <span>
                    <span className="block font-medium text-ink">{k as string}</span>
                    <span className="block text-[12.5px] text-muted">{d as string}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-muted">Production plan: route speech through a server ASR/TTS for all 22 scheduled Indian languages.</p>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader icon={<Mic strokeWidth={1.7} />} title="Try saying" />
            <ul className="mt-3 space-y-2">
              {SUGGESTED_PROMPTS[lang].map((p) => (
                <li key={p}>
                  <button type="button" disabled={phase !== "idle"} onClick={() => respond(p)} className="w-full rounded-[16px] border border-line bg-card px-4 py-3 text-left text-[14px] text-ink transition-colors hover:border-sage-200 hover:bg-sage-50 disabled:opacity-50">
                    “{p}”
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {messages.length > 0 && (
            <Card className="p-5 sm:p-6">
              <CardHeader icon={<Volume2 strokeWidth={1.7} />} title="Conversation" subtitle={`${messages.filter((m) => m.role === "user").length} turns this session`} />
              <ol className="scrollbar-thin mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {messages.map((m) => (
                  <li key={m.id} className={cn("rounded-2xl px-3.5 py-2.5 text-[13.5px]", m.role === "user" ? "ml-8 bg-olive text-white" : "mr-8 bg-ivory text-ink ring-1 ring-line")}>
                    {m.role === "user" ? m.content : m.content.split("\n")[0].replace(/\*\*/g, "")}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
