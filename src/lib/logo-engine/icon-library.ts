import type { IconSpec } from "./types";

// ─── Icon Library ────────────────────────────────────────────
// Each icon is a set of SVG paths that fit within a 0 0 24 24 viewBox.
// Organized by category for industry-based selection.

const ICONS: Record<string, IconSpec[]> = {
  // ─── Premium / Brand ───
  premium: [
    { viewBox: "0 0 24 24", paths: ["M12 3l2.6 5.3L20 9l-4 3.9L17 18l-5-2.7L7 18l1-5.1L4 9l5.4-.7L12 3z"] },
    { viewBox: "0 0 24 24", paths: ["M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z", "M8 10h8M9 14h6"] },
    { viewBox: "0 0 24 24", paths: ["M12 4l3.5 7H19l-3 2.8L17 21l-5-3.2L7 21l1-7.2L5 11h3.5L12 4z"] },
    { viewBox: "0 0 24 24", paths: ["M4 12l4-5h8l4 5-4 5H8l-4-5z", "M9 12h6"] },
    { viewBox: "0 0 24 24", paths: ["M12 3l6 4v5c0 4-2.6 7.2-6 9-3.4-1.8-6-5-6-9V7l6-4z", "M9 11l3-2 3 2M9 15h6"] },
    { viewBox: "0 0 24 24", paths: ["M12 3l4 4 5 1-2.5 4.2.5 5-4.5-1.8L12 18l-2.5-1.6L5 18l.5-5L3 8l5-1 4-4z"] },
  ],

  // ─── Technology ───
  technology: [
    { viewBox: "0 0 24 24", paths: ["M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"] },
    { viewBox: "0 0 24 24", paths: ["M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14v3h3M14 17h3v3"] },
    { viewBox: "0 0 24 24", paths: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-4 8a4 4 0 0 1 8 0"] },
    { viewBox: "0 0 24 24", paths: ["M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"] },
    { viewBox: "0 0 24 24", paths: ["M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"] },
  ],

  // ─── Food & Beverage ───
  food: [
    { viewBox: "0 0 24 24", paths: ["M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"] },
    { viewBox: "0 0 24 24", paths: ["M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 2.69 3 6H9c0-3.31 1.34-6 3-6zm-7 7h14c0 3.87-3.13 7-7 7s-7-3.13-7-7z"] },
    { viewBox: "0 0 24 24", paths: ["M12 6.5a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1.5a2 2 0 0 1-4 0V14c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4zM8 2l1 4M16 2l-1 4M12 22v-4"] },
    { viewBox: "0 0 24 24", paths: ["M3 11h18M5 11V6c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v5M7 11v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7M12 4v7"] },
  ],

  // ─── Health & Fitness ───
  health: [
    { viewBox: "0 0 24 24", paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"] },
    { viewBox: "0 0 24 24", paths: ["M22 12h-4l-3 9L9 3l-3 9H2"] },
    { viewBox: "0 0 24 24", paths: ["M6.5 6.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0zM2 21v-2a7 7 0 0 1 7-7M18 8a3 3 0 1 0 0 6M22 21v-2a4 4 0 0 0-3-3.87"] },
    { viewBox: "0 0 24 24", paths: ["M12 2L4 7v10l8 5 8-5V7l-8-5zM12 22V12M12 12L4 7M12 12l8-5"] },
  ],

  // ─── Fashion ───
  fashion: [
    { viewBox: "0 0 24 24", paths: ["M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6l3-6z"] },
    { viewBox: "0 0 24 24", paths: ["M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"] },
    { viewBox: "0 0 24 24", paths: ["M6 3h12l4 6-10 13L2 9l4-6zM12 22l3-13M12 22L9 9M2 9h20"] },
  ],

  // ─── Finance ───
  finance: [
    { viewBox: "0 0 24 24", paths: ["M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"] },
    { viewBox: "0 0 24 24", paths: ["M3 3v18h18M7 16l4-8 4 5 5-6"] },
    { viewBox: "0 0 24 24", paths: ["M2 12h6l2-7 4 14 2-7h6"] },
  ],

  // ─── Education ───
  education: [
    { viewBox: "0 0 24 24", paths: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"] },
    { viewBox: "0 0 24 24", paths: ["M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 3 9 3 12 0v-5"] },
    { viewBox: "0 0 24 24", paths: ["M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"] },
  ],

  // ─── Nature / Eco ───
  nature: [
    { viewBox: "0 0 24 24", paths: ["M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"] },
    { viewBox: "0 0 24 24", paths: ["M12 22c-4.97 0-9-2.69-9-6v-.5C3 12.46 6.03 10 9.75 10c.83 0 1.62.13 2.36.37A7.5 7.5 0 0 1 19.5 4a.5.5 0 0 1 .5.5 7.5 7.5 0 0 1-6.37 7.39c.24.74.37 1.53.37 2.36 0 3.72-2.46 6.75-5.5 6.75"] },
    { viewBox: "0 0 24 24", paths: ["M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M8 8l4-6 4 6M7 15l5 3 5-3"] },
  ],

  // ─── Travel ───
  travel: [
    { viewBox: "0 0 24 24", paths: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"] },
    { viewBox: "0 0 24 24", paths: ["M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"] },
    { viewBox: "0 0 24 24", paths: ["M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"] },
  ],

  // ─── Abstract / General ───
  abstract: [
    { viewBox: "0 0 24 24", paths: ["M12 2L2 19.5h20L12 2z"] },
    { viewBox: "0 0 24 24", paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"] },
    { viewBox: "0 0 24 24", paths: ["M12 3L3 8v8l9 5 9-5V8l-9-5z"] },
    { viewBox: "0 0 24 24", paths: ["M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"] },
    { viewBox: "0 0 24 24", paths: ["M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10V12H2"] },
    { viewBox: "0 0 24 24", paths: ["M3.5 5.5L5 7l2.5-2.5M3.5 12L5 13.5 7.5 11M3.5 18.5L5 20l2.5-2.5M11 6h9M11 12h9M11 18h9"] },
  ],

  // ─── Gaming ───
  gaming: [
    { viewBox: "0 0 24 24", paths: ["M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.2 12.56 2 16.58 2 17a3 3 0 0 0 6 0c0-1 .6-2 2-2h4c1.4 0 2 1 2 2a3 3 0 0 0 6 0c0-.42-.2-4.44-.7-8.41A4 4 0 0 0 17.32 5z"] },
  ],

  // ─── Real Estate ───
  realestate: [
    { viewBox: "0 0 24 24", paths: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"] },
    { viewBox: "0 0 24 24", paths: ["M1 22h22M2 22V6l10-4 10 4v16M6 10h.01M6 14h.01M6 18h.01M10 10h.01M10 14h.01M10 18h.01M14 10h.01M14 14h.01M14 18h.01M18 10h.01M18 14h.01M18 18h.01"] },
  ],

  // ─── Automotive ───
  automotive: [
    { viewBox: "0 0 24 24", paths: ["M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"] },
  ],

  // ─── Dairy specific ───
  dairy: [
    { viewBox: "0 0 24 24", paths: [
      "M12 4C9 4 7 6 7 9c0 2 1 3.5 2 4.5V18c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4.5c1-1 2-2.5 2-4.5 0-3-2-5-5-5z",
      "M9 3l-1.5-1M15 3l1.5-1",
      "M10 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM14 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
      "M10.5 14.5c.5.5 2.5.5 3 0"
    ]},
    { viewBox: "0 0 24 24", paths: [
      "M8 4h8l2 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8l2-4z",
      "M6 8h12",
      "M9 12c0 1.5 1.5 3 3 3s3-1.5 3-3"
    ]},
  ],
};

// ─── Industry → Category mapping ─────────────────
const INDUSTRY_MAP: Record<string, string> = {
  technology: "technology", tech: "technology", software: "technology", saas: "technology",
  ai: "technology", "artificial intelligence": "technology", digital: "technology",
  food: "food", beverage: "food", restaurant: "food", cafe: "food", bakery: "food",
  "food & beverage": "food", dairy: "dairy", milk: "dairy",
  health: "health", fitness: "health", wellness: "health", medical: "health",
  "health & fitness": "health", healthcare: "health",
  fashion: "fashion", clothing: "fashion", apparel: "fashion", beauty: "fashion",
  jewelry: "fashion", luxury: "fashion",
  finance: "finance", fintech: "finance", banking: "finance", insurance: "finance",
  education: "education", learning: "education", school: "education", academy: "education",
  nature: "nature", eco: "nature", environment: "nature", sustainability: "nature",
  travel: "travel", tourism: "travel", hospitality: "travel", hotel: "travel",
  gaming: "gaming", esports: "gaming", game: "gaming",
  "real estate": "realestate", property: "realestate", construction: "realestate",
  automotive: "automotive", auto: "automotive", car: "automotive",
};

function resolveCategory(industry: string): string {
  const lower = industry.toLowerCase().trim();
  for (const [key, cat] of Object.entries(INDUSTRY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "premium";
}

/**
 * Get icons for a given industry. Falls back to abstract icons.
 */
export function getIconsForIndustry(industry: string): IconSpec[] {
  const fallback = ICONS.premium || [];
  const cat = resolveCategory(industry);
  const primary = ICONS[cat] || [];
  // Prefer premium brand marks only to keep the result polished and consistent.
  return [...fallback, ...primary.slice(0, 2)];
}

/**
 * Pick a specific icon based on industry and seed
 */
export function pickIcon(industry: string, seed: number): IconSpec {
  const icons = getIconsForIndustry(industry);
  const idx = Math.abs(seed) % icons.length;
  return icons[idx];
}
