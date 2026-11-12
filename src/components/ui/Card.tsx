import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, as: Tag = "section", ...props }: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return <Tag className={cn("rounded-[24px] border border-line bg-card shadow-card", className)} {...props} />;
}

export function CardHeader({ icon, title, subtitle, action, className }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="shrink-0 text-olive [&_svg]:size-[22px]">{icon}</span>}
        <div className="min-w-0">
          <h2 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
