import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const BUILD_VERSION = "2026-04-04-luxury-v19";
const PROVIDER_TIMEOUT_MS = 45_000;
const LOGO_PROVIDER_MODE = (Deno.env.get("LOGO_PROVIDER_MODE") || "huggingface-only").trim().toLowerCase();
const LOGO_PROVIDER_CHAIN = (Deno.env.get("LOGO_PROVIDER_CHAIN") || "").trim().toLowerCase();
const COMPOSE_PROVIDER_OUTPUT = (Deno.env.get("COMPOSE_PROVIDER_OUTPUT") || "true").trim().toLowerCase() !== "false";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface LogoRequest {
  businessName: string;
  tagline?: string;
  brandDescription?: string;
  industry: string;
  style: LogoStyle;
  providerOverride?: string;
  iconIdea?: string;
  colors?: string[];
  mood?: string;
  styleHint?: string;
  variationIndex?: number;
  variationSeed?: number;
  additionalInstructions?: string;
}

type LogoStyle =
  | "mascot"
  | "minimalist"
  | "wordmark"
  | "lettermark"
  | "emblem"
  | "abstract"
  | "vintage"
  | "geometric"
  | "3d"
  | "handdrawn";

type ProviderKey =
  | "lovable"
  | "openai"
  | "xai"
  | "ideogram"
  | "picsart"
  | "stability"
  | "huggingface"
  | "cloudflare"
  | "fireworks"
  | "openrouter"
  | "pollinations"
  | "together"
  | "gemini"
  | "replicate"
  | "fal";

const STYLE_ALIASES: Record<string, LogoStyle> = {
  mascot: "mascot",
  cartoon: "mascot",
  character: "mascot",
  minimal: "minimalist",
  minimalist: "minimalist",
  modern: "minimalist",
  flat: "minimalist",
  lineart: "wordmark",
  wordmark: "wordmark",
  logotype: "wordmark",
  lettermark: "lettermark",
  monogram: "lettermark",
  emblem: "emblem",
  badge: "emblem",
  abstract: "abstract",
  futuristic: "abstract",
  geometric: "geometric",
  vintage: "vintage",
  retro: "vintage",
  watercolor: "handdrawn",
  gradient: "abstract",
  "3d": "3d",
  handdrawn: "handdrawn",
  "hand-drawn": "handdrawn",
};

const COLOR_PALETTES: Record<string, string[]> = {
  "blue-cyan": ["#1E90FF", "#00CED1", "#87CEEB"],
  "red-orange": ["#FF4444", "#FF8C00", "#FFD700"],
  "green-nature": ["#2E8B57", "#90EE90", "#32CD32"],
  "purple-pink": ["#8A2BE2", "#FF69B4", "#DA70D6"],
  "dark-gold": ["#1A1A2E", "#FFD700", "#C0C0C0"],
  monochrome: ["#000000", "#555555", "#FFFFFF"],
  sunset: ["#FF6B6B", "#FFA07A", "#FFE66D"],
  ocean: ["#0077B6", "#00B4D8", "#90E0EF"],
};

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLen);
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
}

function envFirst(...names: string[]): string {
  for (const name of names) {
    const value = (Deno.env.get(name) || "").trim();
    if (value) return value;
  }
  return "";
}

function envHasValue(...names: string[]): boolean {
  return names.some((name) => Boolean((Deno.env.get(name) || "").trim()));
}

interface ProviderAttempt {
  key: ProviderKey;
  name: string;
  maxAttempts: number;
  run: () => Promise<{ dataUri: string; sourceUrl: string }>;
}

const PROVIDER_ALIASES: Record<string, ProviderKey> = {
  lovable: "lovable",
  "lovable-ai": "lovable",
  openai: "openai",
  gpt: "openai",
  xai: "xai",
  grok: "xai",
  "grok-imagine": "xai",
  ideogram: "ideogram",
  picsart: "picsart",
  picart: "picsart",
  stability: "stability",
  stabilityai: "stability",
  "stability.ai": "stability",
  sd: "stability",
  hf: "huggingface",
  huggingface: "huggingface",
  cloudflare: "cloudflare",
  cf: "cloudflare",
  workers: "cloudflare",
  fireworks: "fireworks",
  fw: "fireworks",
  openrouter: "openrouter",
  or: "openrouter",
  pollinations: "pollinations",
  together: "together",
  gemini: "gemini",
  google: "gemini",
  replicate: "replicate",
  fal: "fal",
  "fal.ai": "fal",
};

