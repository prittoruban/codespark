import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-olive text-white hover:bg-olive-deep shadow-[0_6px_16px_-8px_rgb(66_85_0/0.7)]",
  secondary: "bg-card text-ink border border-line hover:bg-champagne hover:border-peach",
  ghost: "text-ink hover:bg-champagne",
  dark: "bg-forest text-white hover:bg-[#2a3d11]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-[18px] [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

/** Round olive arrow/icon button used on cards in the reference. */
export function IconButton({ label, className, children, tone = "olive", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "olive" | "soft" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 [&_svg]:size-[18px]",
        tone === "olive" ? "bg-olive text-white hover:bg-olive-deep" : "border border-line bg-card text-ink hover:bg-champagne",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
