import type { Metadata } from "next";
import { Resources } from "./Resources";

export const metadata: Metadata = { title: "Knowledge Library" };

export default function ResourcesPage() {
  return <Resources />;
}
