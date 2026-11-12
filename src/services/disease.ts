"use client";

import type { DiseasePrediction, DiseaseResult } from "@/lib/types";
import { clamp, hashString, round, seeded, sleep } from "@/lib/utils";

/**
 * Crop disease detection.
 * Stage 1 (runs for real, on-device): colour segmentation of the photo to separate
 * healthy tissue from lesion-coloured pixels and estimate affected area / hotspots.
 * Stage 2 (simulated): disease classification. Replace `classify` with the
 * CNN / ViT inference endpoint; keep the DiseaseResult shape.
 */

interface DiseaseInfo {
  name: string;
  pathogen: string;
  tone: "yellow" | "brown";
  symptoms: string[];
  organic: string[];
  chemical: string[];
  prevention: string[];
}

export const DISEASE_CROPS = ["Wheat", "Paddy", "Maize", "Tomato", "Groundnut"] as const;

const DB: Record<string, DiseaseInfo[]> = {
  Wheat: [
    { name: "Yellow (stripe) rust", pathogen: "Puccinia striiformis", tone: "yellow", symptoms: ["Yellow powdery pustules in stripes along veins", "Leaves dry from the tip in severe cases"], organic: ["Remove volunteer wheat plants that carry inoculum", "Spray 5% neem seed kernel extract early (suppressive only)"], chemical: ["Propiconazole 25 EC @ 1 ml/L at first appearance", "Repeat after 15 days if new pustules appear"], prevention: ["Grow resistant varieties", "Avoid excess nitrogen", "Scout weekly in cool, humid spells"] },
    { name: "Spot blotch", pathogen: "Bipolaris sorokiniana", tone: "brown", symptoms: ["Oval dark-brown lesions with yellow halos", "Lesions merge into blotches on lower leaves"], organic: ["Seed treatment with Trichoderma viride @ 4 g/kg", "Balanced potash nutrition"], chemical: ["Propiconazole 25 EC @ 1 ml/L", "Tebuconazole 25.9 EC @ 1 ml/L"], prevention: ["Timely sowing", "Crop rotation with legumes", "Use certified seed"] },
    { name: "Powdery mildew", pathogen: "Blumeria graminis", tone: "yellow", symptoms: ["White-grey powdery patches on leaves", "Yellowing beneath the patches"], organic: ["Sulphur dust", "Improve air movement with recommended spacing"], chemical: ["Wettable sulphur 80 WP @ 2 g/L"], prevention: ["Avoid dense sowing", "Balanced nitrogen"] },
  ],
  Paddy: [
    { name: "Blast", pathogen: "Magnaporthe oryzae", tone: "brown", symptoms: ["Spindle-shaped lesions with grey centres and brown margins", "Neck rot in severe cases"], organic: ["Pseudomonas fluorescens @ 10 g/kg seed and foliar 0.2%", "Avoid excess nitrogen"], chemical: ["Tricyclazole 75 WP @ 0.6 g/L", "Azoxystrobin 23 SC @ 1 ml/L"], prevention: ["Resistant varieties", "Split nitrogen", "Remove infected stubble"] },
    { name: "Brown spot", pathogen: "Bipolaris oryzae", tone: "brown", symptoms: ["Oval brown spots with grey centres", "Common on nutrient-poor soils"], organic: ["Correct potassium and silicon deficiency", "Seed treatment with Trichoderma"], chemical: ["Mancozeb 75 WP @ 2.5 g/L"], prevention: ["Balanced fertilization", "Use healthy seed"] },
    { name: "Bacterial leaf blight", pathogen: "Xanthomonas oryzae pv. oryzae", tone: "yellow", symptoms: ["Yellow-white lesions from leaf tips with wavy margins", "Milky ooze in the morning"], organic: ["Drain field and avoid flooding from infected fields", "Fresh cow-dung extract spray 20%"], chemical: ["Streptocycline 0.15 g/L + copper oxychloride 2.5 g/L"], prevention: ["Avoid clipping seedling tips", "Balanced nitrogen"] },
  ],
  Maize: [
    { name: "Turcicum leaf blight", pathogen: "Exserohilum turcicum", tone: "brown", symptoms: ["Long cigar-shaped grey-green to tan lesions", "Starts on lower leaves"], organic: ["Crop rotation", "Destroy infected residue"], chemical: ["Mancozeb 75 WP @ 2.5 g/L", "Azoxystrobin + difenoconazole @ 1 ml/L"], prevention: ["Resistant hybrids", "Timely sowing"] },
    { name: "Common rust", pathogen: "Puccinia sorghi", tone: "brown", symptoms: ["Cinnamon-brown pustules on both leaf surfaces"], organic: ["Remove alternate hosts (Oxalis)"], chemical: ["Mancozeb 75 WP @ 2.5 g/L"], prevention: ["Resistant hybrids"] },
    { name: "Maydis leaf blight", pathogen: "Bipolaris maydis", tone: "yellow", symptoms: ["Small tan lesions with buff to brown borders"], organic: ["Residue management"], chemical: ["Mancozeb 75 WP @ 2.5 g/L"], prevention: ["Crop rotation"] },
  ],
  Tomato: [
    { name: "Early blight", pathogen: "Alternaria solani", tone: "brown", symptoms: ["Brown spots with concentric target rings", "Yellowing around lesions on older leaves"], organic: ["Remove and destroy affected lower leaves", "Spray Bacillus subtilis or neem oil 3%"], chemical: ["Mancozeb 75 WP @ 2.5 g/L", "Chlorothalonil 75 WP @ 2 g/L"], prevention: ["Mulch to prevent soil splash", "Stake plants for airflow", "Rotate away from solanaceous crops"] },
    { name: "Late blight", pathogen: "Phytophthora infestans", tone: "brown", symptoms: ["Water-soaked dark lesions spreading fast", "White mould on leaf undersides in humid weather"], organic: ["Copper hydroxide (permitted in organic systems)", "Remove infected plants immediately"], chemical: ["Metalaxyl + mancozeb @ 2.5 g/L", "Cymoxanil + mancozeb @ 3 g/L"], prevention: ["Avoid overhead irrigation", "Wider spacing"] },
    { name: "Leaf curl virus", pathogen: "Tomato leaf curl virus (whitefly-borne)", tone: "yellow", symptoms: ["Upward curling and yellowing of leaves", "Stunted plants"], organic: ["Yellow sticky traps @ 12/acre", "Neem oil 0.3% against whitefly"], chemical: ["Imidacloprid 17.8 SL @ 0.3 ml/L for vector control"], prevention: ["Use resistant hybrids", "Nylon net nursery"] },
  ],
  Groundnut: [
    { name: "Tikka leaf spot", pathogen: "Cercospora arachidicola", tone: "brown", symptoms: ["Circular dark-brown spots with yellow halos", "Premature leaf drop"], organic: ["Neem leaf extract 5%", "Crop rotation with cereals"], chemical: ["Mancozeb 75 WP @ 2 g/L", "Chlorothalonil 75 WP @ 2 g/L"], prevention: ["Remove volunteer plants", "Timely sowing"] },
    { name: "Groundnut rust", pathogen: "Puccinia arachidis", tone: "brown", symptoms: ["Orange-brown pustules on leaf undersides"], organic: ["Resistant varieties"], chemical: ["Hexaconazole 5 EC @ 2 ml/L"], prevention: ["Avoid late sowing"] },
  ],
};

