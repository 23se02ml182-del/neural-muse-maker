import { supabase } from "@/integrations/supabase/client";
import { buildLocalLogoFallback, extractGeneratedImage } from "@/lib/logo-generation";

const logoGenerationsTable = () => (supabase as any).from("logo_generations");

// ─── TYPES ───────────────────────────────────────────────────
export type LogoStyle =
  | "mascot" | "minimalist" | "wordmark" | "lettermark"
  | "emblem" | "abstract"  | "vintage"  | "geometric"
  | "3d"     | "handdrawn";

export interface GenerateLogoRequest {
  businessName: string;
  tagline?: string;
  brandDescription?: string;
  industry: string;
  style: LogoStyle;
  providerOverride?: LogoProviderChoice;
  colors?: string[];               // e.g. ["#FF6B35", "#004E89"]
  mood?: string;                   // e.g. "confident, playful, trustworthy"
  additionalInstructions?: string;
  styleHint?: string;
  iconIdea?: string;
  variationIndex?: number;
  variationSeed?: number;
}

export interface GenerateLogoResult {
  success: boolean;
  imageUrl: string;
  sourceImageUrl?: string | null;
  provider: string;
  prompt: string;
  metadata: { businessName: string; style: LogoStyle; industry: string; generatedAt: string; warning?: string };
}

export interface GenerateLogoError { success: false; error: string; }

export type LogoProviderChoice =
  | "auto"
  | "picsart"
  | "fireworks"
  | "cloudflare"
  | "huggingface"
  | "pollinations";

export const LOGO_PROVIDER_OPTIONS: Array<{
  value: LogoProviderChoice;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Automatic fallback",
    description: "Use the configured provider chain and fall back if one fails.",
  },
  {
    value: "picsart",
    label: "Picsart Logo Generator",
    description: "Best if you want a dedicated logo-focused provider and have Picsart configured.",
  },
  {
    value: "fireworks",
    label: "Fireworks AI",
    description: "Use Fireworks image generation when that API key is available.",
  },
  {
    value: "cloudflare",
    label: "Cloudflare Workers AI",
    description: "Use Cloudflare’s hosted image models when account and token are set.",
  },
  {
    value: "huggingface",
    label: "Hugging Face",
    description: "Use Hugging Face Inference when your token is configured.",
  },
  {
    value: "pollinations",
    label: "Pollinations",
    description: "Use the free Pollinations path for quick fallback generation.",
  },
];

export type StatusCallback = (
  status: "submitting" | "polling" | "done" | "error",
  message: string
) => void;

function buildLocalFallbackResult(request: GenerateLogoRequest): GenerateLogoResult {
  const generatedAt = new Date().toISOString();
  return {
    success: true,
    imageUrl: buildLocalLogoFallback({
      businessName: request.businessName,
      industry: request.industry,
      style: request.style,
      colors: request.colors ?? null,
      mood: request.mood ?? null,
      variant: request.variationIndex ?? 0,
    }),
    sourceImageUrl: null,
    provider: "local/fallback",
    prompt: "Local SVG fallback generated because the remote logo service was unavailable.",
    metadata: {
      businessName: request.businessName,
      style: request.style,
      industry: request.industry,
      generatedAt,
      warning: "Remote generation unavailable; local fallback was used.",
    },
  };
}

// ─── DB TYPES ────────────────────────────────────────────────
export interface LogoGeneration {
  id: string;
  user_id: string | null;
  business_name: string;
  tagline: string | null;
  industry: string;
  style: LogoStyle;
  colors: string[] | null;
  mood: string | null;
  additional_instructions: string | null;
  image_url: string | null;
  prompt_used: string;
  provider: string | null;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  generation_ms: number | null;
  user_rating: number | null;
  was_downloaded: boolean | null;
  created_at: string;
  completed_at: string | null;
}

