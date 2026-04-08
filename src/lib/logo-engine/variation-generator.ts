import type { LogoInput, LogoConfig, GeneratedLogo, LogoStyle } from "./types";
import { pickIcon } from "./icon-library";
import { derivePalette, shiftPalette } from "./color-engine";
import { getFontForStyle, loadFont, fontFamilyCSS } from "./font-library";
import { getLayout } from "./layout-engine";

// ─── Seeded PRNG ─────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ─── SVG Escaping ────────────────────────────────────────────
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Get initials ────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

// ─── Build SVG string for a logo config ──────────────────────
function renderSVG(config: LogoConfig): string {
  const { layout, palette, font, icon, input } = config;
  const { width, height } = layout;
  const name = escapeXml(input.businessName);
  const tagline = input.tagline ? escapeXml(input.tagline) : "";
  const initials = escapeXml(getInitials(input.businessName));
  const fontFamily = fontFamilyCSS(font);

  // Build icon paths SVG
  const iconPaths = icon.paths.map(d =>
    `<path d="${d}" fill="none" stroke="url(#primary-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#drop-shadow)"/>`
  ).join("\n      ");

  const solidPaths = icon.paths.map(d =>
    `<path d="${d}" fill="url(#primary-grad)" stroke="none" filter="url(#drop-shadow)"/>`
  ).join("\n      ");

  // Premium Definitions
  const defs = `
  <defs>
    <!-- Primary Gradient -->
    <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.secondary}"/>
    </linearGradient>

    <!-- Base Background -->
    <linearGradient id="base-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.background}"/>
      <stop offset="100%" stop-color="${palette.background}" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Ambient Accents -->
    <radialGradient id="ambient-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${palette.background}" stop-opacity="0"/>
    </radialGradient>

    <!-- Shadows -->
    <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="${palette.text}" flood-opacity="0.15"/>
    </filter>
    
    <filter id="text-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.1"/>
    </filter>
  </defs>`;

  let svg = "";

  switch (layout.template) {
    case "icon-above":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="32"/>
  <circle cx="${width/2}" cy="${layout.iconY + layout.iconSize/2}" r="${layout.iconSize * 0.85}" fill="url(#ambient-glow)"/>
  <circle cx="${width/2}" cy="${layout.iconY + layout.iconSize/2}" r="${layout.iconSize * 0.55}" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <circle cx="${width/2}" cy="${layout.iconY + layout.iconSize/2}" r="${layout.iconSize * 0.55}" fill="none" stroke="url(#primary-grad)" stroke-width="1.5" stroke-opacity="0.3"/>
  <g transform="translate(${layout.iconX}, ${layout.iconY}) scale(${layout.iconSize/24})">
    ${iconPaths}
  </g>
  <text x="${layout.textX}" y="${layout.textY}" text-anchor="middle" font-family='${fontFamily}' font-weight="800" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing}" fill="${palette.text}" filter="url(#text-shadow)">${name}</text>
  ${tagline && layout.taglineY ? `<text x="${layout.textX}" y="${layout.taglineY}" text-anchor="middle" font-family='${fontFamily}' font-weight="500" font-size="${layout.taglineSize}" letter-spacing="1" fill="${palette.secondary}" opacity="0.9">${tagline}</text>` : ""}
</svg>`;
      break;

    case "icon-left":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="24"/>
  <rect width="${width}" height="${height}" fill="none" stroke="${palette.primary}" stroke-width="2" stroke-opacity="0.1" rx="24"/>
  <rect x="${layout.iconX}" y="${layout.iconY}" width="${layout.iconSize}" height="${layout.iconSize}" rx="${layout.iconSize * 0.25}" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <rect x="${layout.iconX}" y="${layout.iconY}" width="${layout.iconSize}" height="${layout.iconSize}" rx="${layout.iconSize * 0.25}" fill="${palette.accent}" opacity="0.15"/>
  <g transform="translate(${layout.iconX + layout.iconSize * 0.15}, ${layout.iconY + layout.iconSize * 0.15}) scale(${layout.iconSize * 0.7/24})">
    ${solidPaths}
  </g>
  <text x="${layout.textX}" y="${layout.textY}" font-family='${fontFamily}' font-weight="800" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing}" fill="${palette.text}" filter="url(#text-shadow)">${name}</text>
  ${tagline && layout.taglineY ? `<text x="${layout.textX}" y="${layout.taglineY}" font-family='${fontFamily}' font-weight="500" font-size="${layout.taglineSize}" letter-spacing="0.5" fill="${palette.secondary}" opacity="0.9">${tagline}</text>` : ""}
</svg>`;
      break;

    case "stacked":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="32"/>
  <rect x="40" y="40" width="${width-80}" height="${height-80}" rx="24" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <rect x="40" y="40" width="${width-80}" height="${height-80}" rx="24" fill="none" stroke="url(#primary-grad)" stroke-width="2" stroke-opacity="0.2"/>
  <g transform="translate(${layout.iconX}, ${layout.iconY}) scale(${layout.iconSize/24})">
    ${iconPaths}
  </g>
  <text x="${layout.textX}" y="${layout.textY}" text-anchor="middle" font-family='${fontFamily}' font-weight="900" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing}" fill="${palette.text}" filter="url(#text-shadow)">${name}</text>
  ${tagline && layout.taglineY ? `<text x="${layout.textX}" y="${layout.taglineY}" text-anchor="middle" font-family='${fontFamily}' font-weight="500" font-size="${layout.taglineSize}" letter-spacing="2" fill="${palette.secondary}" opacity="0.8">${tagline}</text>` : ""}
  <line x1="${width/2 - 60}" y1="${(layout.taglineY || layout.textY) + 25}" x2="${width/2 + 60}" y2="${(layout.taglineY || layout.textY) + 25}" stroke="url(#primary-grad)" stroke-width="3" stroke-linecap="round" filter="url(#drop-shadow)"/>
</svg>`;
      break;

    case "emblem-ring":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="32"/>
  <circle cx="${width/2}" cy="${height/2 - 30}" r="200" fill="url(#ambient-glow)"/>
  <circle cx="${width/2}" cy="${height/2 - 30}" r="180" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <circle cx="${width/2}" cy="${height/2 - 30}" r="165" fill="none" stroke="${palette.primary}" stroke-width="2" opacity="0.3"/>
  <circle cx="${width/2}" cy="${height/2 - 30}" r="150" fill="none" stroke="url(#primary-grad)" stroke-width="4" stroke-dasharray="8 6"/>
  <g transform="translate(${layout.iconX}, ${layout.iconY}) scale(${layout.iconSize/24})">
    ${iconPaths}
  </g>
  <text x="${layout.textX}" y="${layout.textY}" text-anchor="middle" font-family='${fontFamily}' font-weight="800" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing * 2}" fill="${palette.text}" text-transform="uppercase" filter="url(#text-shadow)">${name}</text>
  ${tagline && layout.taglineY ? `<text x="${layout.textX}" y="${layout.taglineY}" text-anchor="middle" font-family='${fontFamily}' font-weight="600" font-size="${layout.taglineSize}" letter-spacing="4" fill="${palette.secondary}" opacity="0.9">${tagline}</text>` : ""}
</svg>`;
      break;

    case "lettermark-only":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="32"/>
  <rect x="56" y="56" width="${width-112}" height="${height-112}" rx="40" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <rect x="56" y="56" width="${width-112}" height="${height-112}" rx="40" fill="url(#ambient-glow)"/>
  <rect x="56" y="56" width="${width-112}" height="${height-112}" rx="40" fill="none" stroke="url(#primary-grad)" stroke-width="3" stroke-opacity="0.3"/>
  <text x="${layout.textX}" y="${layout.textY}" text-anchor="middle" dominant-baseline="central" font-family='${fontFamily}' font-weight="900" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing * 2}" fill="url(#primary-grad)" filter="url(#drop-shadow)">${initials}</text>
  <line x1="${width/2 - 80}" y1="${layout.textY + 90}" x2="${width/2 + 80}" y2="${layout.textY + 90}" stroke="url(#primary-grad)" stroke-width="4" stroke-linecap="round" filter="url(#drop-shadow)"/>
  ${tagline && layout.taglineY ? `<text x="${layout.textX}" y="${layout.taglineY}" text-anchor="middle" font-family='${fontFamily}' font-weight="600" font-size="${layout.taglineSize}" fill="${palette.text}" filter="url(#text-shadow)">${name}</text>` : `<text x="${layout.textX}" y="${layout.taglineY || 410}" text-anchor="middle" font-family='${fontFamily}' font-weight="600" font-size="22" fill="${palette.text}" filter="url(#text-shadow)">${name}</text>`}
</svg>`;
      break;

    case "brandcrowd-modern":
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  <g transform="translate(${layout.iconX}, ${layout.iconY}) scale(${layout.iconSize/24})">
    ${iconPaths}
  </g>
  <text x="${layout.textX}" y="${layout.textY}" text-anchor="middle" font-family='${fontFamily}' font-weight="900" font-size="${layout.textSize}" letter-spacing="${font.letterSpacing + 2}" fill="url(#primary-grad)" filter="url(#text-shadow)">${name.toUpperCase()}</text>
  ${tagline || "SINCE 2026" ? `<text x="${layout.textX}" y="${layout.taglineY}" text-anchor="middle" font-family='${fontFamily}' font-weight="500" font-size="${layout.taglineSize}" letter-spacing="14" fill="${palette.secondary}" opacity="0.65" text-transform="uppercase">${((tagline || "SINCE 2026").toUpperCase())}</text>` : ""}
</svg>`;
      break;

    case "icon-only":
    default:
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs}
  <rect width="${width}" height="${height}" fill="url(#base-bg)" rx="32"/>
  <circle cx="${width/2}" cy="${height/2}" r="220" fill="url(#ambient-glow)"/>
  <circle cx="${width/2}" cy="${height/2}" r="170" fill="${palette.background}" filter="url(#drop-shadow)"/>
  <circle cx="${width/2}" cy="${height/2}" r="170" fill="none" stroke="url(#primary-grad)" stroke-width="3" stroke-opacity="0.4"/>
  <g transform="translate(${layout.iconX}, ${layout.iconY}) scale(${layout.iconSize/24})">
    ${iconPaths}
  </g>
</svg>`;
      break;
  }

  return svg;
}

// ─── Main: Generate Variations ───────────────────────────────
export async function generateVariations(
  input: LogoInput,
  count: number = 6
): Promise<GeneratedLogo[]> {
  const baseSeed = hashString([
    input.businessName,
    input.industry,
    input.style,
    input.tagline || "",
    input.iconIdea || "",
    input.description || "",
  ].join("|"));
  const rng = mulberry32(baseSeed);
  
  const results: GeneratedLogo[] = [];
  const style: LogoStyle = input.style || "minimalist";
  
  // Derive base palette
  const basePalette = derivePalette(input.colors, baseSeed);
  
  for (let i = 0; i < count; i++) {
    const variationSeed = Math.floor(rng() * 2147483647);
    
    // Pick icon (different for each variation)
    const icon = pickIcon(input.industry, variationSeed + i * 7);
    
    // Pick font (can vary per variation)
    const font = getFontForStyle(style, variationSeed + i * 3);
    
    // Load the font
    await loadFont(font);
    
    // Get layout (varies by style + seed)
    const layout = getLayout(style, variationSeed + i * 5);
    
    // Shift palette slightly for each variation
    const hueShift = (i * 25) % 60 - 10; // -10 to +50 degrees
    const palette = i === 0 ? basePalette : shiftPalette(basePalette, hueShift);
    
    const config: LogoConfig = {
      input,
      layout,
      palette,
      font,
      icon,
      seed: variationSeed,
    };
    
    const svgString = renderSVG(config);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    
    results.push({ config, svgString, dataUrl });
  }
  
  return results;
}

/**
 * Export a logo as PNG data URL via offscreen canvas
 */
export async function exportToPNG(svgDataUrl: string, size: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("SVG image load failed"));
    img.src = svgDataUrl;
  });
}
