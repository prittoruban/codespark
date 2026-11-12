"use client";

import { CURRENT_USER } from "@/data/farms";
import { useAppState } from "@/lib/app-state";
import { useNow } from "@/lib/hooks";
import { CalendarDays } from "lucide-react";

export function Greeting() {
  const { t } = useAppState();
  const now = useNow();
  const h = now?.getHours() ?? 9;
  const key = h < 12 ? "greet.morning" : h < 17 ? "greet.afternoon" : "greet.evening";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[34px]">
          {t(key)}, {CURRENT_USER.firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-[15.5px] text-ink/75 sm:text-[17px]">{t("greet.sub")}</p>
      </div>
      <p className="inline-flex h-10 w-fit items-center gap-2.5 rounded-full bg-champagne/80 px-4 text-[14.5px] text-ink">
        <CalendarDays className="size-[18px] text-ink/75" aria-hidden />
        <span suppressHydrationWarning>{now ? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : " "}</span>
      </p>
    </div>
  );
}
