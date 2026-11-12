/**
 * Service registry — the single place where mock implementations are wired in.
 * To move to real backends, replace an implementation here with one that calls
 * your API (keeping the interface). UI components only import from this file.
 */
import { mockFertilizerService, type FertilizerService } from "./fertilizer";
import { mockOcrService, type OcrService } from "./ocr";
import { mockRagService, type RagService } from "./rag";
import { openMeteoWeatherService, simulatedWeatherService, type WeatherService } from "./weather";

export const ragService: RagService = mockRagService;
export const ocrService: OcrService = mockOcrService;
export const fertilizerService: FertilizerService = mockFertilizerService;
export const weatherService: WeatherService =
  process.env.NEXT_PUBLIC_WEATHER_PROVIDER === "open-meteo" ? openMeteoWeatherService : simulatedWeatherService;

export * as agent from "./agent";
export { WEATHER_LOCATIONS } from "./weather";
