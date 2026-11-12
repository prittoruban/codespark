import { BarChart3, BookOpen, CloudSun, FlaskConical, Home, Leaf, Mic, ScanSearch, Sparkles, Tractor, Workflow, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  key: string; // i18n key
  icon: LucideIcon;
  keywords: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", key: "nav.overview", icon: Home, keywords: "dashboard home overview" },
  { href: "/farms", key: "nav.farms", icon: Tractor, keywords: "farms fields acreage" },
  { href: "/soil", key: "nav.soil", icon: FlaskConical, keywords: "soil health card ocr npk ph carbon" },
  { href: "/fertilizer", key: "nav.fertilizer", icon: Leaf, keywords: "fertilizer urea dap npk dose recommendation" },
  { href: "/krishi-ai", key: "nav.krishi", icon: Sparkles, keywords: "chat assistant rag questions advisory" },
  { href: "/voice", key: "nav.voice", icon: Mic, keywords: "voice speak multilingual hindi tamil telugu" },
  { href: "/crop-doctor", key: "nav.doctor", icon: ScanSearch, keywords: "disease photo leaf detection diagnosis" },
  { href: "/weather", key: "nav.weather", icon: CloudSun, keywords: "weather rain forecast irrigation" },
  { href: "/agent", key: "nav.agent", icon: Workflow, keywords: "agent tools routing planner" },
];

export const WORKSPACE_NAV: NavItem[] = [
  { href: "/reports", key: "nav.reports", icon: BarChart3, keywords: "reports export trends" },
  { href: "/resources", key: "nav.resources", icon: BookOpen, keywords: "knowledge library resources guides" },
];

export const MOBILE_NAV = ["/", "/krishi-ai", "/crop-doctor", "/weather"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
