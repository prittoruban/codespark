import { CROP_STAGES } from "@/data/farms";
import type { ApplicationSplit, FertilizerInput, FertilizerPlan, FertilizerProduct } from "@/lib/types";
import { round, sleep } from "@/lib/utils";

/**
 * Sustainable fertilizer recommendation engine (client-side estimation model).
 *
 * Method: start from the recommended dose of fertilizer (RDF) for the crop, scale it
 * to the target yield, adjust each nutrient for the soil-test rating (low +25%,
 * medium 0, high −25%; the usual Soil Health Card practice), add an organic-carbon
 * correction for N, and then turn the nutrient need into products.
 * Swap `optimize` for the ML recommendation API when it is available.
 */
export interface FertilizerService {
  optimize(input: FertilizerInput): Promise<FertilizerPlan>;
}

interface CropSpec {
  rdf: [number, number, number]; // N, P2O5, K2O kg/ha
  refYield: number; // t/ha
  splits: { at: string; nShare: number; label: string }[];
}

export const CROP_SPECS: Record<string, CropSpec> = {
  Wheat: { rdf: [120, 60, 40], refYield: 4.5, splits: [{ at: "Sowing", nShare: 0.5, label: "Basal" }, { at: "Crown root initiation", nShare: 0.25, label: "1st top-dress" }, { at: "Jointing", nShare: 0.25, label: "2nd top-dress" }] },
  Paddy: { rdf: [150, 50, 50], refYield: 5.5, splits: [{ at: "Transplanting", nShare: 0.25, label: "Basal" }, { at: "Tillering", nShare: 0.25, label: "Active tillering" }, { at: "Panicle initiation", nShare: 0.25, label: "Panicle initiation" }, { at: "Flowering", nShare: 0.25, label: "Heading" }] },
  Maize: { rdf: [150, 75, 75], refYield: 6, splits: [{ at: "Sowing", nShare: 0.25, label: "Basal" }, { at: "Knee-high", nShare: 0.5, label: "Knee-high" }, { at: "Tasseling", nShare: 0.25, label: "Tasseling" }] },
  Groundnut: { rdf: [25, 50, 75], refYield: 2.5, splits: [{ at: "Sowing", nShare: 1, label: "Basal" }, { at: "Pegging", nShare: 0, label: "Gypsum at pegging" }] },
  Cotton: { rdf: [120, 60, 60], refYield: 2.5, splits: [{ at: "Sowing", nShare: 0.33, label: "Basal" }, { at: "Squaring", nShare: 0.33, label: "Squaring" }, { at: "Flowering", nShare: 0.34, label: "Flowering" }] },
  Sugarcane: { rdf: [275, 62.5, 112.5], refYield: 100, splits: [{ at: "Germination", nShare: 0.33, label: "30 days" }, { at: "Tillering", nShare: 0.33, label: "60 days" }, { at: "Grand growth", nShare: 0.34, label: "90 days" }] },
  Tomato: { rdf: [150, 100, 60], refYield: 35, splits: [{ at: "Transplanting", nShare: 0.5, label: "Basal" }, { at: "Flowering", nShare: 0.25, label: "Flowering" }, { at: "Fruit set", nShare: 0.25, label: "Fruit set" }] },
};

/** Indicative subsidised retail prices, ₹/kg. Replace with a live price feed. */
export const PRICES = { urea: 5.92, dap: 27, mop: 34, vermicompost: 8, bio: 100 };

const ratingFactor = (value: number, low: number, high: number) => (value < low ? 1.25 : value > high ? 0.75 : 1);

