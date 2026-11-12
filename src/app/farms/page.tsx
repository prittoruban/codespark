import type { Metadata } from "next";
import { Suspense } from "react";
import { MyFarms } from "./MyFarms";

export const metadata: Metadata = { title: "My Farms" };

export default function FarmsPage() {
  return (
    <Suspense>
      <MyFarms />
    </Suspense>
  );
}
