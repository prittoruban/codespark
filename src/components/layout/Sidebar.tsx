"use client";

import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Landscape } from "./Landscape";
import { Logo, LogoMark } from "./Logo";
import { isActive, PRIMARY_NAV, WORKSPACE_NAV, type NavItem } from "./nav";

function NavLink({ item, compact, onNavigate, small }: { item: NavItem; compact?: boolean; onNavigate?: () => void; small?: boolean }) {
  const pathname = usePathname();
  const { t } = useAppState();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={compact ? t(item.key) : undefined}
      className={cn(
        "group flex items-center rounded-2xl transition-colors",
        compact ? "mx-auto size-12 justify-center" : small ? "gap-3 px-4 py-2" : "gap-3.5 px-4 py-[11px]",
        active ? "bg-[#eef0c9] text-forest" : "text-ink/85 hover:bg-champagne hover:text-ink",
      )}
    >
      <Icon className={cn("shrink-0", small ? "size-[18px]" : "size-[21px]", active ? "text-forest" : "text-ink/70 group-hover:text-olive")} strokeWidth={1.7} aria-hidden />
      {!compact && <span className={cn("truncate", small ? "text-[14px]" : "text-[15.5px]", active && "font-medium")}>{t(item.key)}</span>}
    </Link>
  );
}

export function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const { t } = useAppState();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 pb-7 pt-6">
        <Link href="/" onClick={onNavigate} aria-label="AGRENSE home">
          <Logo />
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-2 text-muted hover:bg-champagne">
            <X className="size-5" />
          </button>
        )}
      </div>
      <nav aria-label="Primary" className="scrollbar-thin relative z-10 flex-1 overflow-y-auto px-3 pb-48">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <div className="mx-4 my-5 h-px bg-line" />
        <button type="button" onClick={() => setWorkspaceOpen((o) => !o)} aria-expanded={workspaceOpen} className="flex w-full items-center justify-between rounded-xl px-4 py-1.5 text-[14.5px] text-ink/70 hover:text-ink">
          {t("nav.workspace")}
          <ChevronDown className={cn("size-4 transition-transform", !workspaceOpen && "-rotate-90")} aria-hidden />
        </button>
        {workspaceOpen && (
          <ul className="mt-1.5 space-y-0.5">
            {WORKSPACE_NAV.map((item) => (
              <li key={item.href}>
                <NavLink item={item} onNavigate={onNavigate} small />
              </li>
            ))}
          </ul>
        )}
      </nav>
      <Landscape className="pointer-events-none absolute inset-x-0 bottom-0 h-[210px] w-full" />
    </div>
  );
}

/** Desktop (xl+) full sidebar and tablet (md–xl) icon rail. */
export function Sidebar({ onExpand }: { onExpand: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line/70 bg-gradient-to-b from-[#fbf4e8] to-[#f7eedf] xl:block">
        <SidebarContent />
      </aside>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-line/70 bg-[#faf2e5] py-5 md:flex xl:hidden">
        <button type="button" onClick={onExpand} aria-label="Expand navigation" className="mb-6 rounded-2xl p-1 hover:bg-champagne">
          <LogoMark />
        </button>
        <nav aria-label="Primary" className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto">
          {[...PRIMARY_NAV, ...WORKSPACE_NAV].map((item) => (
            <NavLink key={item.href} item={item} compact />
          ))}
        </nav>
      </aside>
    </>
  );
}
