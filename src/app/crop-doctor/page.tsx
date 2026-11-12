import type { Metadata } from "next";
import { CropDoctor } from "./CropDoctor";

export const metadata: Metadata = { title: "Crop Doctor" };

export default function CropDoctorPage() {
  return <CropDoctor />;
}
