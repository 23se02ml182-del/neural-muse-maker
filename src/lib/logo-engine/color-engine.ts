import type { ColorPalette } from "./types";

// ─── Curated Palettes ────────────────────────────────────────
const CURATED_PALETTES: ColorPalette[] = [
  { primary: "#111111", secondary: "#d4af37", accent: "#f5e6b3", background: "#fffdf8", text: "#1f1a14" },
  { primary: "#0f172a", secondary: "#c0a36a", accent: "#efe3c8", background: "#f8f5ef", text: "#f8f3e8" },
  { primary: "#1c1917", secondary: "#8c6b3f", accent: "#e8d5bb", background: "#f7f1e6", text: "#2d2118" },
  { primary: "#2a2115", secondary: "#b58a3d", accent: "#efe0bf", background: "#fffaf0", text: "#2a2115" },
  { primary: "#111827", secondary: "#d4b06a", accent: "#fbf1d3", background: "#f3efe6", text: "#faf6ee" },
  { primary: "#231815", secondary: "#a67c52", accent: "#ead8c0", background: "#fbf7f1", text: "#2b221a" },
  { primary: "#1e1b18", secondary: "#b89b62", accent: "#f3ead1", background: "#f9f6ef", text: "#302621" },
  { primary: "#0f172a", secondary: "#8b7a5a", accent: "#e6dcc7", background: "#f7f4ee", text: "#26211d" },
];

// ─── Hex color parsing ───────────────────────────────────────
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Derive a full palette from user-provided colors + seed.
 * If no colors provided, pick from curated palettes.
 */
export function derivePalette(userColors: string[] | undefined, seed: number): ColorPalette {
  if (!userColors || userColors.length === 0) {
    return CURATED_PALETTES[Math.abs(seed) % CURATED_PALETTES.length];
  }

  // Use first user color as primary
  const primary = userColors[0].startsWith("#") ? userColors[0] : CURATED_PALETTES[0].primary;
  const hsl = hexToHSL(primary);

  // Generate harmonious secondary (analogous +30°)
  const secondary = userColors[1]?.startsWith("#")
    ? userColors[1]
    : hslToHex(hsl.h + 30, Math.min(hsl.s * 0.9, 1), Math.min(hsl.l + 0.1, 0.65));

  // Accent is lighter version
  const accent = userColors[2]?.startsWith("#")
    ? userColors[2]
    : hslToHex(hsl.h, Math.min(hsl.s * 0.6, 1), 0.75);

  // Text is dark version of primary
  const text = hslToHex(hsl.h, Math.min(hsl.s * 0.8, 1), 0.2);

  return { primary, secondary, accent, background: "#ffffff", text };
}

/**
 * Shift a palette's hue by an amount for variation
 */
export function shiftPalette(palette: ColorPalette, hueShift: number): ColorPalette {
  const shift = (hex: string) => {
    if (!hex.startsWith("#") || hex.length < 7) return hex;
    const hsl = hexToHSL(hex);
    return hslToHex(hsl.h + hueShift, hsl.s, hsl.l);
  };
  return {
    primary: shift(palette.primary),
    secondary: shift(palette.secondary),
    accent: shift(palette.accent),
    background: palette.background,
    text: shift(palette.text),
  };
}
