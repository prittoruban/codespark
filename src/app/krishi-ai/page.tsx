import type { Metadata } from "next";
import { Suspense } from "react";
import { KrishiChat } from "./KrishiChat";

export const metadata: Metadata = { title: "Krishi AI" };

export default function KrishiAIPage() {
  return (
    <Suspense>
      <KrishiChat />
    </Suspense>
  );
}
