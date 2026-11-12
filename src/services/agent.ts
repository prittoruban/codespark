import { FARMS } from "@/data/farms";
import type { AgentPlanStep, AgentRun, AgentStepResult, Farm, Language, ToolName } from "@/lib/types";
import { formatINR, round, sleep, uid } from "@/lib/utils";
import { computePlan } from "./fertilizer";
import { mockRagService } from "./rag";
import { simulatedWeatherService, WEATHER_LOCATIONS } from "./weather";

/**
 * Smart agricultural tool-routing agent.
 * route():   intent classification + entity extraction → ordered tool plan.
 * execute(): runs each tool against the (mock) services and returns its output.
 * The mock router is rule-based. In production, replace it with an LLM
 * function-calling planner that uses the same ToolName contract.
 */

export const TOOL_META: Record<ToolName, { label: string; description: string }> = {
  knowledge_base: { label: "Knowledge Base (RAG)", description: "Searches the agronomy corpus and returns cited passages" },
  weather: { label: "Weather API", description: "Current conditions, 7-day forecast and field advisories" },
  soil_analysis: { label: "Soil Health Card", description: "Reads the latest digitised soil test for the field" },
  fertilizer_optimizer: { label: "Fertilizer Optimizer", description: "Computes nutrient need, products and split schedule" },
  disease_detection: { label: "Crop Doctor", description: "Classifies disease from a leaf photo" },
  market_prices: { label: "Mandi Prices", description: "Latest modal prices at nearby markets" },
};

interface IntentRule {
  intent: string;
  match: RegExp;
  tools: ToolName[];
}

const RULES: IntentRule[] = [
  { intent: "Disease diagnosis", match: /(disease|spot|rust|blight|lesion|yellow(ing)? leaves|leaf|fung|photo|image|रोग|धब्बे|நோய்|புள்ளி|తెగులు|మచ్చ)/i, tools: ["disease_detection", "knowledge_base", "weather"] },
  { intent: "Fertilizer planning", match: /(fertili[sz]er|urea|npk|dap|potash|nitrogen|dose|nutrient|top.?dress|उर्वरक|यूरिया|नाइट्रोजन|உரம்|யூரியா|ఎరువు|యూరియా)/i, tools: ["soil_analysis", "fertilizer_optimizer", "weather", "knowledge_base"] },
  { intent: "Irrigation & weather", match: /(rain|weather|irrigat|water|spray|forecast|wind|humid|बारिश|मौसम|सिंचाई|மழை|வானிலை|நீர்|వర్షం|వాతావరణ|నీరు)/i, tools: ["weather", "knowledge_base"] },
  { intent: "Soil health", match: /(soil|ph|carbon|acid|alkaline|zinc|micronutrient|मिट्टी|மண்|నేల)/i, tools: ["soil_analysis", "knowledge_base"] },
  { intent: "Market prices", match: /(price|mandi|market|sell|msp|rate|भाव|मंडी|விலை|ధర)/i, tools: ["market_prices"] },
  { intent: "Pest management", match: /(pest|insect|hopper|worm|caterpillar|कीट|பூச்சி|పురుగు)/i, tools: ["knowledge_base", "weather"] },
];

const CROP_RE: [RegExp, string][] = [
  [/wheat|गेहूं|கோதுமை|గోధుమ/i, "Wheat"],
  [/paddy|rice|धान|நெல்|వరి/i, "Paddy"],
  [/maize|corn|मक्का|மக்காச்சோளம்|మొక్కజొన్న/i, "Maize"],
  [/groundnut|peanut|मूंगफली|நிலக்கடலை|వేరుశనగ/i, "Groundnut"],
  [/tomato|टमाटर|தக்காளி|టమాటా/i, "Tomato"],
];

export function resolveFarm(query: string): Farm {
  const field = query.match(/field\s*([a-d])\b/i);
  if (field) return FARMS.find((f) => f.id === `field-${field[1].toLowerCase()}`) ?? FARMS[0];
  for (const [re, crop] of CROP_RE) if (re.test(query)) return FARMS.find((f) => f.crop === crop) ?? FARMS[0];
  return FARMS[0];
}

