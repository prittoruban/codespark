import type { Metadata } from "next";
import { FertilizerOptimizer } from "./FertilizerOptimizer";

export const metadata: Metadata = { title: "Fertilizer Optimizer" };

export default function FertilizerPage() {
  return <FertilizerOptimizer />;
}