// ─── MAIN FUNCTION ───────────────────────────────────────────
export async function generateLogo(
  request: GenerateLogoRequest,
  onStatus?: StatusCallback
): Promise<GenerateLogoResult> {
  if (!request.businessName.trim()) throw new Error("Business name is required");
  if (!request.industry.trim())     throw new Error("Industry is required");
  if (!request.style)               throw new Error("Logo style is required");

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` } : {};

  // Insert pending DB row only for authenticated users.
  // This avoids RLS friction for anonymous runs while keeping full history for signed-in users.
  let dbRowId: string | undefined;
  if (userId) {
    try {
      const { data: row } = await logoGenerationsTable().insert({
        user_id: userId,
        business_name: request.businessName,
        tagline: request.tagline ?? null,
        industry: request.industry,
        style: request.style,
        colors: request.colors ?? null,
        mood: request.mood ?? null,
        additional_instructions: request.additionalInstructions ?? null,
        prompt_used: "pending",
        status: "pending",
      }).select("id").single();
      dbRowId = row?.id;
    } catch (e) { console.warn("[logo-client] DB insert failed:", e); }
  }

  // Show progress messages while edge function runs
  onStatus?.("submitting", "Sending your logo request…");
  const startMs = Date.now();
  let pollCount = 0;
  const pollMessages = [
    "Analyzing brand identity…",
    "Crafting logo prompt…",
    "Routing through premium providers…",
    "Generating your logo…",
    "AI is painting your brand…",
    "Almost there, finalizing…",
  ];
  const pollInterval = setInterval(() => {
    onStatus?.("polling", pollMessages[Math.min(pollCount++, pollMessages.length - 1)]);
  }, 5_000);

  try {
    const { data, error } = await supabase.functions.invoke("generate-logo", {
      body: request,
      headers: authHeader,
    });
    clearInterval(pollInterval);

    if (error) {
      throw error;
    }

    const imageUrl = extractGeneratedImage(data);
    const result = data && typeof data === "object"
      ? {
          ...(data as Partial<GenerateLogoResult>),
          imageUrl: imageUrl || "",
        }
      : null;

    if (!result?.success || !result.imageUrl) {
      const fallbackResult = buildLocalFallbackResult(request);
      onStatus?.("done", "Remote generator unavailable, using a local fallback logo.");
      if (dbRowId) {
        await logoGenerationsTable().update({
          image_url: fallbackResult.imageUrl,
          provider: null,
          prompt_used: fallbackResult.prompt,
          status: "completed",
          error_message: null,
          generation_ms: Date.now() - startMs,
          completed_at: new Date().toISOString(),
        }).eq("id", dbRowId);
      }
      return fallbackResult;
    }

    onStatus?.("done", "Logo generated successfully!");

    if (dbRowId) {
      await logoGenerationsTable().update({
        image_url:     result.imageUrl,
        provider:      null,
        prompt_used:   result.prompt,
        status:        "completed",
        error_message: null,
        generation_ms: Date.now() - startMs,
        completed_at:  new Date().toISOString(),
      }).eq("id", dbRowId);
    }

    return result as GenerateLogoResult;
  } catch (err) {
    clearInterval(pollInterval);
    const message = err instanceof Error ? err.message : String(err);
    onStatus?.("error", `Generation failed: ${message}`);
    if (dbRowId) {
      await logoGenerationsTable()
        .update({ status: "failed", error_message: message })
        .eq("id", dbRowId);
    }
    const fallbackResult = buildLocalFallbackResult(request);
    onStatus?.("done", "Remote generation failed, using a local fallback logo.");
    if (dbRowId) {
      await logoGenerationsTable().update({
        image_url: fallbackResult.imageUrl,
        provider: null,
        prompt_used: fallbackResult.prompt,
        status: "completed",
        error_message: null,
        generation_ms: Date.now() - startMs,
        completed_at: new Date().toISOString(),
      }).eq("id", dbRowId);
    }
    return fallbackResult;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────
export const rateLogoGeneration = (id: string, rating: 1|2|3|4|5) =>
  logoGenerationsTable().update({ user_rating: rating }).eq("id", id);

export const markLogoDownloaded = (id: string) =>
  logoGenerationsTable().update({ was_downloaded: true }).eq("id", id);

export const getLogoHistory = (limit = 20) =>
  logoGenerationsTable().select("*")
    .eq("status", "completed").order("created_at", { ascending: false }).limit(limit);

// ─── UI HELPERS ───────────────────────────────────────────────
export const LOGO_STYLE_LABELS: Record<LogoStyle, string> = {
  mascot:     "Mascot Character",
  minimalist: "Minimalist / Clean",
  wordmark:   "Wordmark / Logotype",
  lettermark: "Lettermark / Monogram",
  emblem:     "Emblem / Badge",
  abstract:   "Abstract Mark",
  vintage:    "Vintage / Retro",
  geometric:  "Geometric",
  "3d":       "3D / Dimensional",
  handdrawn:  "Hand-drawn / Artisan",
};

export const LOGO_STYLE_DESCRIPTIONS: Record<LogoStyle, string> = {
  mascot:     "A character that embodies your brand personality",
  minimalist: "Clean, simple, timeless — one icon + text",
  wordmark:   "Your business name as the entire logo",
  lettermark: "Initials crafted into a distinctive monogram",
  emblem:     "Classic badge or crest with name integrated",
  abstract:   "Unique symbolic mark with no literal meaning",
  vintage:    "Aged, hand-crafted, nostalgic aesthetic",
  geometric:  "Mathematically precise shapes and forms",
  "3d":       "Dimensional, volumetric with depth and lighting",
  handdrawn:  "Organic, artisan, brush-and-ink feel",
};

export const LOGO_STYLE_EXAMPLES: Record<LogoStyle, string[]> = {
  mascot:     ["KFC Colonel", "Michelin Man", "Geico Gecko"],
  minimalist: ["Apple", "Nike", "Twitter"],
  wordmark:   ["Google", "Coca-Cola", "FedEx"],
  lettermark: ["IBM", "HP", "LV"],
  emblem:     ["Harley-Davidson", "Starbucks", "NFL"],
  abstract:   ["Pepsi", "Adidas", "Chase"],
  vintage:    ["Jack Daniel's", "Lucky Strike", "Old Spice"],
  geometric:  ["Mitsubishi", "Audi", "Chevrolet"],
  "3d":       ["PlayStation", "Firefox", "Chrome"],
  handdrawn:  ["Innocent Drinks", "Moleskine", "Chipotle"],
};
