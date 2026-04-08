// ─── Logo Engine Types ───────────────────────────────────────

export type LogoStyle =
  | "mascot" | "minimalist" | "wordmark" | "lettermark"
  | "emblem" | "abstract"  | "vintage"  | "geometric"
  | "3d"     | "handdrawn";

export type LayoutTemplate =
  | "icon-above"   // icon on top, text below
  | "icon-left"    // icon left, text right
  | "stacked"      // text over icon background
  | "emblem-ring"  // circular emblem with icon center
  | "lettermark-only" // just the initials
  | "icon-only"    // just the icon, no text
  | "brandcrowd-modern"; // Large centered complex icon, with elegant split-text and completely uppercase spaced tagline

export interface LogoInput {
  businessName: string;
  tagline?: string;
  industry: string;
  style: LogoStyle;
  colors?: string[];
  iconIdea?: string;
  description?: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface FontSpec {
  family: string;
  weight: number;
  letterSpacing: number;   // in px
  googleFontUrl: string;
}

export interface IconSpec {
  viewBox: string;
  paths: string[];     // SVG path d attributes
  fillRule?: "evenodd" | "nonzero";
}

export interface LayoutSpec {
  template: LayoutTemplate;
  width: number;
  height: number;
  iconX: number;
  iconY: number;
  iconSize: number;
  textX: number;
  textY: number;
  textSize: number;
  taglineY?: number;
  taglineSize?: number;
}

export interface LogoConfig {
  input: LogoInput;
  layout: LayoutSpec;
  palette: ColorPalette;
  font: FontSpec;
  icon: IconSpec;
  seed: number;
}

export interface GeneratedLogo {
  config: LogoConfig;
  svgString: string;
  dataUrl: string;     // data:image/svg+xml;...
}
