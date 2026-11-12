"use client";

import { CURRENT_USER, FARMS } from "@/data/farms";
import { KNOWLEDGE_BASE } from "@/data/knowledge-base";
import { useAppState } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Bell, BookOpen, Check, ChevronDown, Globe, MapPin, Menu, Search, Sparkles, Tractor } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LogoMark } from "./Logo";
import { PRIMARY_NAV, WORKSPACE_NAV } from "./nav";
import { Popover } from "./Popover";

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  href: string;
  kind: "page" | "farm" | "advisory";
}

function useSearch(query: string) {
  const { t } = useAppState();
  return useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pages = [...PRIMARY_NAV, ...WORKSPACE_NAV]
      .filter((n) => (t(n.key) + " " + n.keywords).toLowerCase().includes(q))
      .map((n) => ({ id: n.href, label: t(n.key), sub: "Module", href: n.href, kind: "page" as const }));
    const farms = FARMS.filter((f) => `${f.name} ${f.crop} ${f.village} ${f.variety}`.toLowerCase().includes(q)).map((f) => ({ id: f.id, label: f.name, sub: `${f.crop} · ${f.areaHa} ha · ${f.village}`, href: `/farms?field=${f.id}`, kind: "farm" as const }));
    const docs = KNOWLEDGE_BASE.filter((k) => `${k.title} ${k.keywords.join(" ")}`.toLowerCase().includes(q)).map((k) => ({ id: k.id, label: k.title, sub: k.source, href: `/krishi-ai?q=${encodeURIComponent(k.title)}`, kind: "advisory" as const }));
    return [...pages, ...farms, ...docs].slice(0, 8);
  }, [query, t]);
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { lang, setLang, t, notifications, markAllRead, markRead, toast } = useAppState();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<"lang" | "bell" | "profile" | null>(null);
  const results = useSearch(query);
  const unread = notifications.filter((n) => !n.read).length;
  const current = LANGUAGES.find((l) => l.code === lang)!;

  const go = (r: SearchResult) => {
    router.push(r.href);
    setQuery("");
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-2 flex flex-wrap items-center gap-x-3 gap-y-2.5 sm:flex-nowrap bg-canvas/85 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:bg-transparent md:px-0 md:py-4 md:backdrop-blur-none">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-full p-2 text-ink hover:bg-champagne md:hidden">
        <Menu className="size-5" />
      </button>
      <Link href="/" className="md:hidden" aria-label="AGRENSE home">
        <LogoMark className="size-8" />
      </Link>

      {/* Search */}
      <div className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 md:max-w-[480px]">
        <label htmlFor="global-search" className="sr-only">
          Search
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[19px] -translate-y-1/2 text-ink/70" aria-hidden />
        <input
          id="global-search"
          role="combobox"
          aria-expanded={searchOpen && results.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              if (results[active]) go(results[active]);
              else if (query.trim()) {
                router.push(`/krishi-ai?q=${encodeURIComponent(query.trim())}`);
                setQuery("");
              }
            } else if (e.key === "Escape") setSearchOpen(false);
          }}
          placeholder={t("search.placeholder")}
          className="h-11 w-full rounded-full border border-white/60 bg-card/90 pl-11 pr-4 text-[14.5px] text-ink shadow-card placeholder:text-muted focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/10 md:h-12"
        />
        {searchOpen && query.trim() && (
          <ul id="search-results" role="listbox" className="animate-rise absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-96 overflow-y-auto rounded-[20px] border border-line bg-card p-2 shadow-float">
            {results.map((r, i) => {
              const Icon = r.kind === "farm" ? Tractor : r.kind === "advisory" ? BookOpen : PRIMARY_NAV.concat(WORKSPACE_NAV).find((n) => n.href === r.href)?.icon ?? Search;
              return (
                <li key={r.kind + r.id} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)} onMouseEnter={() => setActive(i)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active && "bg-champagne")}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ivory text-olive">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{r.label}</span>
                      <span className="block truncate text-xs text-muted">{r.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { router.push(`/krishi-ai?q=${encodeURIComponent(query.trim())}`); setQuery(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-olive-deep hover:bg-champagne">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sage-50"><Sparkles className="size-[18px]" aria-hidden /></span>
                Ask Krishi AI: “{query.trim()}”
              </button>
            </li>
          </ul>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Language */}
        <Popover
          open={open === "lang"}
          onClose={() => setOpen(null)}
          trigger={
            <button type="button" onClick={() => setOpen(open === "lang" ? null : "lang")} aria-haspopup="listbox" aria-expanded={open === "lang"} aria-label={`Language: ${current.label}`} className="flex h-11 items-center gap-2 rounded-full border border-white/60 bg-card/90 px-3 text-[14.5px] text-ink shadow-card hover:bg-card md:h-12 md:px-4">
              <Globe className="size-5 text-ink/80" aria-hidden />
              <span className="hidden sm:inline">{current.native}</span>
              <ChevronDown className="hidden size-4 sm:block" aria-hidden />
            </button>
          }
          className="w-52"
        >
          <ul role="listbox" aria-label="Language">
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(null);
                    toast({ title: `Language set to ${l.label}`, body: "Navigation, Krishi AI and voice replies now use this language.", tone: "info" });
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-champagne"
                >
                  <span>
                    <span className="font-medium text-ink">{l.native}</span>
                    <span className="ml-2 text-xs text-muted">{l.label}</span>
                  </span>
                  {l.code === lang && <Check className="size-4 text-olive" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </Popover>

        {/* Notifications */}
        <Popover
          open={open === "bell"}
          onClose={() => setOpen(null)}
          trigger={
            <button type="button" onClick={() => setOpen(open === "bell" ? null : "bell")} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open === "bell"} className="relative flex size-11 items-center justify-center rounded-full border border-white/60 bg-card/90 shadow-card hover:bg-card md:size-12">
              <Bell className="size-[21px] text-ink/85" aria-hidden />
              {unread > 0 && <span className="absolute right-2.5 top-2 size-2.5 rounded-full border-2 border-card bg-[#e8572a]" />}
            </button>
          }
          className="w-[min(360px,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
            <p className="font-display text-[15px] font-semibold">Notifications</p>
            <button type="button" onClick={markAllRead} className="text-xs font-medium text-olive hover:underline disabled:opacity-40" disabled={!unread}>
              Mark all read
            </button>
          </div>
          <ul className="space-y-1">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => { markRead(n.id); setOpen(null); }} className={cn("flex gap-3 rounded-2xl px-3 py-2.5 hover:bg-champagne", !n.read && "bg-ivory")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : n.tone === "alert" ? "bg-alert" : n.tone === "caution" ? "bg-amber" : "bg-olive")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{n.title}</span>
                    <span className="block text-[13px] text-muted">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-muted/80">{n.time}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Popover>

        {/* Profile */}
        <Popover
          open={open === "profile"}
          onClose={() => setOpen(null)}
          trigger={
            <button type="button" onClick={() => setOpen(open === "profile" ? null : "profile")} aria-expanded={open === "profile"} aria-label="Account menu" className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 hover:bg-card/60 lg:pr-2">
              <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-wheat to-amber font-display text-[15px] font-semibold text-white ring-2 ring-card md:size-12">{CURRENT_USER.initials}</span>
              <span className="hidden text-left lg:block">
                <span className="block text-[15.5px] font-semibold leading-tight text-ink">{CURRENT_USER.name}</span>
                <span className="block text-[13px] text-muted">{CURRENT_USER.role}</span>
              </span>
              <ChevronDown className="hidden size-4 text-ink lg:block" aria-hidden />
            </button>
          }
          className="w-64"
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="text-sm font-semibold text-ink">{CURRENT_USER.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3" aria-hidden />
              {CURRENT_USER.role} · {CURRENT_USER.location}
            </p>
          </div>
          <ul className="pt-1.5">
            {[
              { href: "/farms", label: "My farms" },
              { href: "/reports", label: "Season reports" },
              { href: "/resources", label: "Knowledge library" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(null)} className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-champagne">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mx-3 mt-2 rounded-xl bg-ivory px-3 py-2 text-[11px] text-muted">Frontend demo: data comes from simulated services.</p>
        </Popover>
      </div>
    </header>
  );
}
