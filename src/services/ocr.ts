import type { NutrientKey, NutrientStatus, OcrStage, SoilParameter, SoilReport } from "@/lib/types";
import { hashString, round, seeded, sleep, uid } from "@/lib/utils";

/**
 * Soil Health Card OCR service.
 * The mock walks through the same stages a real pipeline would (pre-processing →
 * layout detection → text recognition → field mapping → validation) and returns
 * a structured SoilReport. Replace `extract` with a call to the OCR backend.
 */
export interface OcrService {
  stages: OcrStage[];
  extract(file: { name: string; size: number }, onStage: (index: number) => void): Promise<SoilReport>;
}

export const OCR_STAGES: OcrStage[] = [
  { id: "pre", label: "Pre-processing image", detail: "Deskew, denoise, contrast normalisation" },
  { id: "layout", label: "Detecting card layout", detail: "Locating header, parameter table, recommendations" },
  { id: "ocr", label: "Recognising text", detail: "Multilingual OCR (English, Hindi, Tamil, Telugu)" },
  { id: "map", label: "Mapping fields", detail: "Matching values to the 12 Soil Health Card parameters" },
  { id: "validate", label: "Validating values", detail: "Range checks and confidence scoring" },
];

interface ParamSpec {
  key: NutrientKey;
  label: string;
  unit: string;
  range: [number, number];
  classify: (v: number) => NutrientStatus;
}

/** Ratings follow the common Soil Health Card thresholds. */
export const PARAM_SPECS: ParamSpec[] = [
  { key: "N", label: "Nitrogen", unit: "kg/ha", range: [280, 560], classify: (v) => (v < 280 ? "low" : v <= 560 ? "medium" : "high") },
  { key: "P", label: "Phosphorus", unit: "kg/ha", range: [10, 25], classify: (v) => (v < 10 ? "low" : v <= 25 ? "medium" : "high") },
  { key: "K", label: "Potassium", unit: "kg/ha", range: [110, 280], classify: (v) => (v < 110 ? "low" : v <= 280 ? "medium" : "high") },
  { key: "pH", label: "Soil pH", unit: "", range: [6.5, 7.5], classify: (v) => (v < 6.5 ? "acidic" : v <= 7.5 ? "normal" : "alkaline") },
  { key: "EC", label: "Electrical conductivity", unit: "dS/m", range: [0, 1], classify: (v) => (v <= 1 ? "normal" : "high") },
  { key: "OC", label: "Organic carbon", unit: "%", range: [0.5, 0.75], classify: (v) => (v < 0.5 ? "low" : v <= 0.75 ? "medium" : "high") },
  { key: "S", label: "Sulphur", unit: "ppm", range: [10, 20], classify: (v) => (v < 10 ? "deficient" : "sufficient") },
  { key: "Zn", label: "Zinc", unit: "ppm", range: [0.6, 1.2], classify: (v) => (v < 0.6 ? "deficient" : "sufficient") },
  { key: "Fe", label: "Iron", unit: "ppm", range: [4.5, 9], classify: (v) => (v < 4.5 ? "deficient" : "sufficient") },
  { key: "Cu", label: "Copper", unit: "ppm", range: [0.2, 0.4], classify: (v) => (v < 0.2 ? "deficient" : "sufficient") },
  { key: "Mn", label: "Manganese", unit: "ppm", range: [2, 4], classify: (v) => (v < 2 ? "deficient" : "sufficient") },
  { key: "B", label: "Boron", unit: "ppm", range: [0.5, 1], classify: (v) => (v < 0.5 ? "deficient" : "sufficient") },
];

export function buildParameter(key: NutrientKey, value: number, confidence: number): SoilParameter {
  const spec = PARAM_SPECS.find((p) => p.key === key)!;
  return { key, label: spec.label, unit: spec.unit, range: spec.range, value, confidence, status: spec.classify(value) };
}

/** Values printed on the bundled sample card (public/samples/soil-health-card.svg). */
const SAMPLE_VALUES: Record<NutrientKey, number> = { N: 212, P: 18.4, K: 245, pH: 6.4, EC: 0.42, OC: 0.48, S: 11.2, Zn: 0.52, Fe: 6.8, Cu: 0.92, Mn: 4.1, B: 0.62 };

export const mockOcrService: OcrService = {
  stages: OCR_STAGES,
  async extract(file, onStage) {
    for (let i = 0; i < OCR_STAGES.length; i++) {
      onStage(i);
      await sleep(650 + (i === 2 ? 700 : 0));
    }
    onStage(OCR_STAGES.length);

    const isSample = file.name.startsWith("soil-health-card");
    const rand = seeded(hashString(file.name + file.size));
    // Uploaded files get plausible values varied around the sample, seeded by file identity.
    const vary = (v: number, spread: number, digits: number) => (isSample ? v : round(v * (1 + (rand() - 0.5) * spread), digits));

    const parameters = PARAM_SPECS.map((spec) => {
      const base = SAMPLE_VALUES[spec.key];
      const digits = base < 2 ? 2 : base < 20 ? 1 : 0;
      const value = vary(base, spec.key === "pH" ? 0.25 : 0.6, digits);
      const confidence = round(isSample ? 0.93 + rand() * 0.06 : 0.78 + rand() * 0.2, 2);
      return buildParameter(spec.key, value, confidence);
    });

    return {
      id: uid("shc"),
      cardNumber: isSample ? "TN/TVL/2026/004817" : `TN/${String(hashString(file.name)).slice(0, 3)}/2026/${String(hashString(file.name)).slice(3, 9)}`,
      farmerName: "Pritto Ruban",
      village: "Tiruvallur",
      district: "Tiruvallur, Tamil Nadu",
      surveyNo: "142/3B",
      sampleDate: "2026-10-04",
      labName: "District Soil Testing Laboratory, Tiruvallur",
      sourceFile: file.name,
      parameters,
      overallConfidence: round(parameters.reduce((s, p) => s + p.confidence, 0) / parameters.length, 2),
    };
  },
};

/** Historical cards for Field A, used for trend comparison. */
export const SOIL_HISTORY: { season: string; N: number; P: number; K: number; OC: number; pH: number }[] = [
  { season: "Rabi 2023", N: 248, P: 21.0, K: 268, OC: 0.55, pH: 6.7 },
  { season: "Kharif 2024", N: 236, P: 19.6, K: 259, OC: 0.52, pH: 6.6 },
  { season: "Rabi 2025", N: 224, P: 19.1, K: 251, OC: 0.5, pH: 6.5 },
];