const PROVIDER_ENV_NAMES: Record<ProviderKey, string[]> = {
  lovable: ["LOVABLE_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  xai: ["XAI_API_KEY", "X_AI_API_KEY", "GROK_API_KEY"],
  ideogram: ["IDEOGRAM_API_KEY", "IDEOGRAM_KEY"],
  picsart: ["PICSART_API_KEY"],
  stability: ["STABILITY_API_KEY", "STABILITY_KEY"],
  huggingface: ["HF_API_TOKEN", "HF_TOKEN", "HUGGINGFACE_KEY"],
  cloudflare: ["CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"],
  fireworks: ["FIREWORKS_API_KEY", "FIREWORKS_KEY"],
  openrouter: ["OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"],
  pollinations: [],
  together: ["TOGETHER_API_KEY", "TOGETHER_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY"],
  replicate: ["REPLICATE_API_TOKEN", "REPLICATE_TOKEN"],
  fal: ["FAL_API_KEY", "FAL_KEY"],
};

// Primary provider plus practical fallbacks.
const DEFAULT_PROVIDER_ORDER: ProviderKey[] = ["lovable", "huggingface", "picsart", "fireworks"];
const PREMIUM_PROVIDER_ORDER: ProviderKey[] = [
  "lovable",
  "openai",
  "xai",
  "ideogram",
  "picsart",
  "stability",
  "huggingface",
  "cloudflare",
  "fireworks",
  "openrouter",
  "pollinations",
  "together",
  "gemini",
  "replicate",
  "fal",
];

function uniqueProviderKeys(keys: ProviderKey[]): ProviderKey[] {
  return Array.from(new Set(keys));
}

function isProviderReady(provider: ProviderKey): boolean {
  if (provider === "cloudflare") {
    return Boolean(
      (Deno.env.get("CLOUDFLARE_API_TOKEN") || Deno.env.get("CF_API_TOKEN") || "").trim() &&
      (Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || Deno.env.get("CF_ACCOUNT_ID") || "").trim()
    );
  }

  return envHasValue(...PROVIDER_ENV_NAMES[provider]);
}

function sortProviderOrder(keys: ProviderKey[]): ProviderKey[] {
  const rank = new Map<ProviderKey, number>(PREMIUM_PROVIDER_ORDER.map((key: ProviderKey, index: number) => [key, index]));
  return uniqueProviderKeys(keys).sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

function prioritizeProvider(provider: ProviderKey, rest: ProviderKey[]): ProviderKey[] {
  return uniqueProviderKeys([provider, ...rest.filter((key) => key !== provider)]);
}

function rotateProviderOrder(keys: ProviderKey[], rotation: number): ProviderKey[] {
  if (keys.length === 0) return keys;
  const offset = Math.abs(rotation) % keys.length;
  return keys.slice(offset).concat(keys.slice(0, offset));
}

function parseProviderList(raw: string): ProviderKey[] {
  if (!raw.trim()) return [];
  return uniqueProviderKeys(
    raw
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .map((token) => PROVIDER_ALIASES[token])
      .filter((key): key is ProviderKey => Boolean(key)),
  );
}

function resolveProviderOrder(): ProviderKey[] {
  const preferConfiguredProviders = (order: ProviderKey[]): ProviderKey[] => {
    const configured = order.filter((provider) => isProviderReady(provider));
    return configured.length > 0 ? configured : order;
  };

  const chainFromEnv = parseProviderList(LOGO_PROVIDER_CHAIN);
  if (chainFromEnv.length > 0) return preferConfiguredProviders(chainFromEnv);

  if (LOGO_PROVIDER_MODE === "huggingface-only" || LOGO_PROVIDER_MODE === "hf-only") {
    return preferConfiguredProviders(DEFAULT_PROVIDER_ORDER);
  }

  if (LOGO_PROVIDER_MODE.endsWith("-only")) {
    const alias = LOGO_PROVIDER_MODE.slice(0, -5).trim();
    const provider = PROVIDER_ALIASES[alias];
    if (provider) return preferConfiguredProviders([provider]);
  }

  return preferConfiguredProviders(DEFAULT_PROVIDER_ORDER);
}

function deriveTaglineFromDescription(description?: string): string | undefined {
  if (!description) return undefined;
  const raw = sanitizeText(description, 180);
  if (!raw) return undefined;
  const firstSentence = raw.split(/[.!?]/)[0]?.trim() ?? "";
  const sourceText = firstSentence || raw;
  return sourceText.slice(0, 56);
}

function inferIndustryFromDescription(description?: string): string | undefined {
  if (!description) return undefined;
  const d = description.toLowerCase();
  const patterns: Array<{ industry: string; match: RegExp }> = [
    { industry: "Food & Beverage", match: /\b(food|drink|beverage|milk|tea|coffee|juice|restaurant|cafe|bakery|snack|dairy)\b/i },
    { industry: "Technology", match: /\b(tech|software|app|saas|ai|automation|cloud|platform|digital|it)\b/i },
    { industry: "Health & Fitness", match: /\b(health|fitness|wellness|gym|clinic|medical|nutrition|yoga)\b/i },
    { industry: "Fashion", match: /\b(fashion|clothing|apparel|wear|style|boutique|jewelry|cosmetic|beauty)\b/i },
    { industry: "Finance", match: /\b(finance|fintech|bank|loan|investment|insurance|payment|trading)\b/i },
    { industry: "Education", match: /\b(education|school|college|learning|course|training|academy|tuition)\b/i },
    { industry: "Real Estate", match: /\b(real estate|property|housing|construction|builder|interior|architecture)\b/i },
    { industry: "Travel", match: /\b(travel|tour|trip|hotel|resort|holiday|tourism)\b/i },
    { industry: "Logistics", match: /\b(logistics|shipping|delivery|transport|supply chain|warehouse|freight)\b/i },
    { industry: "Gaming", match: /\b(gaming|game|esports|streaming)\b/i },
    { industry: "Automotive", match: /\b(auto|automotive|car|bike|vehicle|garage)\b/i },
  ];
  const found = patterns.find((p) => p.match.test(d));
  return found?.industry;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHttpStatus(message: string): number | null {
  const match = message.match(/\((\d{3})\)/);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

function isRetryableStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function isRetryableProviderError(message: string): boolean {
  const status = extractHttpStatus(message);
  if (status !== null && isRetryableStatus(status)) return true;
  return /timeout|timed out|fetch failed|temporar|connection reset|network/i.test(message);
}

async function runWithRetries<T>(name: string, run: () => Promise<T>, maxAttempts: number): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = isRetryableProviderError(message);
      const hasNextAttempt = attempt < maxAttempts;
      if (!retryable || !hasNextAttempt) {
        throw error;
      }
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = 500 * attempt + jitter;
      console.warn(`[generate-logo] ${name} attempt ${attempt} failed, retrying in ${waitMs}ms: ${message}`);
      await delay(waitMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${name} failed after retries.`);
}

function redactSensitiveUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]+/gi, "$1***");
}

function normalizeStyle(style: unknown): LogoStyle {
  const raw = sanitizeText(style, 40).toLowerCase();
  if (!raw) return "mascot";
  return STYLE_ALIASES[raw] ?? "mascot";
}

function normalizeProviderOverride(value: unknown): ProviderKey | null {
  const raw = sanitizeText(value, 40).toLowerCase();
  if (!raw) return null;
  return PROVIDER_ALIASES[raw] ?? null;
}

function normalizeColors(colors: unknown): string[] | undefined {
  if (!Array.isArray(colors)) return undefined;

  const out: string[] = [];
  for (const entry of colors) {
    const raw = sanitizeText(entry, 30);
    if (!raw) continue;
    const key = raw.toLowerCase();

    if (key === "auto") continue;
    if (COLOR_PALETTES[key]) {
      out.push(...COLOR_PALETTES[key]);
      continue;
    }

    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
      out.push(raw.toUpperCase());
      continue;
    }

    if (/^[a-zA-Z][a-zA-Z\s-]{1,20}$/.test(raw)) {
      out.push(raw.toLowerCase());
    }
  }

  const deduped = Array.from(new Set(out));
  return deduped.length > 0 ? deduped.slice(0, 5) : undefined;
}

function normalizeRequest(input: Partial<LogoRequest>): LogoRequest {
  const businessName = sanitizeText(input.businessName, 70);
  const rawIndustry = sanitizeText(input.industry, 60);
  const brandDescription = sanitizeText(input.brandDescription, 280) || undefined;
  const inferredIndustry = inferIndustryFromDescription(brandDescription);
  const industry = (!rawIndustry || rawIndustry.toLowerCase() === "general")
    ? (inferredIndustry || "General")
    : rawIndustry;
  const style = normalizeStyle(input.style);
  const tagline = sanitizeText(input.tagline, 90) || deriveTaglineFromDescription(brandDescription) || undefined;
  const mood = sanitizeText(input.mood, 90) || undefined;
  const styleHint = sanitizeText(input.styleHint, 140) || undefined;
  const iconIdea = sanitizeText(input.iconIdea, 140) || undefined;
  const additionalInstructions = sanitizeText(input.additionalInstructions, 420) || undefined;
  const variationIndex = Number.isFinite(input.variationIndex) ? Number(input.variationIndex) : 0;
  const variationSeed = Number.isFinite(input.variationSeed) ? Number(input.variationSeed) : undefined;

  return {
    businessName,
    industry,
    style,
    iconIdea,
    tagline,
    brandDescription,
    mood,
    styleHint: styleHint ?? style,
    additionalInstructions: [
      `Original requested style was: ${style}.`,
      styleHint ? `Icon/style hint: ${styleHint}.` : "",
      iconIdea ? `Icon idea selected: ${iconIdea}.` : "",
      brandDescription ? `Brand description: ${brandDescription}.` : "",
      additionalInstructions,
    ].filter(Boolean).join(" "),
    variationIndex,
    variationSeed,
    colors: normalizeColors(input.colors),
  };
}

function isDairyBrandRequest(req: LogoRequest): boolean {
  const text = `${req.industry} ${req.brandDescription ?? ""} ${req.iconIdea ?? ""}`.toLowerCase();
  return /\b(milk|dairy|cow milk|fresh milk|butter|cheese|cream|yogurt)\b/i.test(text);
}

function buildBrandFocusDirective(req: LogoRequest): string {
  if (isDairyBrandRequest(req)) {
    return "This is a dairy brand. Prioritize a premium cow mascot, milk seal, or heritage dairy crest with a larger central icon, warm premium anatomy, and strong brand recall. Avoid tiny abstract marks and do not render readable text inside the artwork.";
  }
  if ((req.industry || "").toLowerCase().includes("food")) {
    return "This is a food and beverage brand. Favor a generous, friendly, premium symbol with clear silhouette, appetizing warmth, and strong small-size readability.";
  }
  return "";
}

// ─── PROMPT ENGINE (100x better prompts) ─────────────────────────────────────
function buildLogoPrompt(req: LogoRequest): string {
  const stylePrompts: Record<LogoStyle, string> = {
    mascot:     buildMascotPrompt(req),
    minimalist: buildMinimalistPrompt(req),
    wordmark:   buildWordmarkPrompt(req),
    lettermark: buildLettermarkPrompt(req),
    emblem:     buildEmblemPrompt(req),
    abstract:   buildAbstractPrompt(req),
    vintage:    buildVintagePrompt(req),
    geometric:  buildGeometricPrompt(req),
    "3d":       build3DPrompt(req),
    handdrawn:  buildHanddrawnPrompt(req),
  };
  const base = stylePrompts[req.style] ?? buildMinimalistPrompt(req);
  const styleHint = req.styleHint?.trim() ? ` Use this preferred style direction: ${req.styleHint}.` : "";
  const variation = buildVariationDirective(req);
  const brandFocus = buildBrandFocusDirective(req);
  const iconOnlyRule =
    "Return icon-only artwork. Do not render the brand name, tagline, readable words, letters, numbers, captions, or UI chrome inside the image. The backend will add all text later.";
  const canvasRule =
    "The icon must feel bold, centered, and full-bodied, occupying most of the canvas without tiny margins or empty whitespace.";
  const premiumRule =
    "Think luxury brand asset, not a sticker: high-fashion restraint, strong silhouette, premium negative space, and a mark that can hold up on a boutique storefront, product box, or app splash screen.";
  const luxuryRule =
    "Primary aesthetic: black, ivory, and champagne-gold luxury branding, editorial polish, expensive typography, and a high-end boutique feel.";
  return `${base} ${iconOnlyRule} ${canvasRule} ${premiumRule} ${luxuryRule}${brandFocus ? ` ${brandFocus}` : ""}${styleHint}${variation}`.trim();
}

function buildPollinationsPrompt(req: LogoRequest): string {
  const name = req.businessName.trim();
  const tagline = req.tagline?.trim();
  const brandDescription = req.brandDescription?.trim();
  const iconIdea = req.iconIdea?.trim();
  const colors = req.colors?.length ? `Primary brand colors: ${req.colors.join(", ")}.` : "";
  const styleHint = req.styleHint?.trim() ? `Visual direction: ${req.styleHint}.` : "";
  const extra = req.additionalInstructions?.trim() ? `Extra requirements: ${req.additionalInstructions}.` : "";
  const iconStyleDirective = buildIconStyleDirective(req.iconIdea);
  const brandFocus = buildBrandFocusDirective(req);
  const descriptionDirective = brandDescription
    ? `Brand description context: "${brandDescription}". Design a logo around this core offering and personality.`
    : "";
  const variation = `Variation ${Math.max(1, (req.variationIndex ?? 0) + 1)} with seed ${
    typeof req.variationSeed === "number" ? req.variationSeed : "auto"
  }.`;
  const canvasRule =
    "The mark should occupy most of the frame and avoid tiny centered placement or excessive whitespace.";
  const luxuryRule =
    "Primary aesthetic: black, ivory, and champagne-gold luxury branding, editorial contrast, polished proportions, and a premium boutique feel.";

  const styleDirectives: Record<LogoStyle, string> = {
    mascot:
      "Create a premium mascot logo with a friendly character, bold silhouette, clean vector edges, simple 2-3 color palette, and a memorable brand-ready pose. Make it feel like a real brand character, not a cartoon sticker.",
    minimalist:
      "Create an ultra-premium minimalist logo with one refined geometric symbol, strong negative space, restrained palette, and sharp editorial balance. Prefer a luxury icon or monogram, not a mascot or illustration. Think black, ivory, champagne-gold, and high-contrast editorial styling.",
    wordmark:
      "Create a polished wordmark with custom letterforms, refined spacing, subtle personality, and high-end typography only. Make it feel like a luxury fashion house or premium consultancy, with black, ivory, and gold cues.",
    lettermark:
      "Create a compact luxury monogram built from the initials, with fused shapes, symmetrical balance, and no readable characters. Make the initials merge into one premium symbol, not separate letters, and give it the confidence of a luxury atelier mark with black, ivory, and gold styling.",
    emblem:
      "Create a premium emblem or badge logo with contained geometry, a strong border, heritage character, and clear hierarchy. Make it feel like a real luxury seal, boutique crest, or institutional mark, not a generic badge. Use elegant black, ivory, and gold tones.",
    abstract:
      "Create a sleek abstract mark with motion, balance, and memorable geometry suitable for a premium modern brand. The symbol should be distinctive, simple, and gallery-grade.",
    vintage:
      "Create a refined vintage logo with classic proportions, restrained ornament, and authentic old-world charm. It should feel timeless, print-ready, and intentionally crafted.",
    geometric:
      "Create a precise geometric mark with perfect symmetry, architectural balance, and clean line rhythm. Keep the geometry bold, crisp, and premium.",
    "3d":
      "Create a tasteful dimensional logo with subtle volume, premium material cues, and a clean logo-ready silhouette. Keep the 3D effect elegant and restrained, not toy-like.",
    handdrawn:
      "Create a handcrafted logo with organic linework, artisan feel, and a crisp premium silhouette. The result should look refined, not sketchy or rough.",
  };
  const styleDirective = styleDirectives[req.style] ?? styleDirectives.mascot;
  const iconOnlyRule =
    "Return icon-only artwork. Do not render the brand name, tagline, readable words, letters, numbers, captions, or UI chrome inside the image. The backend will add all text later.";

  return [
    `Create a premium logo for brand "${name}" in the ${req.industry} industry.`,
    `Logo style: ${req.style}.`,
    styleDirective,
    iconStyleDirective,
    brandFocus,
    iconIdea ? `Primary icon style requirement: ${iconIdea}.` : "",
    iconOnlyRule,
    canvasRule,
    "Generate a logo-ready mark. No stock-photo look, no app UI, no screenshot chrome.",
    "Avoid tiny centered icons and avoid excessive empty whitespace.",
    "Use a clean white or transparent background only.",
    luxuryRule,
    `${tagline ? `Mood should reflect tagline context: "${tagline}".` : ""}`,
    descriptionDirective,
    colors,
    styleHint,
    variation,
    "High-end vector-like logo quality with crisp edges and strong silhouette.",
    "Single subject only. No duplicate logos. No additional objects unless they are small supporting accents.",
    `Avoid these issues: ${NEGATIVE_PROMPT}.`,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function composeLogoFromIcon(iconDataUri: string, req: LogoRequest, seed: number): string {
  const dairyBrand = isDairyBrandRequest(req);
  const brandName = toDisplayName(req.businessName || "BRAND");
  const displayName = brandName.length <= 10 ? brandName.toUpperCase() : brandName;
  const tagline = req.tagline ? toTagline(req.tagline) : "";
  const typography = getNameTypography(displayName);
  const variationIndex = Math.max(0, req.variationIndex ?? 0);
  const variant = (Math.abs(seed) + variationIndex * 17) % 6;
  const themes = [
    { bg: "#fff8f1", card: "#ffffff", accent: "#d35400", halo: "rgba(211, 84, 0, 0.12)", ink: "#2b2118", soft: "#fde5d2" },
    { bg: "#f5fbff", card: "#ffffff", accent: "#2563eb", halo: "rgba(37, 99, 235, 0.12)", ink: "#1f2937", soft: "#dbeafe" },
    { bg: "#f5fff7", card: "#ffffff", accent: "#15803d", halo: "rgba(21, 128, 61, 0.12)", ink: "#1f2937", soft: "#dcfce7" },
    { bg: "#fffdf5", card: "#ffffff", accent: "#7c3aed", halo: "rgba(124, 58, 237, 0.12)", ink: "#27213a", soft: "#ede9fe" },
    { bg: "#fff7f5", card: "#ffffff", accent: "#db2777", halo: "rgba(219, 39, 119, 0.12)", ink: "#2a1f28", soft: "#fce7f3" },
    { bg: "#fdfcf8", card: "#ffffff", accent: "#0f766e", halo: "rgba(15, 118, 110, 0.12)", ink: "#20322f", soft: "#d1fae5" },
  ];
  const t = themes[variant % themes.length];
  const styleLabel = escapeXml(req.style);
  const industry = escapeXml(req.industry);
  const escapedName = escapeXml(displayName);
  const escapedTagline = tagline ? escapeXml(tagline) : "";

  const layouts = [
    `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="halo" cx="50%" cy="38%" r="40%">
      <stop offset="0%" stop-color="${t.halo}" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.card}" />
      <stop offset="100%" stop-color="${t.bg}" />
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="72%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${t.card}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#panel)" />
  <rect x="56" y="56" width="912" height="912" rx="42" fill="${t.card}" stroke="rgba(15,23,42,0.08)" stroke-width="3" />
  <circle cx="512" cy="314" r="268" fill="url(#halo)" />
  <circle cx="512" cy="318" r="236" fill="#ffffff" stroke="rgba(15,23,42,0.06)" stroke-width="3" />
  <image href="${iconDataUri}" x="144" y="54" width="736" height="520" preserveAspectRatio="xMidYMid meet" />
  <rect x="194" y="420" width="636" height="150" fill="url(#fade)" />
  <text x="512" y="706" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${typography.size + 16}" font-weight="700" letter-spacing="${Math.max(0.2, typography.spacing / 2)}" fill="${t.ink}">${escapedName}</text>
  <text x="512" y="764" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="${t.accent}">${styleLabel.toUpperCase()} • ${industry.toUpperCase()}</text>
  ${escapedTagline ? `<text x="512" y="810" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" letter-spacing="1.4" fill="${t.ink}" opacity="0.72">${escapedTagline}</text>` : ""}
  <rect x="304" y="852" width="416" height="6" rx="3" fill="${t.accent}" opacity="0.82" />
</svg>`.trim(),
    `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="halo" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="${t.halo}" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="75%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${t.card}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="${t.bg}" />
  <rect x="56" y="56" width="912" height="912" rx="42" fill="${t.card}" stroke="rgba(15,23,42,0.08)" stroke-width="3" />
  <rect x="88" y="110" width="352" height="804" rx="34" fill="rgba(255,255,255,0.72)" stroke="rgba(15,23,42,0.06)" stroke-width="2" />
  <circle cx="264" cy="320" r="180" fill="url(#halo)" />
  <image href="${iconDataUri}" x="104" y="144" width="316" height="350" preserveAspectRatio="xMidYMid meet" />
  <rect x="124" y="516" width="280" height="8" rx="4" fill="${t.accent}" opacity="0.8" />
  <rect x="482" y="164" width="446" height="310" rx="28" fill="#ffffff" stroke="rgba(15,23,42,0.05)" stroke-width="2" />
  <text x="512" y="274" text-anchor="start" font-family="Georgia, 'Times New Roman', serif" font-size="${typography.size + 12}" font-weight="700" letter-spacing="0.5" fill="${t.ink}">${escapedName}</text>
  <text x="512" y="328" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="3" fill="${t.accent}">${styleLabel.toUpperCase()}</text>
  ${escapedTagline ? `<text x="512" y="378" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="600" fill="${t.ink}" opacity="0.72">${escapedTagline}</text>` : ""}
  <line x1="512" y1="430" x2="856" y2="430" stroke="${t.accent}" stroke-width="6" stroke-linecap="round" opacity="0.82" />
</svg>`.trim(),
    `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="halo" cx="50%" cy="38%" r="40%">
      <stop offset="0%" stop-color="${t.halo}" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="68%" stop-color="${t.card}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${t.card}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="${t.bg}" />
  <rect x="56" y="56" width="912" height="912" rx="42" fill="${t.card}" stroke="rgba(15,23,42,0.08)" stroke-width="3" />
  <circle cx="512" cy="340" r="248" fill="#ffffff" stroke="rgba(15,23,42,0.05)" stroke-width="3" />
  <circle cx="512" cy="340" r="274" fill="url(#halo)" />
  <image href="${iconDataUri}" x="${dairyBrand ? 188 : 178}" y="${dairyBrand ? 72 : 84}" width="${dairyBrand ? 644 : 664}" height="${dairyBrand ? 566 : 548}" preserveAspectRatio="xMidYMid meet" />
  <rect x="194" y="420" width="636" height="160" fill="url(#fade)" />
  <text x="512" y="680" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${typography.size + 10}" font-weight="800" letter-spacing="${Math.max(0.6, typography.spacing / 3)}" fill="${t.ink}">${escapedName}</text>
  <text x="512" y="736" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="${t.accent}">${styleLabel.toUpperCase()} • ${industry.toUpperCase()}</text>
  ${escapedTagline ? `<text x="512" y="784" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" letter-spacing="1.3" fill="${t.ink}" opacity="0.72">${escapedTagline}</text>` : ""}
  <rect x="316" y="844" width="392" height="6" rx="3" fill="${t.accent}" opacity="0.82" />
</svg>`.trim(),
    `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="halo" cx="50%" cy="34%" r="44%">
      <stop offset="0%" stop-color="${t.halo}" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.card}" />
      <stop offset="100%" stop-color="${t.bg}" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#panel)" />
  <rect x="56" y="56" width="912" height="912" rx="42" fill="${t.card}" stroke="rgba(15,23,42,0.08)" stroke-width="3" />
  <rect x="116" y="112" width="792" height="548" rx="36" fill="rgba(255,255,255,0.78)" stroke="rgba(15,23,42,0.05)" stroke-width="2" />
  <circle cx="512" cy="322" r="260" fill="url(#halo)" />
  <image href="${iconDataUri}" x="160" y="78" width="704" height="492" preserveAspectRatio="xMidYMid meet" />
  <text x="512" y="738" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${typography.size + 10}" font-weight="800" letter-spacing="${Math.max(0.5, typography.spacing / 2)}" fill="${t.ink}">${escapedName}</text>
  <text x="512" y="796" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="${t.accent}">${styleLabel.toUpperCase()}</text>
  ${escapedTagline ? `<text x="512" y="838" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="600" letter-spacing="1.2" fill="${t.ink}" opacity="0.72">${escapedTagline}</text>` : ""}
  <rect x="302" y="870" width="420" height="6" rx="3" fill="${t.accent}" opacity="0.78" />
</svg>`.trim(),
  ];

  return `data:image/svg+xml;utf8,${encodeURIComponent(layouts[variant % layouts.length])}`;
}

function buildEmergencyLogoFallback(req: LogoRequest, seed: number): string {
  const isDairy = isDairyBrandRequest(req);
  const name = toDisplayName(req.businessName || "BRAND");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "BR";
  const variant = Math.abs(seed) % 6;
  const palettes = [
    { bg: "#0f172a", fill: "#111827", accent: "#d4af37", ink: "#f8f3e8" },
    { bg: "#f7f1e6", fill: "#fffdf8", accent: "#b58a3d", ink: "#2a2115" },
    { bg: "#111111", fill: "#171717", accent: "#c0a36a", ink: "#f7f1e3" },
    { bg: "#f4f0e8", fill: "#ffffff", accent: "#8c6b3f", ink: "#241b10" },
    { bg: "#fffaf0", fill: "#ffffff", accent: "#a67c52", ink: "#2d2118" },
    { bg: "#1c1917", fill: "#201c1a", accent: "#efe3c8", ink: "#faf7f2" },
  ];
  const t = palettes[variant % palettes.length];

  const cowIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="176" fill="${t.fill}" stroke="rgba(15,23,42,0.08)" stroke-width="10"/>
  <path d="M176 142 L138 106 L180 112 L206 146" fill="${t.accent}" opacity="0.9"/>
  <path d="M336 142 L374 106 L332 112 L306 146" fill="${t.accent}" opacity="0.9"/>
  <ellipse cx="256" cy="264" rx="116" ry="108" fill="${t.accent}" opacity="0.16"/>
  <ellipse cx="212" cy="246" rx="26" ry="18" fill="${t.ink}" opacity="0.9"/>
  <ellipse cx="300" cy="246" rx="26" ry="18" fill="${t.ink}" opacity="0.9"/>
  <circle cx="212" cy="248" r="10" fill="#ffffff"/>
  <circle cx="300" cy="248" r="10" fill="#ffffff"/>
  <path d="M226 300 C240 288, 272 288, 286 300 C278 324, 234 324, 226 300Z" fill="#f7c7b8" stroke="${t.ink}" stroke-width="8" />
  <path d="M216 328 C230 342, 282 342, 296 328" stroke="${t.ink}" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M184 212 C198 190, 218 178, 238 174" stroke="${t.ink}" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M328 212 C314 190, 294 178, 274 174" stroke="${t.ink}" stroke-width="8" stroke-linecap="round" fill="none"/>
</svg>`.trim();

  const monogramIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="176" fill="${t.fill}" stroke="rgba(15,23,42,0.08)" stroke-width="10"/>
  <circle cx="256" cy="256" r="128" fill="${t.accent}" opacity="0.12"/>
  <text x="256" y="290" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="800" letter-spacing="3" fill="${t.ink}">${escapeXml(initials)}</text>
  <path d="M170 352 H342" stroke="${t.accent}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
</svg>`.trim();

  const icon = isDairy ? cowIcon : monogramIcon;
  return `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
}

function buildVariationDirective(req: LogoRequest): string {
  const variationFlavors = isDairyBrandRequest(req)
    ? [
        "Use a black-and-gold luxury cow mascot with rounded horns, a confident silhouette, and an upscale crest feel.",
        "Use a heritage dairy seal with a clean circular composition, premium farm-fresh balance, and editorial contrast.",
        "Use a refined milk icon with a bold cream drop, bottle, or splash shape and elegant spacing.",
        "Use a luxury farm crest with a centered bovine symbol, crisp symmetry, and boutique-brand polish.",
        "Use a warm animal mark that still feels premium, minimal, and ready for premium packaging.",
      ]
    : [
        "Use a full-body premium mascot with a bold face, expressive eyes, and simple clothing or accessories.",
        "Use a cute but polished mascot character with a centered pose, clean outlines, and a premium packaging feel.",
        "Use a crowned or branded mascot with a clean silhouette, friendly proportions, and a memorable personality.",
        "Use a mascot character with a bottle, prince, animal, or hero-inspired motif, keeping the design simple and logo-ready.",
        "Use a mascot emblem with strong outline, cheerful expression, and space for a brand title below.",
      ];
  const idx = Math.max(0, req.variationIndex ?? 0);
    const flavor = variationFlavors[idx % variationFlavors.length];
  const seedHint = typeof req.variationSeed === "number" ? ` Seed: ${req.variationSeed}.` : "";
  return ` Variation number: ${idx + 1}. ${flavor}. Do not repeat the same silhouette or icon geometry from earlier variations in this batch.${seedHint}`;
}

function colorBlock(colors?: string[]): string {
  if (!colors || colors.length === 0) return "";
  return `, color palette: ${colors.join(", ")}`;
}

function moodBlock(mood?: string): string {
  return mood ? `, emotional tone: ${mood}` : "";
}

function buildIconStyleDirective(iconIdea?: string): string {
  const key = iconIdea?.trim().toLowerCase();
  if (!key) return "";
  const directives: Record<string, string> = {
    "abstract shapes": "Icon style is mandatory: use abstract geometric shapes with premium balance, clean negative space, and one unmistakable silhouette.",
    "letter-based": "Icon style is mandatory: create a custom letter-based monogram or initials mark with premium typographic geometry, not plain text.",
    "mascot character": "Icon style is mandatory: create a premium mascot character with a bold silhouette, expressive face, simple clothing or accessory cues, and a logo-ready full-body pose.",
    "nature element": "Icon style is mandatory: use a refined nature symbol such as a leaf, wave, seed, sun, or petal with elegant simplicity.",
    "animal": "Icon style is mandatory: use a stylized animal symbol with clean contours, minimal detail, and a memorable silhouette.",
    "shield/badge": "Icon style is mandatory: use a structured shield or badge form with strong framing and clear premium hierarchy.",
    "circuit/tech": "Icon style is mandatory: use circuit-inspired or tech-line geometry with precise structure and modern clarity.",
    "crown/luxury": "Icon style is mandatory: express luxury through a crown, crest, or regal abstract symbol with restrained elegance.",
    "globe/world": "Icon style is mandatory: use globe or world symbolism in a clean, modern, premium way.",
    "lightning bolt": "Icon style is mandatory: use a bold lightning-bolt energy symbol with sharp edges and premium simplicity.",
    "leaf/eco": "Icon style is mandatory: use an eco or leaf symbol with clean modern lines and premium restraint.",
    "compass/direction": "Icon style is mandatory: use compass or direction symbolism with precise geometry and a calm premium feel.",
  };
  return directives[key] || `Icon style is mandatory: follow the selected motif "${iconIdea}" with a clean premium silhouette and no extra clutter.`;
}

function buildMascotPrompt(r: LogoRequest): string {
  return `Premium mascot logo for "${r.businessName}" in the ${r.industry} industry. \
Create one friendly full-body mascot character with a bold silhouette, expressive face, simple clothing or accessories, and a premium brand pose. \
The mascot should feel memorable, scalable, polished, and brand-ownable rather than childish or messy. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
White or transparent background, 2-4 colors max${colorBlock(r.colors)}${moodBlock(r.mood)}. \
No clutter, no extra objects, no mockup frame, no heavy shadows. Keep it cute, premium, and logo-ready. ${r.additionalInstructions ?? ""}`.trim();
}

function buildMinimalistPrompt(r: LogoRequest): string {
  return `Ultra-premium minimalist logo for "${r.businessName}", ${r.industry} brand. \
One refined geometric symbol with strong negative space, calm proportions, and a restrained palette. \
The design should feel expensive, modern, and instantly recognizable at small sizes. \
Do not render readable text in the artwork; the backend will add the brand name separately. \
Prioritize a single icon or monogram, not a mascot, not a badge, not a busy illustration. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
White or transparent background, 1-2 colors max${colorBlock(r.colors)}${moodBlock(r.mood)}. \
No clutter, no gradients, no mockup, no decorative extras. ${r.additionalInstructions ?? ""}`.trim();
}

function buildWordmarkPrompt(r: LogoRequest): string {
  return `Premium wordmark for "${r.businessName}", ${r.industry} company. \
Create a typography-inspired symbol or emblem with custom letterform geometry, elegant kerning, and a distinct high-end personality. \
Do not render readable words in the artwork; the backend will add the brand name later. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
Color direction: ${r.colors?.join(", ") || "single strong brand color on white"}${moodBlock(r.mood)}. \
White or transparent background, no mockup, no effects. ${r.additionalInstructions ?? ""}`.trim();
}

function buildLettermarkPrompt(r: LogoRequest): string {
  const initials = r.businessName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return `Sophisticated lettermark logo using initials "${initials}" for "${r.businessName}", ${r.industry}. \
Design a compact monogram with fused initials, symmetrical balance, and a premium editorial finish. \
The mark should look custom, not like a generic font stack or simple text arrangement. \
The initials must feel designed into one symbol, not just typed out. \
Do not render readable words in the artwork; the backend will add the brand name separately. \
${r.colors ? `Brand colors: ${r.colors.join(", ")}.` : "Single strong color on white."} \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : "Keep supporting text minimal."} \
White or transparent background, clean vector, luxury feel${moodBlock(r.mood)}. ${r.additionalInstructions ?? ""}`.trim();
}

function buildEmblemPrompt(r: LogoRequest): string {
  return `Premium emblem logo for "${r.businessName}", ${r.industry}. \
Create a contained crest, badge, or seal with a strong border, clear hierarchy, and a refined heritage feel. \
The center should hold a simple iconic symbol and any typography must be deferred to the backend composition. \
Make the entire composition feel like a luxury seal or institutional crest. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Colors: ${r.colors.join(", ")}.` : "Classic 2-3 color palette."} \
White or transparent background, precise vector geometry, no clutter${moodBlock(r.mood)}. \
Focus on premium structure rather than ornate decoration. ${r.additionalInstructions ?? ""}`.trim();
}

function buildAbstractPrompt(r: LogoRequest): string {
  return `Bold abstract logo for "${r.businessName}", ${r.industry}. \
Create a unique geometric symbol that suggests motion, growth, or energy without becoming literal. \
The mark should be memorable on its own and feel like a premium brand asset. \
It should be simple enough to live as a favicon or app icon while still feeling distinctive. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Color palette: ${r.colors.join(", ")}.` : "Two-color bold palette."} \
White or transparent background, vector precision, strong silhouette${moodBlock(r.mood)}. \
No clip-art look, no generic swooshes, no extra decorative clutter. ${r.additionalInstructions ?? ""}`.trim();
}

function buildVintagePrompt(r: LogoRequest): string {
  return `Refined vintage logo for "${r.businessName}", ${r.industry}. \
Build a classic retro mark with balanced ornament, old-world charm, and timeless proportions. \
Use heritage-inspired lettering and subtle texture, but keep the logo clean and scalable. \
The style should feel like a premium heritage label, not a distressed novelty graphic. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Colors: ${r.colors.join(", ")}.` : "Warm sepia, deep navy, and aged gold."} \
White or transparent background, premium print-ready feel${moodBlock(r.mood)}. \
Avoid messy distressing or over-decoration. ${r.additionalInstructions ?? ""}`.trim();
}

function buildGeometricPrompt(r: LogoRequest): string {
  return `Precise geometric logo for "${r.businessName}", ${r.industry}. \
Create a mathematically balanced mark built from circles, triangles, hexagons, or polygons. \
The result should feel architectural, modern, and carefully aligned on a grid. \
Keep the silhouette bold enough to read instantly at small sizes. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Colors: ${r.colors.join(", ")}.` : "Monochrome or bold 2-color split."} \
White or transparent background, crisp vector precision${moodBlock(r.mood)}. \
No decorative clutter, no illustration feel, only structured geometry. ${r.additionalInstructions ?? ""}`.trim();
}

