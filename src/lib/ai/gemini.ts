import type { AIProvider } from "./provider";

const MODEL = "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message: string };
}

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText({ system, prompt }: { system: string; prompt: string }): Promise<string> {
    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: {
          // Keeps latency reasonable for interactive UI calls — this model
          // otherwise defaults to extended reasoning on every request.
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    });

    const data = (await res.json()) as GeminiResponse;
    if (!res.ok || data.error) {
      throw new Error(data.error?.message ?? `Gemini request failed with status ${res.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) throw new Error("Gemini returned an empty response.");
    return text.trim();
  }
}
