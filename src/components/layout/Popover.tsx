"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

/** Lightweight popover: closes on outside click and Escape, restores focus to the trigger. */
export function Popover({ open, onClose, trigger, children, align = "right", className }: { open: boolean; onClose: () => void; trigger: ReactNode; children: ReactNode; align?: "left" | "right"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        (ref.current?.querySelector("button") as HTMLButtonElement | null)?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className={cn("animate-rise absolute top-[calc(100%+10px)] z-50 rounded-[20px] border border-line bg-card p-2 shadow-float", align === "right" ? "right-0" : "left-0", className)}>
          {children}
        </div>
      )}
    </div>
  );
}
