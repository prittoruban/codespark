"use client";

import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { listen } from "@/services/voice";
import { ImagePlus, Mic, SendHorizontal, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface Attachment {
  src: string;
  name: string;
}

export function Composer({ onSend, disabled }: { onSend: (text: string, image?: Attachment) => void; disabled?: boolean }) {
  const { lang, t, toast } = useAppState();
  const [text, setText] = useState("");
  const [image, setImage] = useState<Attachment | null>(null);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(160, el.scrollHeight) + "px";
  }, [text]);

  useEffect(() => () => stopRef.current?.(), []);

  const submit = () => {
    if (disabled || (!text.trim() && !image)) return;
    onSend(text, image ?? undefined);
    setText("");
    setImage(null);
  };

  const toggleMic = () => {
    if (listening) {
      stopRef.current?.();
      setListening(false);
      return;
    }
    setListening(true);
    stopRef.current = listen(lang, {
      onInterim: (s) => setText(s),
      onFinal: (s, simulated) => {
        setListening(false);
        setText(s);
        if (simulated) toast({ title: "Simulated voice input", body: "Speech recognition isn't available in this browser, so a sample question was used.", tone: "info" });
      },
      onError: (m) => {
        setListening(false);
        toast({ title: m, tone: "alert" });
      },
    });
  };

  const onFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Please choose an image", body: "JPG, PNG or WebP photos of the crop work best.", tone: "alert" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ src: String(reader.result), name: f.name + f.size });
    reader.readAsDataURL(f);
  };

  return (
    <div className="rounded-[24px] border border-line bg-card p-2 shadow-float">
      {image && (
        <div className="flex items-center gap-3 px-2 pb-2 pt-1">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="Attached crop photo" className="size-16 rounded-xl object-cover ring-1 ring-line" />
            <button type="button" onClick={() => setImage(null)} aria-label="Remove photo" className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-ink text-white">
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-[13px] text-muted">Photo attached. Crop Doctor will analyse it with your question.</p>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach crop photo" className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink/70 hover:bg-champagne hover:text-olive">
          <ImagePlus className="size-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Upload crop photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <textarea
          id="chat-input"
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={listening ? t("chat.listening") : t("chat.placeholder")}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          aria-pressed={listening}
          className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors", listening ? "bg-alert-soft text-alert" : "text-ink/70 hover:bg-champagne hover:text-olive")}
        >
          {listening && <span className="animate-pulse-ring absolute inset-0 rounded-full bg-alert/30" />}
          {listening ? <Square className="size-4" fill="currentColor" /> : <Mic className="size-5" />}
        </button>
        <button type="button" onClick={submit} disabled={disabled || (!text.trim() && !image)} aria-label="Send message" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-olive text-white transition-colors hover:bg-olive-deep disabled:bg-line disabled:text-muted">
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}
