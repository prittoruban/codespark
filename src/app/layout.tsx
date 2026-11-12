import { AppShell } from "@/components/layout/AppShell";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "AGRENSE · Agricultural Intelligence", template: "%s · AGRENSE" },
  description: "AI-powered multilingual agricultural advisory and sustainable fertilizer optimization (HARVEST ZERO).",
};

export const viewport: Viewport = { themeColor: "#F8F3EA", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
