"use client";

import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, MOBILE_NAV, PRIMARY_NAV } from "./nav";

export function MobileNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { t } = useAppState();
  const items = MOBILE_NAV.map((h) => PRIMARY_NAV.find((n) => n.href === h)!);
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-forest" : "text-muted")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-[#eef0c9]")}>
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="max-w-[72px] truncate">{t(item.key).split(" ")[0]}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted">
            <span className="flex h-7 w-12 items-center justify-center">
              <Menu className="size-5" aria-hidden />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
