import type { ColorPalette } from "./types";

// ─── Curated Palettes ────────────────────────────────────────
const CURATED_PALETTES: ColorPalette[] = [
  { primary: "#00f0ff", secondary: "#8a2be2", accent: "#ff00ff", background: "#050510", text: "#ffffff" }, // Midnight Node (Cyan/Purple)
  { primary: "#ff3366", secondary: "#ff9933", accent: "#ffcc00", background: "#050200", text: "#ffffff" }, // Solar Flare (Neon Orange/Pink)
  { primary: "#00ff88", secondary: "#00b8ff", accent: "#00ffcc", background: "#031008", text: "#ffffff" }, // Cyber Matrix (Green/Teal)
  { primary: "#7df9ff", secondary: "#39ff14", accent: "#ffff00", background: "#000814", text: "#ffffff" }, // Deep Web (Electric Blue/Green)
  { primary: "#ff0055", secondary: "#7000ff", accent: "#b000ff", background: "#0a0014", text: "#ffffff" }, // Synthwave (Magenta/Deep Purple)
  { primary: "#ffd700", secondary: "#ff8c00", accent: "#ff4500", background: "#0a0500", text: "#ffffff" }, // Gold Rush (Gold/Orange)
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