function build3DPrompt(r: LogoRequest): string {
  return `Premium dimensional logo for "${r.businessName}", ${r.industry}. \
Create a tasteful 3D mark with subtle volume, realistic lighting, and a logo-ready silhouette. \
The depth should feel expensive and controlled, not like a game asset or heavy mockup. \
Treat the 3D effect as a premium accent, not the main event. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Material colors: ${r.colors.join(", ")}.` : "Chrome, gold, or deep matte finish."} \
Clean white or light neutral background, studio lighting${moodBlock(r.mood)}. \
Keep it sharp, premium, and easy to read at small sizes. ${r.additionalInstructions ?? ""}`.trim();
}

function buildHanddrawnPrompt(r: LogoRequest): string {
  return `Artisan hand-drawn logo for "${r.businessName}", ${r.industry}. \
Create an organic hand-drawn mark with clean linework, authentic texture, and a premium crafted feel. \
The logo should look intentionally illustrated, not messy or casual. \
It should feel boutique and polished, with deliberate line control and strong silhouette. \
Do not render readable text in the artwork; the backend will add the brand name and tagline separately. \
${r.tagline ? `Tagline "${r.tagline}" should influence mood only.` : ""} \
${r.colors ? `Colors: ${r.colors.join(", ")}.` : "Ink black with one warm accent color."} \
White or transparent background, crisp silhouette, artisan quality${moodBlock(r.mood)}. \
Keep it refined and brand-ready rather than sketchy. ${r.additionalInstructions ?? ""}`.trim();
}

// ─── NEGATIVE PROMPT ─────────────────────────────────────────────────────────
const NEGATIVE_PROMPT = [
  "blurry", "low quality", "pixelated", "distorted text", "misspelled",
  "extra letters", "garbled text", "photographic", "realistic photo",
    "minimal plain icon", "generic clipart mascot", "duplicated logo card",
    "tiny logo", "small centered logo", "excessive whitespace", "logo in corner",
    "watermark", "signature", "copyright",
    "embedded text", "brand name inside icon", "tagline inside icon", "wordmark inside icon",
    "multiple logos", "repeated elements",
  "cluttered", "busy background", "complex background", "pastel", "toy-like",
  "drop shadow", "glow effect", "lens flare",
  "amateur", "clip art", "stock photo style",
  "illegible text", "overlapping text", "cut off text",
].join(", ");

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 22);
}

function toDisplayNameVariant(baseName: string, variant: number): string {
  const cleaned = baseName.trim().replace(/\s+/g, " ").slice(0, 22);
  if (!cleaned) return "YOUR BRAND";

  if (variant % 3 === 0) {
    return cleaned
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .slice(0, 22);
  }

  if (variant % 3 === 1) {
    return cleaned.toUpperCase().slice(0, 22);
  }

  return cleaned
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .slice(0, 22);
}

function toTagline(tagline?: string): string {
  const base = (tagline?.trim() || "Premium brand identity").replace(/\s+/g, " ");
  if (!base) return "Premium brand identity";
  return base.slice(0, 48);
}

function getNameTypography(name: string): { size: number; spacing: number; textLength: number } {
  const plainLen = name.replace(/\s+/g, "").length;
  if (plainLen <= 6) return { size: 82, spacing: 3.6, textLength: 470 };
  if (plainLen <= 10) return { size: 74, spacing: 2.4, textLength: 560 };
  if (plainLen <= 14) return { size: 66, spacing: 1.8, textLength: 620 };
  return { size: 58, spacing: 1.2, textLength: 660 };
}

function getTaglineTypography(tagline: string): { size: number; spacing: number; textLength: number } {
  const plainLen = tagline.replace(/\s+/g, "").length;
  if (plainLen <= 10) return { size: 30, spacing: 5, textLength: 450 };
  if (plainLen <= 16) return { size: 26, spacing: 3.2, textLength: 540 };
  if (plainLen <= 24) return { size: 23, spacing: 2.2, textLength: 620 };
  if (plainLen <= 32) return { size: 21, spacing: 1.8, textLength: 690 };
  return { size: 20, spacing: 1.4, textLength: 760 };
}

function pick<T>(items: T[], idx: number): T {
  return items[Math.abs(idx) % items.length];
}

function mascotCharacterSvg(seed: number, primary: string, secondary: string, accent: string): string {
  const pose = Math.abs(seed) % 5;
  const bodyColor = escapeXml(primary);
  const detailColor = escapeXml(secondary);
  const accentColor = escapeXml(accent);

  if (pose === 0) {
    return `
      <ellipse cx="512" cy="354" rx="138" ry="154" fill="${bodyColor}" />
      <ellipse cx="512" cy="392" rx="86" ry="94" fill="#ffffff" opacity="0.9" />
      <circle cx="468" cy="316" r="16" fill="${detailColor}" />
      <circle cx="556" cy="316" r="16" fill="${detailColor}" />
      <path d="M464 372 C486 402, 538 402, 560 372" stroke="${detailColor}" stroke-width="12" stroke-linecap="round" fill="none" />
      <circle cx="404" cy="312" r="30" fill="${accentColor}" />
      <circle cx="620" cy="312" r="30" fill="${accentColor}" />
      <path d="M454 214 L488 252" stroke="${detailColor}" stroke-width="12" stroke-linecap="round" />
      <path d="M570 214 L536 252" stroke="${detailColor}" stroke-width="12" stroke-linecap="round" />
    `.trim();
  }

  if (pose === 1) {
    return `
      <rect x="390" y="206" width="244" height="286" rx="96" fill="${bodyColor}" />
      <rect x="440" y="286" width="144" height="146" rx="62" fill="#ffffff" opacity="0.88" />
      <circle cx="470" cy="296" r="15" fill="${detailColor}" />
      <circle cx="554" cy="296" r="15" fill="${detailColor}" />
      <path d="M468 350 C488 378, 536 378, 556 350" stroke="${detailColor}" stroke-width="10" stroke-linecap="round" fill="none" />
      <path d="M370 348 C342 328, 328 304, 332 274" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M654 348 C682 328, 696 304, 692 274" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <rect x="466" y="176" width="92" height="28" rx="14" fill="${accentColor}" />
    `.trim();
  }

  if (pose === 2) {
    return `
      <path d="M512 194 C432 242, 386 328, 402 420 C413 484, 454 526, 512 568 C570 526, 611 484, 622 420 C638 328, 592 242, 512 194 Z" fill="${bodyColor}" />
      <path d="M512 246 C468 278, 445 330, 456 390 C464 430, 486 458, 512 484 C538 458, 560 430, 568 390 C579 330, 556 278, 512 246 Z" fill="#ffffff" opacity="0.9" />
      <circle cx="476" cy="334" r="14" fill="${detailColor}" />
      <circle cx="548" cy="334" r="14" fill="${detailColor}" />
      <path d="M474 382 C492 404, 532 404, 550 382" stroke="${detailColor}" stroke-width="10" stroke-linecap="round" fill="none" />
      <path d="M438 234 C418 210, 404 192, 394 170" stroke="${accentColor}" stroke-width="10" stroke-linecap="round" />
      <path d="M586 234 C606 210, 620 192, 630 170" stroke="${accentColor}" stroke-width="10" stroke-linecap="round" />
    `.trim();
  }

  if (pose === 3) {
    return `
      <rect x="398" y="224" width="228" height="250" rx="70" fill="${bodyColor}" />
      <rect x="446" y="290" width="132" height="140" rx="52" fill="#ffffff" opacity="0.9" />
      <circle cx="472" cy="318" r="13" fill="${detailColor}" />
      <circle cx="552" cy="318" r="13" fill="${detailColor}" />
      <path d="M470 366 C490 390, 534 390, 554 366" stroke="${detailColor}" stroke-width="10" stroke-linecap="round" fill="none" />
      <path d="M392 268 L356 240" stroke="${accentColor}" stroke-width="12" stroke-linecap="round" />
      <path d="M632 268 L668 240" stroke="${accentColor}" stroke-width="12" stroke-linecap="round" />
      <path d="M470 214 L492 188 L512 214 L532 188 L554 214" fill="${accentColor}" />
    `.trim();
  }

  return `
    <ellipse cx="512" cy="356" rx="148" ry="160" fill="${bodyColor}" />
    <ellipse cx="512" cy="406" rx="94" ry="102" fill="#ffffff" opacity="0.9" />
    <circle cx="466" cy="330" r="15" fill="${detailColor}" />
    <circle cx="558" cy="330" r="15" fill="${detailColor}" />
    <path d="M462 386 C486 416, 538 416, 562 386" stroke="${detailColor}" stroke-width="12" stroke-linecap="round" fill="none" />
    <path d="M364 382 C338 374, 318 358, 304 336" stroke="${accentColor}" stroke-width="12" stroke-linecap="round" fill="none" />
    <path d="M660 382 C686 374, 706 358, 720 336" stroke="${accentColor}" stroke-width="12" stroke-linecap="round" fill="none" />
    <circle cx="512" cy="212" r="36" fill="${accentColor}" />
  `.trim();
}

function dairyMascotSvg(seed: number, primary: string, secondary: string, accent: string): string {
  const pose = Math.abs(seed) % 4;
  const line = escapeXml(primary);
  const spot = escapeXml(secondary);
  const accentColor = escapeXml(accent);

  const variants = [
    `
      <ellipse cx="512" cy="350" rx="154" ry="166" fill="#ffffff" stroke="${line}" stroke-width="10" />
      <ellipse cx="512" cy="378" rx="96" ry="104" fill="#fff8f3" stroke="rgba(0,0,0,0.04)" stroke-width="3" />
      <path d="M406 250 L368 210" stroke="${line}" stroke-width="14" stroke-linecap="round" />
      <path d="M618 250 L656 210" stroke="${line}" stroke-width="14" stroke-linecap="round" />
      <path d="M392 296 C360 280, 344 256, 344 236" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M632 296 C664 280, 680 256, 680 236" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <circle cx="468" cy="332" r="16" fill="${line}" />
      <circle cx="556" cy="332" r="16" fill="${line}" />
      <path d="M456 386 C480 414, 544 414, 568 386" stroke="${line}" stroke-width="12" stroke-linecap="round" fill="none" />
      <ellipse cx="512" cy="430" rx="58" ry="44" fill="${accentColor}" />
      <circle cx="492" cy="424" r="8" fill="#ffffff" opacity="0.92" />
      <circle cx="532" cy="424" r="8" fill="#ffffff" opacity="0.92" />
      <path d="M480 454 C496 468, 528 468, 544 454" stroke="${line}" stroke-width="10" stroke-linecap="round" fill="none" />
      <path d="M406 442 C370 452, 344 472, 330 502" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
      <path d="M618 442 C654 452, 680 472, 694 502" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
    `,
    `
      <ellipse cx="512" cy="352" rx="142" ry="156" fill="#ffffff" stroke="${line}" stroke-width="10" />
      <ellipse cx="512" cy="384" rx="92" ry="102" fill="#fffaf5" stroke="rgba(0,0,0,0.05)" stroke-width="3" />
      <path d="M392 270 C360 244, 350 222, 350 202" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M632 270 C664 244, 674 222, 674 202" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <circle cx="468" cy="334" r="15" fill="${line}" />
      <circle cx="556" cy="334" r="15" fill="${line}" />
      <path d="M454 388 C476 408, 548 408, 570 388" stroke="${line}" stroke-width="12" stroke-linecap="round" fill="none" />
      <ellipse cx="512" cy="430" rx="56" ry="42" fill="${spot}" opacity="0.9" />
      <rect x="484" y="416" width="56" height="28" rx="14" fill="#ffffff" opacity="0.9" />
      <path d="M416 446 C388 460, 362 486, 352 516" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
      <path d="M608 446 C636 460, 662 486, 672 516" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
    `,
    `
      <ellipse cx="512" cy="344" rx="156" ry="166" fill="#ffffff" stroke="${line}" stroke-width="10" />
      <ellipse cx="512" cy="374" rx="98" ry="106" fill="#fff7f1" stroke="rgba(0,0,0,0.04)" stroke-width="3" />
      <path d="M414 252 C390 230, 382 210, 384 190" stroke="${line}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M610 252 C634 230, 642 210, 640 190" stroke="${line}" stroke-width="14" stroke-linecap="round" fill="none" />
      <circle cx="468" cy="332" r="15" fill="${line}" />
      <circle cx="556" cy="332" r="15" fill="${line}" />
      <path d="M454 386 C476 406, 548 406, 570 386" stroke="${line}" stroke-width="12" stroke-linecap="round" fill="none" />
      <ellipse cx="512" cy="428" rx="56" ry="44" fill="#ffd5c2" />
      <circle cx="490" cy="422" r="8" fill="#ffffff" />
      <circle cx="534" cy="422" r="8" fill="#ffffff" />
      <path d="M480 452 C496 466, 528 466, 544 452" stroke="${line}" stroke-width="10" stroke-linecap="round" fill="none" />
      <path d="M414 438 C388 458, 366 486, 356 516" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
      <path d="M610 438 C636 458, 658 486, 668 516" stroke="${spot}" stroke-width="12" stroke-linecap="round" fill="none" />
    `,
    `
      <ellipse cx="512" cy="350" rx="150" ry="162" fill="#ffffff" stroke="${line}" stroke-width="10" />
      <ellipse cx="512" cy="384" rx="92" ry="102" fill="#fff9f2" stroke="rgba(0,0,0,0.04)" stroke-width="3" />
      <path d="M400 252 C378 236, 366 214, 362 192" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M624 252 C646 236, 658 214, 662 192" stroke="${accentColor}" stroke-width="14" stroke-linecap="round" fill="none" />
      <circle cx="466" cy="334" r="15" fill="${line}" />
      <circle cx="558" cy="334" r="15" fill="${line}" />
      <path d="M454 390 C478 410, 546 410, 570 390" stroke="${line}" stroke-width="12" stroke-linecap="round" fill="none" />
      <ellipse cx="512" cy="430" rx="60" ry="44" fill="${spot}" opacity="0.86" />
      <path d="M482 452 C500 466, 524 466, 542 452" stroke="${line}" stroke-width="10" stroke-linecap="round" fill="none" />
    `,
  ];

  return variants[pose];
}

// ─── PROVIDERS ───────────────────────────────────────────────────────────────

function guessImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  if (bytes.length >= 6) {
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }
  return null;
}

function toTextPreview(bytes: Uint8Array, max = 300): string {
  const sample = bytes.subarray(0, Math.min(bytes.length, max));
  return new TextDecoder().decode(sample).replace(/\s+/g, " ").trim();
}

async function imageResponseToDataUri(res: Response): Promise<string> {
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const declaredMime = contentType.split(";")[0].trim();
  const guessedMime = guessImageMime(bytes);

  if (declaredMime.includes("application/json") || declaredMime.startsWith("text/")) {
    const preview = toTextPreview(bytes);
    throw new Error(`Image response was not an image: ${preview}`);
  }

  if (!declaredMime.startsWith("image/") && !guessedMime) {
    const preview = toTextPreview(bytes);
    throw new Error(`Image response had unsupported content-type "${declaredMime || "unknown"}": ${preview}`);
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const mime = declaredMime.startsWith("image/") ? declaredMime : (guessedMime || "image/png");
  return `data:${mime};base64,${base64}`;
}

function base64ToDataUri(base64: string, mime = "image/png"): string {
  const cleaned = base64.trim();
  if (cleaned.startsWith("data:image/")) return cleaned;
  return `data:${mime};base64,${cleaned}`;
}

async function pickImageDataUri(payload: unknown): Promise<string | null> {
  if (!payload) return null;

  if (typeof payload === "string") {
    const value = payload.trim();
    if (!value) return null;
    if (value.startsWith("data:image/")) return value;
    if (/^https?:\/\//i.test(value)) return imageUrlToDataUri(value);
    if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.length > 120) {
      return base64ToDataUri(value.replace(/\s+/g, ""));
    }
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = await pickImageDataUri(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const orderedKeys = [
      "image",
      "images",
      "generated_images",
      "url",
      "image_url",
      "b64_json",
      "bytesBase64Encoded",
      "base64_image",
      "base64",
      "data",
      "output",
      "result",
      "predictions",
    ];

    for (const key of orderedKeys) {
      if (!(key in obj)) continue;
      const found = await pickImageDataUri(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

function extractFirstHttpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s"'`)>]+/i);
  return match ? match[0] : null;
}