function toProducts(n: number, p: number, k: number, input: FertilizerInput, withOrganic: boolean): FertilizerProduct[] {
  const area = input.areaHa;
  const items: FertilizerProduct[] = [];
  let nLeft = n;
  if (withOrganic) {
    const vcN = n * 0.25;
    const vc = vcN / 0.015; // vermicompost ~1.5% N
    nLeft -= vcN;
    items.push({ name: "Vermicompost", grade: "1.5-0.8-0.8", kgPerHa: round(vc), bagsTotal: round((vc * area) / 50), costPerHa: round(vc * PRICES.vermicompost), supplies: `${round(vcN)} kg N + organic carbon`, type: "organic" });
  }
  const dap = p / 0.46;
  nLeft -= dap * 0.18;
  if (dap > 0) items.push({ name: "DAP", grade: "18-46-0", kgPerHa: round(dap), bagsTotal: round((dap * area) / 50, 1), costPerHa: round(dap * PRICES.dap), supplies: `${round(p)} kg P₂O₅ + ${round(dap * 0.18)} kg N`, type: "chemical" });
  if (k > 0) {
    const mop = k / 0.6;
    items.push({ name: "Muriate of Potash", grade: "0-0-60", kgPerHa: round(mop), bagsTotal: round((mop * area) / 50, 1), costPerHa: round(mop * PRICES.mop), supplies: `${round(k)} kg K₂O`, type: "chemical" });
  }
  if (nLeft > 0) {
    const urea = nLeft / 0.46;
    items.unshift({ name: "Neem-coated Urea", grade: "46-0-0", kgPerHa: round(urea), bagsTotal: round((urea * area) / 45, 1), costPerHa: round(urea * PRICES.urea), supplies: `${round(nLeft)} kg N`, type: "chemical" });
  }
  if (withOrganic) items.push({ name: "Azospirillum + PSB", grade: "Biofertilizer", kgPerHa: 4, bagsTotal: round(4 * area), costPerHa: 4 * PRICES.bio, supplies: "Fixes N, solubilises P", type: "bio" });
  return items;
}

