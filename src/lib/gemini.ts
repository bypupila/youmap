import { GoogleGenAI } from "@google/genai";
import { readRequiredEnv, sanitizeEnvValue } from "@/lib/env";

let geminiClient: GoogleGenAI | null = null;
const geminiKeyEnvPriority = ["GOOGLE_GENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;
const geminiPlaceholderValues = new Set(["YOUR_GEMINI_API_KEY", "YOUR_ROTATED_GEMINI_API_KEY", "SET_NEW_ROTATED_GEMINI_KEY"]);

function isGeminiPlaceholder(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return true;
  if (geminiPlaceholderValues.has(value.trim())) return true;
  return normalized.startsWith("YOUR_") || normalized.startsWith("SET_") || normalized.includes("REPLACE");
}

function readGeminiApiKeyOptional() {
  for (const envName of geminiKeyEnvPriority) {
    const value = sanitizeEnvValue(process.env[envName]);
    if (value && !isGeminiPlaceholder(value)) return value;
  }
  return "";
}

export function hasGeminiApiKey() {
  return Boolean(readGeminiApiKeyOptional());
}

export function getGeminiModel() {
  return sanitizeEnvValue(process.env.GEMINI_MODEL || "gemini-2.5-flash");
}

export function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: readRequiredEnv(readGeminiApiKeyOptional(), geminiKeyEnvPriority.join(" or ")),
    });
  }

  return geminiClient;
}
