import { GeminiProvider } from "./gemini";

export interface AIProvider {
  name: string;
  generateText(input: { system: string; prompt: string }): Promise<string>;
}

let cached: AIProvider | null | undefined;

/**
 * Returns the configured LLM provider, or null if no key is set. Callers must
 * have their own deterministic fallback for the null case — every AI feature
 * in this product has to keep working without a key configured.
 */
export function getAIProvider(): AIProvider | null {
  if (cached !== undefined) return cached;

  const key = process.env.GEMINI_API_KEY;
  cached = key ? new GeminiProvider(key) : null;
  return cached;
}
