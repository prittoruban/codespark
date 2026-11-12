import type { Metadata } from "next";
import { SoilIntelligence } from "./SoilIntelligence";

export const metadata: Metadata = { title: "Soil Intelligence" };

export default function SoilPage() {
  return <SoilIntelligence />;
}