export function computePlan(input: FertilizerInput): FertilizerPlan {
  const spec = CROP_SPECS[input.crop] ?? CROP_SPECS.Wheat;
  const yieldScale = Math.min(1.4, Math.max(0.6, input.targetYield / spec.refYield));
  const ocFactor = input.OC < 0.5 ? 1.1 : input.OC > 0.75 ? 0.9 : 1;
  const rainfed = input.irrigation === "rainfed" ? 0.75 : 1;

  const N = round(spec.rdf[0] * yieldScale * ratingFactor(input.N, 280, 560) * ocFactor * rainfed);
  const P2O5 = round(spec.rdf[1] * yieldScale * ratingFactor(input.P, 10, 25) * rainfed);
  const K2O = round(spec.rdf[2] * yieldScale * ratingFactor(input.K, 110, 280) * rainfed);

  // Typical blanket practice: higher N, standard P, under-applied K.
  const blanket = { N: round(spec.rdf[0] * 1.3), P2O5: round(spec.rdf[1] * 1.15), K2O: round(spec.rdf[2] * 0.8) };

  const products = toProducts(N, P2O5, K2O, input, input.organicPreference);
  const conventional = toProducts(blanket.N, blanket.P2O5, blanket.K2O, input, false);
  const optimizedPerHa = round(products.reduce((s, p) => s + p.costPerHa, 0));
  const conventionalPerHa = round(conventional.reduce((s, p) => s + p.costPerHa, 0));

  const stages = CROP_STAGES[input.crop] ?? [];
  const currentIdx = stages.indexOf(input.stage);
  // Distribute urea N: the basal split is partly covered by N in DAP / vermicompost.
  const dapN = (P2O5 / 0.46) * 0.18;
  const vcN = input.organicPreference ? N * 0.25 : 0;
  const ureaN = Math.max(0, N - dapN - vcN);
  const basalShare = spec.splits[0].nShare;
  const basalUreaN = Math.min(ureaN, Math.max(0, N * basalShare - dapN - vcN));
  const laterUreaN = ureaN - basalUreaN;
  const ureaKgFor = (i: number, share: number) =>
    round((i === 0 ? basalUreaN : basalShare < 1 ? (laterUreaN * share) / (1 - basalShare) : 0) / 0.46);
  const schedule: ApplicationSplit[] = spec.splits.map((s, i) => {
    const idx = stages.indexOf(s.at);
    const nextIdx = i + 1 < spec.splits.length ? stages.indexOf(spec.splits[i + 1].at) : Infinity;
    const status = currentIdx >= nextIdx ? "done" : currentIdx >= idx ? "due" : "upcoming";
    const isBasal = i === 0;
    const products: string[] = [];
    if (s.label.startsWith("Gypsum")) products.push("Gypsum 400 kg/ha");
    const ureaKg = s.nShare > 0 ? ureaKgFor(i, s.nShare) : 0;
    if (ureaKg > 0) products.push(`Neem-coated urea ${ureaKg} kg/ha`);
    if (isBasal) {
      products.push(...productsBasal(input.organicPreference, P2O5 > 0, K2O > 0));
    }
    return {
      stage: s.label,
      timing: s.at,
      share: s.nShare > 0 ? `${Math.round(s.nShare * 100)}% N` : "Ca + S",
      products: products.join(" · ") || "No nitrogen at this stage",
      note: isBasal ? "Incorporate into the soil before sowing or transplanting." : "Apply into moist soil. Avoid if more than 20 mm of rain is forecast within 48 h.",
      status,
    };
  });

  const nitrogenSavedKg = round(Math.max(0, blanket.N - N) * input.areaHa);
  const totalOpt = N + P2O5 + K2O;
  const totalBlanket = blanket.N + blanket.P2O5 + blanket.K2O;

  const explanations: FertilizerPlan["explanations"] = [
    { basis: "guideline", text: `The ${input.crop.toLowerCase()} base recommendation is ${spec.rdf.join(":")} kg/ha N:P₂O₅:K₂O for a ${spec.refYield} t/ha reference yield.` },
    { basis: "model", text: `Scaled ×${round(yieldScale, 2)} for your ${input.targetYield} t/ha target yield${rainfed < 1 ? ", then reduced 25% for rainfed conditions" : ""}.` },
    { basis: "guideline", text: `Soil nitrogen at ${input.N} kg/ha is rated ${input.N < 280 ? "low (+25%)" : input.N > 560 ? "high (−25%)" : "medium (no change)"}. Phosphorus at ${input.P} kg/ha is ${input.P < 10 ? "low (+25%)" : input.P > 25 ? "high (−25%)" : "medium"}. Potassium at ${input.K} kg/ha is ${input.K < 110 ? "low (+25%)" : input.K > 280 ? "high (−25%)" : "medium"}.` },
  ];
  if (ocFactor !== 1) explanations.push({ basis: "model", text: `Organic carbon of ${input.OC}% ${ocFactor > 1 ? "is low, so the soil releases less nitrogen. N raised 10%" : "is high and releases extra nitrogen. N reduced 10%"}.` });
  if (input.pH < 6) explanations.push({ basis: "guideline", text: `pH ${input.pH} is strongly acidic. Apply agricultural lime before the next season, or phosphorus availability stays poor.` });
  if (input.pH > 8.5) explanations.push({ basis: "guideline", text: `pH ${input.pH} is sodic. Gypsum reclamation is recommended alongside this plan.` });
  if (input.organicPreference) explanations.push({ basis: "model", text: "25% of the nitrogen comes from vermicompost, plus a biofertilizer seed treatment, to build soil carbon." });
  explanations.push({ basis: "guideline", text: "Neem-coated urea in split doses reduces leaching and volatilisation losses compared with a single application." });

  return {
    input,
    required: { N, P2O5, K2O },
    blanket,
    products,
    schedule,
    cost: { optimizedPerHa, conventionalPerHa, savingsTotal: round((conventionalPerHa - optimizedPerHa) * input.areaHa) },
    impact: {
      nitrogenSavedKg,
      // IPCC Tier 1: 1% of applied N lost as N₂O-N; ×44/28 to N₂O; GWP100 of N₂O = 273.
      n2oAvoidedKgCO2e: round(nitrogenSavedKg * 0.01 * (44 / 28) * 273),
      runoffRisk: N > 160 ? "high" : N > 110 && input.irrigation === "irrigated" ? "moderate" : "low",
      efficiencyGain: Math.max(0, round(((totalBlanket - totalOpt) / totalBlanket) * 100)),
    },
    explanations,
    confidence: round(0.82 + (input.N && input.P && input.K ? 0.08 : 0) + (input.OC ? 0.03 : 0), 2),
  };
}

function productsBasal(organic: boolean, p: boolean, k: boolean) {
  const out: string[] = [];
  if (p) out.push("DAP (full dose)");
  if (k) out.push("MOP (full dose)");
  if (organic) out.push("Vermicompost + biofertilizer");
  return out;
}

export const mockFertilizerService: FertilizerService = {
  async optimize(input) {
    await sleep(1100);
    return computePlan(input);
  },
};
