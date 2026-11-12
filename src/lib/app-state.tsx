"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate } from "./i18n";
import type { Language, SoilReport } from "./types";
import { uid } from "./utils";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
  tone: "info" | "caution" | "alert";
  read: boolean;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone?: "success" | "info" | "alert";
}

interface AppState {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  soilReport: SoilReport | null;
  setSoilReport: (r: SoilReport | null) => void;
  notifications: AppNotification[];
  markAllRead: () => void;
  markRead: (id: string) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const Ctx = createContext<AppState | null>(null);

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "Rain expected in 48 h", body: "Hold urea top-dressing on Field A until the rain passes.", time: "12 min ago", href: "/weather", tone: "caution", read: false },
  { id: "n2", title: "Field D moisture critical", body: "Soil moisture at 18%. Groundnut is pegging and needs irrigation.", time: "1 h ago", href: "/farms", tone: "alert", read: false },
  { id: "n3", title: "Soil Health Card digitised", body: "Card TN/TVL/2026/004817 was extracted with 96% confidence.", time: "Yesterday", href: "/soil", tone: "info", read: true },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [soilReport, setSoilReportState] = useState<SoilReport | null>(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setLangState(readStorage<Language>("agrense.lang", "en"));
    setSoilReportState(readStorage<SoilReport | null>("agrense.soilReport", null));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    writeStorage("agrense.lang", l);
  }, []);
  const setSoilReport = useCallback((r: SoilReport | null) => {
    setSoilReportState(r);
    writeStorage("agrense.soilReport", r);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid("toast");
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
      soilReport,
      setSoilReport,
      notifications,
      markAllRead: () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true }))),
      markRead: (id) => setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))),
      toasts,
      toast,
      dismissToast,
    }),
    [lang, setLang, soilReport, setSoilReport, notifications, toasts, toast, dismissToast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
