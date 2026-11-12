"use client";

import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, dismissToast } = useAppState();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end">
      {toasts.map((t) => {
        const Icon = t.tone === "alert" ? AlertTriangle : t.tone === "info" ? Info : CheckCircle2;
        return (
          <div key={t.id} className="animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-float">
            <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "alert" ? "text-alert" : "text-olive")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
            </div>
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="rounded-full p-1 text-muted hover:bg-champagne hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