const HEALTHY: Omit<DiseaseInfo, "tone"> = {
  name: "Healthy",
  pathogen: "No pathogen detected",
  symptoms: ["Uniform green tissue", "No lesion-coloured regions above the detection threshold"],
  organic: ["Continue weekly scouting", "Maintain balanced nutrition"],
  chemical: ["No spray needed. Avoid prophylactic fungicide use"],
  prevention: ["Monitor during humid spells", "Keep field sanitation"],
};

export interface PixelStats {
  plantFraction: number;
  lesionFraction: number; // of plant pixels
  yellowShare: number; // share of lesion pixels that are yellow vs brown
  regions: { x: number; y: number; r: number }[];
}

/** Real on-device colour segmentation. */
export async function analysePixels(src: string): Promise<PixelStats> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const W = 160;
  const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W)) || 160;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const G = 10;
  const cells = new Array(G * G).fill(0);
  const cellPlant = new Array(G * G).fill(0);
  let plant = 0,
    lesion = 0,
    yellow = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.18 || max < 40) continue; // background / shadow
      const c = Math.min(G - 1, Math.floor((y / H) * G)) * G + Math.min(G - 1, Math.floor((x / W) * G));
      const isGreen = g >= r * 1.02 && g > b;
      const isLesion = r > g * 1.0 && r > b * 1.25;
      if (isGreen || isLesion) {
        plant++;
        cellPlant[c]++;
      }
      if (isLesion) {
        lesion++;
        cells[c]++;
        if (g > r * 0.78) yellow++;
      }
    }
  }
  const regions = cells
    .map((v, idx) => ({ idx, density: cellPlant[idx] ? v / cellPlant[idx] : 0, v }))
    .filter((c) => c.density > 0.25 && c.v > 12)
    .sort((a, b) => b.v - a.v)
    .slice(0, 6)
    .map((c) => ({ x: ((c.idx % G) + 0.5) / G, y: (Math.floor(c.idx / G) + 0.5) / G, r: 0.05 + c.density * 0.05 }));
  return {
    plantFraction: plant / (W * H),
    lesionFraction: plant ? lesion / plant : 0,
    yellowShare: lesion ? yellow / lesion : 0,
    regions,
  };
}

