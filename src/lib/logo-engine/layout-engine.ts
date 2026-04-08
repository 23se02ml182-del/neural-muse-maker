import type { LayoutSpec, LayoutTemplate, LogoStyle } from "./types";

// ─── Layout Templates ────────────────────────────────────────
const LAYOUTS: Record<LayoutTemplate, LayoutSpec> = {
  "icon-above": {
    template: "icon-above",
    width: 512, height: 512,
    iconX: 164, iconY: 34,
    iconSize: 188,
    textX: 256, textY: 310,
    textSize: 50,
    taglineY: 355,
    taglineSize: 17,
  },
  "icon-left": {
    template: "icon-left",
    width: 512, height: 256,
    iconX: 28, iconY: 36,
    iconSize: 182,
    textX: 226, textY: 136,
    textSize: 50,
    taglineY: 174,
    taglineSize: 16,
  },
  "stacked": {
    template: "stacked",
    width: 512, height: 512,
    iconX: 122, iconY: 44,
    iconSize: 270,
    textX: 256, textY: 380,
    textSize: 58,
    taglineY: 425,
    taglineSize: 17,
  },
  "emblem-ring": {
    template: "emblem-ring",
    width: 512, height: 512,
    iconX: 164, iconY: 126,
    iconSize: 190,
    textX: 256, textY: 440,
    textSize: 34,
    taglineY: 468,
    taglineSize: 14,
  },
  "lettermark-only": {
    template: "lettermark-only",
    width: 512, height: 512,
    iconX: 80, iconY: 80,
    iconSize: 352,
    textX: 256, textY: 300,
    textSize: 176,
    taglineY: 410,
    taglineSize: 19,
  },
  "icon-only": {
    template: "icon-only",
    width: 512, height: 512,
    iconX: 40, iconY: 40,
    iconSize: 432,
    textX: 256, textY: 480,
    textSize: 0,
  },
  "brandcrowd-modern": {
    template: "brandcrowd-modern",
    width: 512, height: 512,
    iconX: 136, iconY: 28,
    iconSize: 240,
    textX: 256, textY: 340,
    textSize: 44,
    taglineY: 388,
    taglineSize: 18,
  },
};

// ─── Style → preferred layouts ───────────────────────────────
const STYLE_LAYOUT_PREFERENCES: Record<LogoStyle, LayoutTemplate[]> = {
  mascot:     ["stacked", "icon-above", "icon-left"],
  minimalist: ["brandcrowd-modern", "icon-above", "stacked", "icon-left"],
  wordmark:   ["icon-left", "brandcrowd-modern", "stacked"],
  lettermark: ["lettermark-only", "emblem-ring", "icon-only"],
  emblem:     ["emblem-ring", "brandcrowd-modern"],
  abstract:   ["brandcrowd-modern", "icon-above", "stacked"],
  vintage:    ["emblem-ring", "icon-above"],
  geometric:  ["brandcrowd-modern", "icon-above", "stacked"],
  "3d":       ["brandcrowd-modern", "stacked", "icon-above"],
  handdrawn:  ["stacked", "icon-above", "icon-left"],
};

/**
 * Pick a layout for a given style and variation seed
 */
export function getLayout(style: LogoStyle, seed: number): LayoutSpec {
  const prefs = STYLE_LAYOUT_PREFERENCES[style] || ["icon-above", "stacked", "icon-left"];
  const template = prefs[Math.abs(seed) % prefs.length];
  return { ...LAYOUTS[template] };
}

/**
 * Get all available layouts
 */
export function getAllLayouts(): LayoutSpec[] {
  return Object.values(LAYOUTS);
}