function pickOpenRouterImageCandidate(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const directKeys = ["image", "images", "image_url", "b64_json", "base64", "output", "result", "data"];
  for (const key of directKeys) {
    if (key in root && root[key]) return root[key];
  }

  const choices = Array.isArray(root.choices) ? root.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue;
    const message = (choice as Record<string, unknown>).message;
    if (!message || typeof message !== "object") continue;
    const msg = message as Record<string, unknown>;

    if (msg.images) return msg.images;
    if (msg.image) return msg.image;

    const content = msg.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (!item) continue;
        if (typeof item === "string") {
          const url = extractFirstHttpUrl(item);
          if (url) return url;
          continue;
        }
        if (typeof item !== "object") continue;
        const part = item as Record<string, unknown>;
        if (part.image_url) return part.image_url;
        if (part.b64_json) return part.b64_json;
        if (part.url) return part.url;
        if (typeof part.text === "string") {
          const url = extractFirstHttpUrl(part.text);
          if (url) return url;
        }
      }
      continue;
    }

    if (typeof content === "string") {
      const url = extractFirstHttpUrl(content);
      if (url) return url;
    }
  }

  return null;
}

function pickCohereText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;

  if (typeof root.text === "string") return root.text.trim();
  if (typeof root.output_text === "string") return root.output_text.trim();

  const message = root.message;
  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const text = (item as Record<string, unknown>).text;
        if (typeof text === "string" && text.trim()) return text.trim();
      }
    }
  }

  return "";
}

