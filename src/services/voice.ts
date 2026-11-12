"use client";

import { SUGGESTED_PROMPTS } from "@/data/knowledge-base";
import { speechCode } from "@/lib/i18n";
import type { Language } from "@/lib/types";

/**
 * Voice I/O built on the browser Web Speech API (SpeechRecognition + speechSynthesis).
 * When recognition is unavailable or blocked (e.g. Firefox, no microphone),
 * it falls back to a clearly labelled simulated transcript so the demo flow
 * still works. Swap for a server ASR/TTS (e.g. Bhashini) later.
 */

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return !!getRecognition();
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string, simulated: boolean) => void;
  onError?: (message: string) => void;
}

/** Starts listening. Returns a stop function. */
export function listen(lang: Language, h: ListenHandlers): () => void {
  const Ctor = getRecognition();
  let simulatedTimer: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  const simulate = () => {
    const samples = SUGGESTED_PROMPTS[lang];
    const text = samples[Math.floor(Math.random() * samples.length)];
    const words = text.split(" ");
    let i = 0;
    const step = () => {
      if (done) return;
      i++;
      h.onInterim(words.slice(0, i).join(" "));
      if (i < words.length) simulatedTimer = setTimeout(step, 140);
      else {
        done = true;
        h.onFinal(text, true);
      }
    };
    simulatedTimer = setTimeout(step, 600);
  };

  if (!Ctor) {
    simulate();
    return () => {
      done = true;
      if (simulatedTimer) clearTimeout(simulatedTimer);
    };
  }

  const rec = new Ctor();
  rec.lang = speechCode(lang);
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";
  let heard = false;
  // Some browsers accept start() but never deliver audio (no mic, blocked device).
  const watchdog = setTimeout(() => {
    if (!heard && !done) {
      try {
        rec.abort();
      } catch {}
      simulate();
    }
  }, 4000);
  (rec as unknown as { onaudiostart: () => void }).onaudiostart = () => {
    heard = true;
  };
  rec.onresult = (e) => {
    heard = true;
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    h.onInterim(finalText + interim);
  };
  rec.onerror = (e) => {
    clearTimeout(watchdog);
    if (done || simulatedTimer) return;
    // Mic denied / offline / no speech service → fall back to the simulated transcript.
    if (e.error === "no-speech") {
      done = true;
      h.onError?.("No speech detected. Try again.");
      return;
    }
    simulate();
  };
  rec.onend = () => {
    if (done || simulatedTimer) return;
    if (finalText.trim()) {
      done = true;
      h.onFinal(finalText.trim(), false);
    }
  };
  try {
    rec.start();
  } catch {
    simulate();
  }
  return () => {
    clearTimeout(watchdog);
    if (simulatedTimer) {
      done = true;
      clearTimeout(simulatedTimer);
      return;
    }
    rec.stop();
  };
}

export function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[-•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[#>`]/g, "");
}

/** Speaks text in the chosen language. Returns a cancel function. */
export function speak(text: string, lang: Language, handlers: { onStart?: () => void; onEnd?: () => void } = {}) {
  if (!isSpeechSynthesisSupported()) {
    handlers.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(stripMarkdown(text));
  const code = speechCode(lang);
  u.lang = code;
  const voice = synth.getVoices().find((v) => v.lang === code) ?? synth.getVoices().find((v) => v.lang.startsWith(code.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.96;
  u.onstart = () => handlers.onStart?.();
  u.onend = () => handlers.onEnd?.();
  u.onerror = () => handlers.onEnd?.();
  synth.speak(u);
  return () => synth.cancel();
}
