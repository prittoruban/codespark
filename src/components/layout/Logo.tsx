import { cn } from "@/lib/utils";

export const BRAND = { name: "AGRENSE", tagline: "Agricultural Intelligence" };

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-10", className)} aria-hidden>
      <path d="M8 40c2-15 12-27 32-32-2 17-11 28-26 30" fill="#8aa62a" />
      <path d="M14 38C17 25 26 15 40 8 32 20 24 30 14 38Z" fill="#425500" />
      <path d="M6 44c6-9 14-16 24-21" stroke="#425500" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[25px] font-bold tracking-[0.01em] text-olive-deep">{BRAND.name}</span>
          <span className="mt-1 block text-[12.5px] text-ink/75">{BRAND.tagline}</span>
        </span>
      )}
    </span>
  );
}
