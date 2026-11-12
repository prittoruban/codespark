import type { Metadata } from "next";
import { SmartAgent } from "./SmartAgent";

export const metadata: Metadata = { title: "Smart Agent" };

export default function Page() {
  return <SmartAgent />;
}