async function maybeEnhancePromptWithCohere(basePrompt: string, req: LogoRequest): Promise<{ prompt: string; enhancer: string | null }> {
  const token = envFirst("COHERE_API_KEY", "COHERE_KEY");
  if (!token) return { prompt: basePrompt, enhancer: null };

  const model = envFirst("COHERE_CHAT_MODEL", "COHERE_MODEL") || "command-r7b-12-2024";
  const endpoint = envFirst("COHERE_CHAT_ENDPOINT", "COHERE_API_URL") || "https://api.cohere.com/v2/chat";
  const rewriteInstruction = [
    "Rewrite the input into one premium logo image prompt for a text-to-image model.",
    `Business: ${req.businessName}.`,
    `Industry: ${req.industry}.`,
    `Style: ${req.style}.`,
    req.iconIdea ? `Icon style: ${req.iconIdea}.` : "",
    "Keep output under 120 words.",
    "Mandatory constraints: single luxury logo icon, centered composition, clean white or transparent background, no mockup, no multiple logos, no UI screenshots, no tiny badge marks.",
    "Return prompt text only.",
    `Input prompt: ${basePrompt}`,
  ].filter(Boolean).join(" ");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 240,
        messages: [{ role: "user", content: rewriteInstruction }],
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere prompt enhancer failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const rewritten = sanitizeText(pickCohereText(data), 1100);
    if (!rewritten) {
      throw new Error("Cohere prompt enhancer returned empty text.");
    }

    const enforced = `${rewritten} Single centered logo icon, no mockup, white or transparent background only.`;
    return { prompt: enforced, enhancer: `cohere/${model}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[generate-logo] Cohere enhancer skipped: ${message}`);
    return { prompt: basePrompt, enhancer: null };
  }
}

