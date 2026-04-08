import type { FontSpec, LogoStyle } from "./types";

// ─── Font mappings by style ──────────────────────────────────
const STYLE_FONTS: Record<LogoStyle, FontSpec[]> = {
  mascot: [
    { family: "Fredoka One", weight: 400, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" },
    { family: "Boogaloo", weight: 400, letterSpacing: 0.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Boogaloo&display=swap" },
    { family: "Baloo 2", weight: 700, letterSpacing: 0.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&display=swap" },
  ],
  minimalist: [
    { family: "Inter", weight: 600, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap" },
    { family: "Outfit", weight: 500, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@500&display=swap" },
    { family: "DM Sans", weight: 600, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@600&display=swap" },
  ],
  wordmark: [
    { family: "Playfair Display", weight: 700, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" },
    { family: "Cormorant Garamond", weight: 700, letterSpacing: 1.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" },
    { family: "Libre Baskerville", weight: 700, letterSpacing: 0.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&display=swap" },
  ],
  lettermark: [
    { family: "Montserrat", weight: 800, letterSpacing: 4, googleFontUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap" },
    { family: "Oswald", weight: 700, letterSpacing: 6, googleFontUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap" },
    { family: "Bebas Neue", weight: 400, letterSpacing: 6, googleFontUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
  ],
  emblem: [
    { family: "Cinzel", weight: 700, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" },
    { family: "Marcellus", weight: 400, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Marcellus&display=swap" },
    { family: "Philosopher", weight: 700, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=Philosopher:wght@700&display=swap" },
  ],
  abstract: [
    { family: "Poppins", weight: 700, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap" },
    { family: "Raleway", weight: 700, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Raleway:wght@700&display=swap" },
    { family: "Sora", weight: 600, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=Sora:wght@600&display=swap" },
  ],
  vintage: [
    { family: "Playfair Display", weight: 900, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap" },
    { family: "Abril Fatface", weight: 400, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap" },
    { family: "Old Standard TT", weight: 700, letterSpacing: 1.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Old+Standard+TT:wght@700&display=swap" },
  ],
  geometric: [
    { family: "Rajdhani", weight: 700, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&display=swap" },
    { family: "Orbitron", weight: 700, letterSpacing: 2, googleFontUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" },
    { family: "Jost", weight: 600, letterSpacing: 3, googleFontUrl: "https://fonts.googleapis.com/css2?family=Jost:wght@600&display=swap" },
  ],
  "3d": [
    { family: "Righteous", weight: 400, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Righteous&display=swap" },
    { family: "Russo One", weight: 400, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Russo+One&display=swap" },
    { family: "Black Ops One", weight: 400, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap" },
  ],
  handdrawn: [
    { family: "Caveat", weight: 700, letterSpacing: 1, googleFontUrl: "https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" },
    { family: "Indie Flower", weight: 400, letterSpacing: 0.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap" },
    { family: "Kalam", weight: 700, letterSpacing: 0.5, googleFontUrl: "https://fonts.googleapis.com/css2?family=Kalam:wght@700&display=swap" },
  ],
};

// ─── Font loading cache ──────────────────────────────────────
const loadedFonts = new Set<string>();

export async function loadFont(font: FontSpec): Promise<void> {
  if (loadedFonts.has(font.family)) return;
  
  try {
    // Inject stylesheet link
    const linkId = `font-${font.family.replace(/\s+/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = font.googleFontUrl;
      document.head.appendChild(link);
    }
    
    // Wait for font to load (with timeout)
    await Promise.race([
      document.fonts.load(`${font.weight} 48px "${font.family}"`),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
    
    loadedFonts.add(font.family);
  } catch {
    // Font loading failed, will fall back to system fonts
    console.warn(`Font loading failed for ${font.family}, using fallback`);
  }
}

/**
 * Get fonts for a style, pick one based on seed
 */
export function getFontForStyle(style: LogoStyle, seed: number): FontSpec {
  const fonts = STYLE_FONTS[style] || STYLE_FONTS.minimalist;
  return fonts[Math.abs(seed) % fonts.length];
}

/**
 * Get the CSS font-family string with fallbacks
 */
export function fontFamilyCSS(font: FontSpec): string {
  return `"${font.family}", "Inter", "Segoe UI", system-ui, sans-serif`;
}
