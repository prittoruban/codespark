"use client";

import { Toaster } from "@/components/ui/Toaster";
import { AppStateProvider } from "@/lib/app-state";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar, SidebarContent } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <AppStateProvider>
      <div className="app-backdrop min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-olive focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Sidebar onExpand={() => setDrawer(true)} />

        {drawer && (
          <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
            <div className="animate-rise absolute inset-y-0 left-0 w-[284px] max-w-[85vw] bg-gradient-to-b from-[#fbf4e8] to-[#f7eedf] shadow-float">
              <SidebarContent onNavigate={() => setDrawer(false)} onClose={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <div className="md:pl-[88px] xl:pl-[264px]">
          <div className="mx-auto max-w-[1600px] px-4 pb-28 md:px-6 md:pb-10 xl:px-8">
            <Header onMenu={() => setDrawer(true)} />
            <main id="main" className="min-w-0">
              {children}
            </main>
          </div>
        </div>
        <MobileNav onMenu={() => setDrawer(true)} />
        <Toaster />
      </div>
    </AppStateProvider>
  );
}