export async function detectDisease(src: string, crop: string, fileKey: string): Promise<DiseaseResult> {
  const started = performance.now();
  const stats = await analysePixels(src);
  await sleep(1400); // simulated model inference
  const rand = seeded(hashString(fileKey + crop));
  const pct = round(stats.lesionFraction * 100, 1);
  const list = DB[crop] ?? DB.Wheat;

  if (pct < 4 || stats.regions.length === 0) {
    return {
      crop,
      healthy: true,
      predictions: [
        { id: "healthy", name: "Healthy", pathogen: HEALTHY.pathogen, confidence: round(0.9 + rand() * 0.07, 2) },
        { id: list[0].name, name: list[0].name, pathogen: list[0].pathogen, confidence: round(0.02 + rand() * 0.04, 2) },
      ],
      severity: "none",
      affectedArea: pct,
      regions: [],
      symptoms: HEALTHY.symptoms,
      organic: HEALTHY.organic,
      chemical: HEALTHY.chemical,
      prevention: HEALTHY.prevention,
      modelVersion: "cropnet-demo-0.3",
      inferenceMs: Math.round(performance.now() - started),
    };
  }

  const tone = stats.yellowShare > 0.5 ? "yellow" : "brown";
  const ranked = [...list].sort((a, b) => Number(b.tone === tone) - Number(a.tone === tone) || rand() - 0.5);
  const topConf = clamp(0.72 + rand() * 0.2, 0, 0.96);
  const rest = 1 - topConf;
  const predictions: DiseasePrediction[] = ranked.slice(0, 3).map((d, i) => ({
    id: d.name,
    name: d.name,
    pathogen: d.pathogen,
    confidence: round(i === 0 ? topConf : i === 1 ? rest * 0.65 : rest * 0.25, 2),
  }));
  const top = ranked[0];
  return {
    crop,
    healthy: false,
    predictions,
    severity: pct > 25 ? "severe" : pct > 10 ? "moderate" : "mild",
    affectedArea: pct,
    regions: stats.regions,
    symptoms: top.symptoms,
    organic: top.organic,
    chemical: top.chemical,
    prevention: top.prevention,
    modelVersion: "cropnet-demo-0.3",
    inferenceMs: Math.round(performance.now() - started),
  };
}
