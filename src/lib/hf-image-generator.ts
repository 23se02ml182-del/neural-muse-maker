import { HfInference } from "@huggingface/inference";

// ─── TYPES ───────────────────────────────────────────────────
export interface HFLogoRequest {
  businessName: string;
  industry: string;
  style: string;
  tagline?: string;
  colors?: string[];
  mood?: string;
  iconIdea?: string;
  description?: string;
}

export interface HFLogoResult {
  imageUrl: string;       // blob: URL ready for <img src>
  prompt: string;         // The actual prompt sent to HF
  provider: "huggingface";
}

// ─── CONFIG ──────────────────────────────────────────────────
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN as string | undefined;
const MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0";

// ─── PROMPT BUILDER ──────────────────────────────────────────
function buildLogoPrompt(req: HFLogoRequest): string {
  const styleMap: Record<string, string> = {
    mascot: "mascot character illustration",
    minimalist: "minimalist flat vector logo design",
    wordmark: "elegant wordmark typography logo",
    lettermark: "monogram lettermark logo design",
    emblem: "professional emblem badge crest logo",
    abstract: "abstract geometric symbol logo",
    vintage: "vintage retro hand-lettered logo",
    geometric: "geometric precision shape-based logo",
    "3d": "3D rendered dimensional logo with lighting",
    handdrawn: "hand-drawn artisan organic logo illustration",
    modern: "modern sleek tech logo design",
    futuristic: "futuristic neon cyber tech logo",
    cartoon: "cartoon character mascot logo",
  };

  const styleDesc = styleMap[req.style?.toLowerCase()] || "professional modern logo design";

  const parts: string[] = [
    `A premium ${styleDesc} for "${req.businessName}"`,
    `in the ${req.industry} industry`,
  ];

  if (req.tagline) {
    parts.push(`with tagline "${req.tagline}"`);
  }

  if (req.colors && req.colors.length > 0) {
    parts.push(`using colors: ${req.colors.join(", ")}`);
  }

  if (req.mood) {
    parts.push(`with a ${req.mood} feel`);
  }

  if (req.iconIdea) {
    parts.push(`incorporating ${req.iconIdea} imagery`);
  }

  if (req.description) {
    parts.push(`brand context: ${req.description}`);
  }

  // Quality boosters — these massively improve SDXL output for logos
  parts.push(
    "clean white background, centered composition, professional brand identity",
    "high quality, sharp details, vector art style, 4k, award-winning design",
    "no text artifacts, clean typography, brand mark"
  );

  return parts.join(", ") + ".";
}

// ─── NEGATIVE PROMPT ─────────────────────────────────────────
const NEGATIVE_PROMPT = [
  "blurry", "low quality", "pixelated", "watermark",
  "photograph", "realistic face", "human photo",
  "noisy", "distorted text", "ugly", "deformed",
  "multiple logos", "busy background", "cluttered",
].join(", ");

// ─── TOKEN CHECK ─────────────────────────────────────────────
export function isHFConfigured(): boolean {
  return !!(HF_TOKEN && HF_TOKEN.trim().length > 0);
}

// ─── MAIN GENERATOR ─────────────────────────────────────────
export async function generateHFLogo(
  request: HFLogoRequest,
  onProgress?: (message: string) => void
): Promise<HFLogoResult> {
  if (!isHFConfigured()) {
    throw new Error(
      "Hugging Face token is not configured. " +
      "Please set VITE_HF_TOKEN in your .env file. " +
      "Get a free token at https://huggingface.co/settings/tokens"
    );
  }

  const hf = new HfInference(HF_TOKEN!.trim());
  const prompt = buildLogoPrompt(request);

  onProgress?.("Building logo prompt…");

  try {
    onProgress?.("Sending request to Hugging Face AI…");

    const blob = await hf.textToImage({
      model: MODEL_ID,
      inputs: prompt,
      parameters: {
        negative_prompt: NEGATIVE_PROMPT,
        width: 1024,
        height: 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    });

    onProgress?.("Processing generated image…");

    // Convert blob to a usable URL
    const imageUrl = URL.createObjectURL(blob);

    return {
      imageUrl,
      prompt,
      provider: "huggingface",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide helpful error messages for common failures
    if (message.includes("401") || message.includes("Unauthorized")) {
      throw new Error(
        "Invalid Hugging Face token. Please check your VITE_HF_TOKEN in the .env file."
      );
    }
    if (message.includes("503") || message.includes("loading")) {
      throw new Error(
        "The AI model is loading on Hugging Face servers. Please wait 30-60 seconds and try again."
      );
    }
    if (message.includes("429") || message.includes("rate")) {
      throw new Error(
        "Rate limit reached on Hugging Face. Please wait a moment and try again."
      );
    }

    throw new Error(`Hugging Face generation failed: ${message}`);
  }
}

// ─── BATCH GENERATOR ─────────────────────────────────────────
// Generate multiple logos (one per style) with progress reporting
export async function generateHFLogoBatch(
  request: HFLogoRequest,
  count: number = 3,
  onProgress?: (message: string, current: number, total: number) => void
): Promise<HFLogoResult[]> {
  const results: HFLogoResult[] = [];

  // For variety, we slightly alter the mood/description for each variation
  const variations = [
    "",
    "alternative composition, different layout",
    "bold and striking version, unique angle",
    "elegant refined version, sophisticated",
    "playful creative take, distinctive",
    "premium luxury version, high-end",
  ];

  for (let i = 0; i < count; i++) {
    onProgress?.(`Generating logo ${i + 1} of ${count}…`, i + 1, count);

    const variedRequest: HFLogoRequest = {
      ...request,
      description: [request.description, variations[i % variations.length]]
        .filter(Boolean)
        .join(". "),
    };

    try {
      const result = await generateHFLogo(variedRequest, (msg) => {
        onProgress?.(`[${i + 1}/${count}] ${msg}`, i + 1, count);
      });
      results.push(result);
    } catch (err) {
      console.warn(`HF logo variation ${i + 1} failed:`, err);
      // If the first one fails, throw — otherwise continue with what we have
      if (i === 0 && results.length === 0) throw err;
    }
  }

  if (results.length === 0) {
    throw new Error("All Hugging Face logo generations failed. Please try again.");
  }

  return results;
}
