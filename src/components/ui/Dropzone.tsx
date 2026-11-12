"use client";

import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export function Dropzone({ accept, onFile, title, hint, children, className }: { accept: string; onFile: (file: File) => void; title: string; hint: string; children?: ReactNode; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition-colors",
        over ? "border-olive bg-sage-50" : "border-line bg-ivory hover:border-peach",
        className,
      )}
    >
      <span className="mb-3 inline-flex size-14 items-center justify-center rounded-full bg-champagne text-olive">
        <UploadCloud className="size-7" aria-hidden />
      </span>
      <p className="font-display text-[17px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{hint}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-11 items-center rounded-full bg-olive px-5 text-sm font-medium text-white hover:bg-olive-deep">
          Browse files
        </button>
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={title}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
