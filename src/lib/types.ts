/* Domain types shared by UI and services. Real backends should return these shapes. */

export type Language = "en" | "hi" | "ta" | "te";

export type HealthStatus = "healthy" | "attention" | "critical";

export interface Farm {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  crop: string;
  variety: string;
  areaHa: number;
  stage: string;
  sowingDate: string; // ISO
  image: string;
  health: number; // 0-100 vegetation health index
  status: HealthStatus;
  moisture: number; // % volumetric
  soilPh: number;
  irrigation: string;
}

/* ---------- Soil Health Card ---------- */

export type NutrientKey = "N" | "P" | "K" | "pH" | "EC" | "OC" | "S" | "Zn" | "Fe" | "Cu" | "Mn" | "B";
export type NutrientStatus = "low" | "medium" | "high" | "normal" | "acidic" | "alkaline" | "deficient" | "sufficient";

export interface SoilParameter {
  key: NutrientKey;
  label: string;
  value: number;
  unit: string;
  confidence: number; // OCR confidence 0-1
  status: NutrientStatus;
  range: [number, number]; // optimal range for display
}

export interface SoilReport {
  id: string;
  cardNumber: string;
  farmerName: string;
  village: string;
  district: string;
  surveyNo: string;
  sampleDate: string;
  labName: string;
  sourceFile: string;
  parameters: SoilParameter[];
  overallConfidence: number;
}

export interface OcrStage {
  id: string;
  label: string;
  detail: string;
}

/* ---------- Fertilizer ---------- */

export interface FertilizerInput {
  crop: string;
  stage: string;
  areaHa: number;
  targetYield: number; // t/ha
  N: number; // kg/ha available
  P: number;
  K: number;
  pH: number;
  OC: number; // %
  organicPreference: boolean;
  irrigation: "irrigated" | "rainfed";
}

export interface FertilizerProduct {
  name: string;
  grade: string;
  kgPerHa: number;
  bagsTotal: number; // 50 kg bags across area
  costPerHa: number;
  supplies: string;
  type: "chemical" | "organic" | "bio";
}

export interface ApplicationSplit {
  stage: string;
  timing: string;
  share: string;
  products: string;
  note: string;
  status: "done" | "due" | "upcoming";
}

export interface FertilizerPlan {
  input: FertilizerInput;
  required: { N: number; P2O5: number; K2O: number }; // kg/ha nutrient
  blanket: { N: number; P2O5: number; K2O: number };
  products: FertilizerProduct[];
  schedule: ApplicationSplit[];
  cost: { optimizedPerHa: number; conventionalPerHa: number; savingsTotal: number };
  impact: { nitrogenSavedKg: number; n2oAvoidedKgCO2e: number; runoffRisk: "low" | "moderate" | "high"; efficiencyGain: number };
  explanations: { text: string; basis: "model" | "guideline" }[];
  confidence: number;
}

/* ---------- Weather ---------- */

export interface WeatherCurrent {
  location: string;
  temp: number;
  feelsLike: number;
  condition: WeatherCondition;
  humidity: number;
  windKmh: number;
  windDir: string;
  rainMm: number;
  uv: number;
  pressure: number;
  updatedAt: string;
}

export type WeatherCondition = "sunny" | "partly-cloudy" | "cloudy" | "rain" | "storm";

export interface ForecastDay {
  date: string;
  min: number;
  max: number;
  condition: WeatherCondition;
  rainChance: number;
  rainMm: number;
  humidity: number;
  windKmh: number;
}

export interface HourlyPoint {
  time: string;
  temp: number;
  rainChance: number;
  humidity: number;
}

export interface FieldAdvisory {
  id: string;
  kind: "irrigation" | "fertilizer" | "spray" | "harvest";
  title: string;
  detail: string;
  severity: "info" | "caution" | "alert";
  window?: string;
}

export interface WeatherBundle {
  current: WeatherCurrent;
  hourly: HourlyPoint[];
  daily: ForecastDay[];
  advisories: FieldAdvisory[];
  source: "simulated" | "open-meteo";
}

/* ---------- Chat / RAG ---------- */

export interface Citation {
  id: string;
  title: string;
  source: string;
  snippet: string;
  score: number;
  url?: string; // link to the original document (knowledge-base answers)
}

export type ToolName = "knowledge_base" | "weather" | "soil_analysis" | "fertilizer_optimizer" | "disease_detection" | "market_prices";

export interface ToolCall {
  tool: ToolName;
  input: string;
  output: string;
  ms: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  lang: Language;
  createdAt: number;
  image?: string;
  citations?: Citation[];
  tools?: ToolCall[];
  followUps?: string[];
}

/* ---------- Agent ---------- */

export interface AgentPlanStep {
  id: string;
  tool: ToolName;
  reason: string;
  input: string;
}

export interface AgentRun {
  query: string;
  intent: string;
  confidence: number;
  entities: { label: string; value: string }[];
  plan: AgentPlanStep[];
}

export interface AgentStepResult {
  stepId: string;
  output: string;
  data?: Record<string, string | number>;
  ms: number;
}

/* ---------- Disease detection ---------- */

export interface DiseasePrediction {
  id: string;
  name: string;
  pathogen: string;
  confidence: number;
}

export interface DiseaseResult {
  crop: string;
  healthy: boolean;
  predictions: DiseasePrediction[];
  severity: "mild" | "moderate" | "severe" | "none";
  affectedArea: number; // % of leaf surface (from pixel analysis)
  regions: { x: number; y: number; r: number }[]; // normalised 0-1
  symptoms: string[];
  organic: string[];
  chemical: string[];
  prevention: string[];
  modelVersion: string;
  inferenceMs: number;
}

/* ---------- RAG API (/api/rag) ---------- */

export interface RagRequest {
  query: string;
  lang: Language;
  crop?: string; // lowercase crop name to filter retrieval, e.g. "wheat"
  state?: string; // e.g. "Tamil Nadu"
}

export interface RagAnswer {
  text: string; // markdown with [n] markers matching citations[n-1]
  citations: Citation[];
  followUps: string[];
  grounded: boolean;
  backend: "knowledge-base" | "demo";
}