async function fetchPollinations(prompt: string, seed: number, key?: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "";
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
    prompt
  )}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux${keyParam}`;

  const headers: Record<string, string> = { Accept: "image/*" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pollinations fallback failed (${res.status}): ${err}`);
  }
  const dataUri = await imageResponseToDataUri(res);
  return { dataUri, sourceUrl: redactSensitiveUrl(url) };
}

async function generateWithPollinationsFree(prompt: string, seed: number): Promise<{ dataUri: string; sourceUrl: string }> {
  const key = (Deno.env.get("POLLINATIONS_API_KEY") || Deno.env.get("POLLINATIONS_KEY") || "").trim();

  if (key) {
    try {
      return await fetchPollinations(prompt, seed, key);
    } catch (error) {
      // Keep a no-key attempt as backup.
      return await fetchPollinations(prompt, seed);
    }
  }

  return await fetchPollinations(prompt, seed);
}

async function imageUrlToDataUri(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "image/*" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image fetch failed (${res.status}): ${err}`);
  }
  return imageResponseToDataUri(res);
}

async function generateWithCloudflareWorkersAI(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = (Deno.env.get("CLOUDFLARE_API_TOKEN") || Deno.env.get("CF_API_TOKEN") || "").trim();
  const accountId = (Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || Deno.env.get("CF_ACCOUNT_ID") || "").trim();
  const configuredModel = (Deno.env.get("CLOUDFLARE_AI_MODEL") || "").trim();
  const configuredModels = (Deno.env.get("CLOUDFLARE_AI_MODELS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const models = Array.from(
    new Set(
      [
        ...configuredModels,
        configuredModel || "@cf/black-forest-labs/flux-1-schnell",
      ].filter(Boolean),
    ),
  );

  if (!token || !accountId) {
    throw new Error("Cloudflare Workers AI is not configured (missing token/account id).");
  }

  const modelErrors: string[] = [];
  for (const model of models) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/*, application/json",
        },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloudflare Workers AI failed (${res.status}): ${err}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.startsWith("image/") || contentType.startsWith("application/octet-stream")) {
        const dataUri = await imageResponseToDataUri(res);
        return { dataUri, sourceUrl: endpoint };
      }

      const data = await res.json();
      if (data && typeof data === "object" && "success" in (data as Record<string, unknown>) && (data as { success?: boolean }).success === false) {
        const errors = (data as { errors?: Array<{ message?: string }> }).errors || [];
        const joined = errors.map((error) => error.message || "unknown error").join(" | ");
        throw new Error(`Cloudflare Workers AI returned success=false: ${joined || "no details"}`);
      }
      const dataUri = await pickImageDataUri((data as { result?: unknown })?.result ?? data);
      if (!dataUri) {
        throw new Error("Cloudflare Workers AI returned no image data.");
      }
      return { dataUri, sourceUrl: endpoint };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      modelErrors.push(`${model}: ${message}`);
    }
  }

  throw new Error(`Cloudflare Workers AI failed for all configured models: ${modelErrors.join(" | ")}`);
}

async function generateWithOpenAI(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = (Deno.env.get("OPENAI_API_KEY") || "").trim();
  if (!token) {
    throw new Error("OpenAI is not configured (missing OPENAI_API_KEY).");
  }

  const endpoint = "https://api.openai.com/v1/images/generations";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "high",
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri(data?.data ?? data);
  if (!dataUri) {
    throw new Error("OpenAI image generation returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

async function generateWithPicsart(prompt: string, body: LogoRequest): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("PICSART_API_KEY");
  if (!token) {
    throw new Error("Picsart is not configured (missing PICSART_API_KEY).");
  }

  const endpoint = "https://genai-api.picsart.io/v1/logo";
  const resultEndpointBase = "https://genai-api.picsart.io/v1/logo/inferences";
  const params = new URLSearchParams({
    company_name: body.businessName,
    brand_name: body.businessName,
    company_info: `${body.businessName} | ${body.industry}`,
    description: prompt,
    business_description: body.brandDescription || body.additionalInstructions || prompt,
    prompt,
    style: body.style,
    industry: body.industry,
    colors: (body.colors || []).join(", "),
    additional_information: body.additionalInstructions || "",
    additional_instructions: body.additionalInstructions || "",
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Picsart-API-Key": token,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok && res.status !== 202) {
    const err = await res.text();
    throw new Error(`Picsart logo generation failed (${res.status}): ${err}`);
  }

  let data: Record<string, unknown> = {};
  try {
    data = await res.json() as Record<string, unknown>;
  } catch {
    data = {};
  }

  const dataRecord = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : null;
  const inferenceId = pickString(data.inference_id, data.id, dataRecord?.id);

  const directDataUri = await pickImageDataUri((data as { data?: unknown }).data ?? data);
  if (directDataUri) {
    return { dataUri: directDataUri, sourceUrl: endpoint };
  }

  if (!inferenceId) {
    throw new Error("Picsart logo generation returned no inference id or image data.");
  }

  for (let attempt = 1; attempt <= 25; attempt++) {
    await delay(1200);
    const pollRes = await fetch(`${resultEndpointBase}/${encodeURIComponent(inferenceId)}`, {
      method: "GET",
      headers: {
        "X-Picsart-API-Key": token,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      if (pollRes.status === 202 || pollRes.status === 409 || pollRes.status === 425) {
        continue;
      }
      throw new Error(`Picsart result polling failed (${pollRes.status}): ${err}`);
    }

    const pollData = await pollRes.json() as Record<string, unknown>;
    const pollDataUri = await pickImageDataUri((pollData as { data?: unknown }).data ?? pollData);
    if (pollDataUri) {
      return { dataUri: pollDataUri, sourceUrl: `${resultEndpointBase}/${encodeURIComponent(inferenceId)}` };
    }

    const status = String((pollData.status ?? "")).toLowerCase();
    if (status === "failed" || status === "error") {
      throw new Error(`Picsart logo generation failed: ${JSON.stringify(pollData.error || pollData)}`);
    }
  }

  throw new Error("Picsart logo generation timed out before completion.");
}

async function generateWithStability(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("STABILITY_API_KEY", "STABILITY_KEY");
  if (!token) {
    throw new Error("Stability AI is not configured (missing STABILITY_API_KEY).");
  }

  const engineId = envFirst("STABILITY_ENGINE_ID", "STABILITY_MODEL") || "stable-diffusion-xl-1024-v1-0";
  const endpoint = `https://api.stability.ai/v1/generation/${encodeURIComponent(engineId)}/text-to-image`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
      "Stability-Client-ID": "Neural Muse Maker",
      "Stability-Client-Version": BUILD_VERSION,
    },
    body: JSON.stringify({
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
      text_prompts: [{ text: prompt, weight: 1 }],
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stability AI generation failed (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.startsWith("image/") || contentType.startsWith("application/octet-stream")) {
    const dataUri = await imageResponseToDataUri(res);
    return { dataUri, sourceUrl: endpoint };
  }

  const data = await res.json() as Record<string, unknown>;
  const dataUri = await pickImageDataUri((data as { artifacts?: unknown }).artifacts ?? data);
  if (!dataUri) {
    throw new Error("Stability AI returned no image data.");
  }

  return { dataUri, sourceUrl: endpoint };
}

async function generateWithXAI(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("XAI_API_KEY", "X_AI_API_KEY", "GROK_API_KEY");
  if (!token) {
    throw new Error("xAI is not configured (missing XAI_API_KEY).");
  }

  const model = envFirst("XAI_IMAGE_MODEL", "XAI_MODEL") || "grok-2-image";
  const endpoint = envFirst("XAI_IMAGE_ENDPOINT") || "https://api.x.ai/v1/images/generations";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri((data as { data?: unknown }).data ?? data);
  if (!dataUri) {
    throw new Error("xAI image generation returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

async function generateWithIdeogram(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("IDEOGRAM_API_KEY", "IDEOGRAM_KEY");
  if (!token) {
    throw new Error("Ideogram is not configured (missing IDEOGRAM_API_KEY).");
  }

  const endpoint = envFirst("IDEOGRAM_IMAGE_ENDPOINT") || "https://api.ideogram.ai/v1/ideogram-v3/generate";
  const renderingSpeed = envFirst("IDEOGRAM_RENDERING_SPEED") || "TURBO";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Api-Key": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt,
      rendering_speed: renderingSpeed,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ideogram generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri((data as { data?: unknown }).data ?? data);
  if (!dataUri) {
    throw new Error("Ideogram generation returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

async function generateWithFireworks(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("FIREWORKS_API_KEY", "FIREWORKS_KEY");
  if (!token) {
    throw new Error("Fireworks is not configured (missing FIREWORKS_API_KEY).");
  }

  const model = envFirst("FIREWORKS_IMAGE_MODEL", "FIREWORKS_MODEL") || "flux-1-schnell-fp8";
  const endpoint = envFirst("FIREWORKS_IMAGE_ENDPOINT")
    || `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${encodeURIComponent(model)}/text_to_image`;
  const resultEndpoint = envFirst("FIREWORKS_RESULT_ENDPOINT")
    || `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${encodeURIComponent(model)}/get_result`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/*, application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fireworks image generation failed (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const dataUri = await imageResponseToDataUri(res);
    return { dataUri, sourceUrl: redactSensitiveUrl(endpoint) };
  }

  const data = await res.json() as Record<string, unknown>;
  let dataUri = await pickImageDataUri((data as { result?: unknown }).result ?? data);
  if (dataUri) {
    return { dataUri, sourceUrl: redactSensitiveUrl(endpoint) };
  }

  const requestId = typeof data.id === "string" ? data.id : "";
  if (!requestId) {
    throw new Error("Fireworks returned no image and no task id.");
  }

  for (let attempt = 1; attempt <= 8; attempt++) {
    const pollRes = await fetch(resultEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ id: requestId }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      throw new Error(`Fireworks result polling failed (${pollRes.status}): ${err}`);
    }

    const pollData = await pollRes.json() as Record<string, unknown>;
    dataUri = await pickImageDataUri((pollData as { result?: unknown }).result ?? pollData);
    if (dataUri) {
      return { dataUri, sourceUrl: redactSensitiveUrl(endpoint) };
    }

    const status = JSON.stringify((pollData as { status?: unknown }).status ?? "").toLowerCase();
    if (status.includes("error") || status.includes("moderated")) {
      throw new Error(`Fireworks task ended without image. Status: ${status || "unknown"}`);
    }

    await delay(1200 + attempt * 350);
  }

  throw new Error("Fireworks timed out before image became ready.");
}

async function generateWithOpenRouter(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY");
  if (!token) {
    throw new Error("OpenRouter is not configured (missing OPENROUTER_API_KEY).");
  }

  const model = envFirst("OPENROUTER_IMAGE_MODEL", "OPENROUTER_MODEL") || "google/gemini-2.5-flash-image-preview";
  const endpoint = envFirst("OPENROUTER_IMAGE_ENDPOINT", "OPENROUTER_API_URL") || "https://openrouter.ai/api/v1/chat/completions";
  const referer = envFirst("OPENROUTER_SITE_URL", "OPENROUTER_HTTP_REFERER");
  const appName = envFirst("OPENROUTER_APP_NAME", "OPENROUTER_X_TITLE") || "Neural Muse Maker";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Title": appName,
  };
  if (referer) headers["HTTP-Referer"] = referer;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      stream: false,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const candidate = pickOpenRouterImageCandidate(data) ?? data;
  const dataUri = await pickImageDataUri(candidate);
  if (!dataUri) {
    throw new Error("OpenRouter returned no image data.");
  }

  return { dataUri, sourceUrl: endpoint };
}

async function generateWithHuggingFace(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = (
    Deno.env.get("HF_API_TOKEN") ||
    Deno.env.get("HF_TOKEN") ||
    Deno.env.get("HUGGINGFACE_KEY") ||
    ""
  ).trim();
  const model = Deno.env.get("HF_IMAGE_MODEL") || "black-forest-labs/FLUX.1-schnell";
  if (!token) {
    throw new Error("Hugging Face is not configured (missing HF_API_TOKEN).");
  }

  const endpoint = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      inputs: prompt,
      options: { wait_for_model: true, use_cache: false },
      parameters: {
        negative_prompt: NEGATIVE_PROMPT,
      },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hugging Face inference failed (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const dataUri = await imageResponseToDataUri(res);
    return { dataUri, sourceUrl: endpoint };
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri(data);
  if (!dataUri) {
    throw new Error("Hugging Face inference returned no image data.");
  }

  return { dataUri, sourceUrl: endpoint };
}

async function generateWithTogether(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("TOGETHER_API_KEY", "TOGETHER_KEY");
  if (!token) {
    throw new Error("Together AI is not configured (missing TOGETHER_API_KEY).");
  }

  const model = envFirst("TOGETHER_IMAGE_MODEL", "TOGETHER_MODEL") || "black-forest-labs/FLUX.1-schnell";
  const endpoint = envFirst("TOGETHER_IMAGE_ENDPOINT", "TOGETHER_API_URL") || "https://api.together.xyz/v1/images/generations";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      width: 1024,
      height: 1024,
      n: 1,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Together image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri((data as { data?: unknown }).data ?? data);
  if (!dataUri) {
    throw new Error("Together image generation returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

async function generateWithGeminiImagen(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY");
  if (!token) {
    throw new Error("Gemini/Imagen is not configured (missing GEMINI_API_KEY or GOOGLE_API_KEY).");
  }

  const model = envFirst("GEMINI_IMAGE_MODEL", "GOOGLE_IMAGE_MODEL") || "imagen-4.0-generate-001";
  const endpointTemplate = envFirst("GEMINI_IMAGE_ENDPOINT", "GOOGLE_IMAGE_ENDPOINT");
  const endpoint = endpointTemplate
    ? endpointTemplate
        .replaceAll("{model}", encodeURIComponent(model))
        .replaceAll("{key}", encodeURIComponent(token))
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": token,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        negativePrompt: NEGATIVE_PROMPT,
      },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini/Imagen generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const dataUri = await pickImageDataUri((data as { artifacts?: unknown }).artifacts ?? (data as { predictions?: unknown }).predictions ?? data);
  if (!dataUri) {
    throw new Error("Gemini/Imagen generation returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

function extractReplicatePollUrl(prediction: Record<string, unknown>): string | null {
  const urls = prediction.urls;
  if (urls && typeof urls === "object") {
    const getUrl = (urls as Record<string, unknown>).get;
    if (typeof getUrl === "string" && getUrl.trim()) return getUrl;
  }
  const id = prediction.id;
  if (typeof id === "string" && id.trim()) {
    return `https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`;
  }
  return null;
}

async function generateWithReplicate(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("REPLICATE_API_TOKEN", "REPLICATE_TOKEN");
  if (!token) {
    throw new Error("Replicate is not configured (missing REPLICATE_API_TOKEN).");
  }

  const model = envFirst("REPLICATE_MODEL", "REPLICATE_IMAGE_MODEL") || "black-forest-labs/flux-schnell";
  const modelVersion = envFirst("REPLICATE_MODEL_VERSION");
  const endpoint = modelVersion
    ? "https://api.replicate.com/v1/predictions"
    : (() => {
        const [owner, name] = model.split("/");
        if (!owner || !name) throw new Error(`Replicate model must be 'owner/name'. Received: "${model}"`);
        return `https://api.replicate.com/v1/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/predictions`;
      })();

  const payload = modelVersion
    ? {
        version: modelVersion,
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          aspect_ratio: "1:1",
          num_outputs: 1,
          output_format: "png",
        },
      }
    : {
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          aspect_ratio: "1:1",
          num_outputs: 1,
          output_format: "png",
        },
      };

  const createRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "wait=15",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate prediction start failed (${createRes.status}): ${err}`);
  }

  let prediction = await createRes.json() as Record<string, unknown>;
  let status = String(prediction.status || "");
  let pollUrl = extractReplicatePollUrl(prediction);

  for (let i = 0; i < 35; i++) {
    if (status === "succeeded") {
      const dataUri = await pickImageDataUri(prediction.output ?? prediction);
      if (!dataUri) {
        throw new Error("Replicate succeeded but returned no image data.");
      }
      return { dataUri, sourceUrl: pollUrl || endpoint };
    }
    if (status === "failed" || status === "canceled") {
      const detail = typeof prediction.error === "string" ? prediction.error : JSON.stringify(prediction.error || prediction);
      throw new Error(`Replicate prediction ${status}: ${detail}`);
    }
    if (!pollUrl) {
      throw new Error("Replicate did not provide a poll URL.");
    }

    await delay(1300);
    const pollRes = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!pollRes.ok) {
      const err = await pollRes.text();
      throw new Error(`Replicate prediction poll failed (${pollRes.status}): ${err}`);
    }
    prediction = await pollRes.json() as Record<string, unknown>;
    status = String(prediction.status || "");
    pollUrl = extractReplicatePollUrl(prediction) || pollUrl;
  }

  throw new Error("Replicate prediction timed out before completion.");
}

async function pollFalStatus(statusUrl: string, token: string): Promise<Record<string, unknown>> {
  const maxAttempts = 35;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Key ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`fal.ai status poll failed (${res.status}): ${err}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const status = String(data.status || "").toLowerCase();
    if (status === "completed" || status === "succeeded") return data;
    if (status === "failed" || status === "error") {
      throw new Error(`fal.ai request failed: ${JSON.stringify(data.error || data)}`);
    }
    await delay(1200);
  }
  throw new Error("fal.ai generation timed out before completion.");
}

async function generateWithFal(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("FAL_API_KEY", "FAL_KEY");
  if (!token) {
    throw new Error("fal.ai is not configured (missing FAL_API_KEY).");
  }

  const model = envFirst("FAL_IMAGE_MODEL", "FAL_MODEL") || "fal-ai/flux/schnell";
  const endpoint = envFirst("FAL_IMAGE_ENDPOINT") || `https://fal.run/${model}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "square_hd",
      num_images: 1,
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fal.ai generation failed (${res.status}): ${err}`);
  }

  let data = await res.json() as Record<string, unknown>;
  if (!await pickImageDataUri(data)) {
    const statusUrl = typeof data.status_url === "string"
      ? data.status_url
      : (typeof data.response_url === "string" ? data.response_url : null);
    if (statusUrl) {
      data = await pollFalStatus(statusUrl, token);
    }
  }

  const dataUri = await pickImageDataUri((data as { images?: unknown; data?: unknown }).images ?? data.data ?? data);
  if (!dataUri) {
    throw new Error("fal.ai returned no image data.");
  }
  return { dataUri, sourceUrl: endpoint };
}

async function generateWithLovableAI(prompt: string): Promise<{ dataUri: string; sourceUrl: string }> {
  const token = envFirst("LOVABLE_API_KEY");
  if (!token) {
    throw new Error("Lovable AI is not configured (missing LOVABLE_API_KEY).");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (response.status === 429) {
    throw new Error("Lovable AI rate limited (429)");
  }
  if (response.status === 402) {
    throw new Error("Lovable AI credits exhausted (402)");
  }
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lovable AI generation failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Lovable AI returned no image data.");
  }

  return { dataUri: imageUrl, sourceUrl: "https://ai.gateway.lovable.dev" };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = (await req.json()) as Partial<LogoRequest>;
    const body = normalizeRequest(rawBody);
    if (!body.businessName?.trim()) {
      return new Response(JSON.stringify({ error: "businessName is required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (!body.style) {
      return new Response(JSON.stringify({ error: "style is required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const baseGenerationPrompt = buildLogoPrompt(body);
    const enhancedPrompt = await maybeEnhancePromptWithCohere(baseGenerationPrompt, body);
    const generationPrompt = enhancedPrompt.prompt;
    const seed = typeof body.variationSeed === "number" ? Math.abs(body.variationSeed) : Math.floor(Math.random() * 1_000_000_000);

    console.log(`[generate-logo] Style: ${body.style}, Business: "${body.businessName}"`);
    console.log("[generate-logo] Prompt prepared.");
    if (enhancedPrompt.enhancer) {
      console.log(`[generate-logo] Prompt enhancer active: ${enhancedPrompt.enhancer}`);
    }

    let imageUrl = "";
    let provider = "";
    let sourceImageUrl = "";
    let warning: string | undefined;
    const providerErrors: string[] = [];

    const allProviders: ProviderAttempt[] = [
      {
        key: "openai",
        name: "openai/gpt-image-1+composed",
        run: () => generateWithOpenAI(generationPrompt),
        maxAttempts: 3,
      },
      {
        key: "picsart",
        name: "picsart/logo-generator+composed",
        run: () => generateWithPicsart(generationPrompt, body),
        maxAttempts: 2,
      },
      {
        key: "stability",
        name: "stability/sdxl+composed",
        run: () => generateWithStability(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "xai",
        name: "xai/grok-image+composed",
        run: () => generateWithXAI(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "ideogram",
        name: "ideogram/v3+composed",
        run: () => generateWithIdeogram(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "huggingface",
        name: "huggingface/inference+composed",
        run: () => generateWithHuggingFace(generationPrompt),
        maxAttempts: 3,
      },
      {
        key: "cloudflare",
        name: "cloudflare/workers-ai+composed",
        run: () => generateWithCloudflareWorkersAI(generationPrompt),
        maxAttempts: 3,
      },
      {
        key: "fireworks",
        name: "fireworks/flux+composed",
        run: () => generateWithFireworks(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "openrouter",
        name: "openrouter/image+composed",
        run: () => generateWithOpenRouter(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "together",
        name: "together/images+composed",
        run: () => generateWithTogether(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "gemini",
        name: "gemini/imagen+composed",
        run: () => generateWithGeminiImagen(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "replicate",
        name: "replicate/flux+composed",
        run: () => generateWithReplicate(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "fal",
        name: "fal/flux+composed",
        run: () => generateWithFal(generationPrompt),
        maxAttempts: 2,
      },
      {
        key: "pollinations",
        name: "pollinations/free+composed",
        run: () => generateWithPollinationsFree(generationPrompt, seed),
        maxAttempts: 1,
      },
    ];

    const orderedProviderKeys = resolveProviderOrder();
    const providerChain = rotateProviderOrder(orderedProviderKeys, 0)
      .map((key) => allProviders.find((provider) => provider.key === key))
      .filter((provider): provider is ProviderAttempt => Boolean(provider));

    console.log(`[generate-logo] Provider mode: ${LOGO_PROVIDER_MODE}; chain: ${providerChain.map((provider) => provider.name).join(" -> ")}`);

    for (const providerAttempt of providerChain) {
      if (imageUrl) break;
      try {
        const generated = await runWithRetries(
          providerAttempt.name,
          providerAttempt.run,
          providerAttempt.maxAttempts,
        );
        // Compose provider mascot icon into a premium, readable brand layout.
        imageUrl = generated.dataUri;
        provider = providerAttempt.name;
        sourceImageUrl = generated.sourceUrl;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        providerErrors.push(`${providerAttempt.name}: ${msg}`);
      }
    }

    if (!imageUrl) {
      const combined = providerErrors.join(" | ");
      console.warn(`[generate-logo] All image providers failed: ${combined}`);
      imageUrl = composeLogoFromIcon(buildEmergencyLogoFallback(body, seed), body, seed);
      provider = "local/emergency-fallback";
      sourceImageUrl = "local://emergency-fallback";
      warning = "Premium providers were unavailable, so a polished local fallback was used.";
    }

    const styleModeNote = `Style-aware mode active (${body.style}).`;
    warning = warning ? `${warning} ${styleModeNote}` : styleModeNote;

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        sourceImageUrl: sourceImageUrl || null,
        provider,
        prompt: generationPrompt,
        metadata: {
          businessName: body.businessName,
          style: body.style,
          industry: body.industry,
          buildVersion: BUILD_VERSION,
          providerMode: LOGO_PROVIDER_MODE,
          providerOverride: undefined,
          composeMode: "provider-direct",
          promptEnhancer: enhancedPrompt.enhancer || undefined,
          warning,
          providerErrors: providerErrors.length ? providerErrors : undefined,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-logo] Unhandled error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
