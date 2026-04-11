import { GoogleGenAI } from "@google/genai";
import { readRequiredEnv, sanitizeEnvValue } from "@/lib/env";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiModel() {
  return sanitizeEnvValue(process.env.GEMINI_MODEL || "gemini-2.5-flash");
}

export function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: readRequiredEnv(process.env.GEMINI_API_KEY, "GEMINI_API_KEY"),
    });
  }

  return geminiClient;
}