function detectLanguage(q: string): Language {
  if (/[ऀ-ॿ]/.test(q)) return "hi";
  if (/[஀-௿]/.test(q)) return "ta";
  if (/[ఀ-౿]/.test(q)) return "te";
  return "en";
}

export function route(query: string, opts: { hasImage?: boolean } = {}): AgentRun {
  const hits = RULES.filter((r) => r.match.test(query));
  const primary = opts.hasImage ? RULES[0] : hits[0];
  const tools: ToolName[] = [];
  for (const r of primary ? [primary, ...hits.filter((h) => h !== primary)] : []) for (const t of r.tools) if (!tools.includes(t)) tools.push(t);
  if (!tools.length) tools.push("knowledge_base");
  if (!opts.hasImage && !/photo|image|picture|फोटो|படம்|ఫోటో/i.test(query)) {
    const i = tools.indexOf("disease_detection");
    if (i >= 0 && primary !== RULES[0]) tools.splice(i, 1);
  }

  const farm = resolveFarm(query);
  const cropMatch = CROP_RE.find(([re]) => re.test(query));
  const lang = detectLanguage(query);
  const entities = [
    { label: "Field", value: `${farm.name.split(" — ")[0]} · ${farm.village}` },
    { label: "Crop", value: cropMatch ? cropMatch[1] : `${farm.crop} (from field)` },
    { label: "Stage", value: farm.stage },
    { label: "Language", value: { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu" }[lang] },
  ];
  if (/today|tomorrow|this week|आज|இன்று|ఈ రోజు/i.test(query)) entities.push({ label: "Timeframe", value: /week/i.test(query) ? "This week" : "Today" });

  const reasons: Record<ToolName, string> = {
    disease_detection: opts.hasImage ? "A photo is attached. Classify the visible symptoms." : "Symptoms are described. Ask for a photo to confirm.",
    knowledge_base: "Ground the answer in verified agronomy guidance with citations.",
    weather: "Check the forecast so the advice is timed safely (rain, wind, humidity).",
    soil_analysis: "Read the latest Soil Health Card for this field.",
    fertilizer_optimizer: "Compute crop- and soil-specific nutrient doses.",
    market_prices: "Fetch current mandi prices for the crop.",
  };
  const plan: AgentPlanStep[] = tools.map((tool) => ({ id: uid("step"), tool, reason: reasons[tool], input: `${farm.crop} · ${farm.name.split(" — ")[0]}` }));
  const confidence = round(primary ? Math.min(0.97, 0.78 + hits.length * 0.05 + (opts.hasImage ? 0.08 : 0)) : 0.55, 2);
  return { query, intent: primary?.intent ?? "General advisory", confidence, entities, plan };
}

const nearestLocation = (farm: Farm) =>
  WEATHER_LOCATIONS.reduce((best, l) => (Math.hypot(l.lat - farm.lat, l.lon - farm.lon) < Math.hypot(best.lat - farm.lat, best.lon - farm.lon) ? l : best));

export async function executeStep(step: AgentPlanStep, query: string, ctx: { hasImage?: boolean } = {}): Promise<AgentStepResult> {
  const t0 = Date.now();
  const farm = resolveFarm(query);
  await sleep(500 + Math.random() * 500);
  let output = "";
  let data: AgentStepResult["data"];

  switch (step.tool) {
    case "weather": {
      const w = await simulatedWeatherService.getWeather(nearestLocation(farm));
      const rain48 = round(w.daily[0].rainMm + w.daily[1].rainMm, 1);
      output = `${w.current.temp}°C, ${w.current.humidity}% humidity, wind ${w.current.windKmh} km/h. ${rain48} mm of rain expected in 48 h. ${w.advisories[0].title}.`;
      data = { Temperature: `${w.current.temp}°C`, Humidity: `${w.current.humidity}%`, "Rain 48 h": `${rain48} mm`, Wind: `${w.current.windKmh} km/h` };
      break;
    }
    case "soil_analysis": {
      output = `Latest card (Oct 2026): N 212 kg/ha (low), P 18.4 kg/ha (medium), K 245 kg/ha (medium), pH ${farm.soilPh}, OC 0.48% (low), Zn 0.52 ppm (deficient).`;
      data = { N: "212 kg/ha", P: "18.4 kg/ha", K: "245 kg/ha", pH: farm.soilPh, OC: "0.48%" };
      break;
    }
    case "fertilizer_optimizer": {
      const plan = computePlan({ crop: farm.crop, stage: farm.stage, areaHa: farm.areaHa, targetYield: 4.8, N: 212, P: 18.4, K: 245, pH: farm.soilPh, OC: 0.48, organicPreference: false, irrigation: farm.irrigation === "Rainfed" ? "rainfed" : "irrigated" });
      const due = plan.schedule.find((s) => s.status === "due");
      output = `Need ${plan.required.N}:${plan.required.P2O5}:${plan.required.K2O} kg/ha N:P₂O₅:K₂O. ${due ? `Due now: ${due.stage}, ${due.products}.` : ""} Saves ${formatINR(plan.cost.savingsTotal)} vs blanket dose.`;
      data = { N: `${plan.required.N} kg/ha`, "P₂O₅": `${plan.required.P2O5} kg/ha`, "K₂O": `${plan.required.K2O} kg/ha`, Savings: formatINR(plan.cost.savingsTotal) };
      break;
    }
    case "disease_detection": {
      output = ctx.hasImage
        ? "The photo was analysed in Crop Doctor. Lesion regions were found and the top prediction was passed to the knowledge base for treatment."
        : "No photo attached. Upload a clear photo of the affected leaf to confirm the diagnosis.";
      break;
    }
    case "knowledge_base": {
      const hits = mockRagService.retrieve(query);
      output = hits.length ? `Retrieved ${hits.length} passage${hits.length > 1 ? "s" : ""}. Top match: “${hits[0].chunk.title}” (${hits[0].chunk.source}).` : "No strongly matching passage found in the corpus.";
      break;
    }
    case "market_prices": {
      const prices: Record<string, [number, string]> = { Wheat: [2510, "Tiruvallur"], Paddy: [2390, "Kanchipuram"], Maize: [2240, "Chengalpattu"], Groundnut: [6720, "Vellore"] };
      const [p, m] = prices[farm.crop] ?? [2400, "Chennai"];
      output = `${farm.crop} modal price at ${m} mandi is ₹${p.toLocaleString("en-IN")}/quintal, up 2.1% week on week (demo feed).`;
      data = { Crop: farm.crop, Mandi: m, "Modal price": `₹${p.toLocaleString("en-IN")}/q`, Trend: "+2.1% WoW" };
      break;
    }
  }
  return { stepId: step.id, output, data, ms: Date.now() - t0 };
}

export function synthesize(run: AgentRun, results: AgentStepResult[], lang: Language) {
  const rag = mockRagService.answer(run.query, lang);
  const byTool = (t: ToolName) => results.find((r) => run.plan.find((p) => p.id === r.stepId)?.tool === t);
  const context: string[] = [];
  const w = byTool("weather");
  const f = byTool("fertilizer_optimizer");
  const s = byTool("soil_analysis");
  const m = byTool("market_prices");
  const d = byTool("disease_detection");
  if (s) context.push(`**Soil:** ${s.output}`);
  if (f) context.push(`**Plan:** ${f.output}`);
  if (w) context.push(`**Weather:** ${w.output}`);
  if (m) context.push(`**Market:** ${m.output}`);
  if (d && run.plan.length && !/analysed/.test(d.output)) context.push(`**Crop Doctor:** ${d.output}`);
  const ctxBlock = context.length && lang === "en" ? `\n\n---\n${context.join("\n\n")}` : "";
  const body = m && !rag.grounded ? m.output : rag.text;
  return { text: body + ctxBlock, citations: rag.citations, followUps: rag.followUps, grounded: rag.grounded };
}
