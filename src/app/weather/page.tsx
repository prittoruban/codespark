import type { Metadata } from "next";
import { WeatherIntelligence } from "./WeatherIntelligence";

export const metadata: Metadata = { title: "Weather Intelligence" };

export default function WeatherPage() {
  return <WeatherIntelligence />;
}
