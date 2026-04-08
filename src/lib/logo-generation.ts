export type GenerateLogoRequest = {
  name: string;
  description?: string;
  style?: string;
  colors?: string;
  industry?: string;
  iconIdea?: string;
};

export interface LocalLogoFallbackInput {
  businessName: string;
  industry: string;
  style?: string;
  colors?: string[] | null;
  mood?: string | null;
  variant?: number;
}

type GenerateLogoResponse = {
  success?: boolean;
  error?: string;
  imageUrl?: string;
  image?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export function buildGenerateLogoPayload(input: GenerateLogoRequest) {
  return {
    // New internal shape
    name: input.name,
    description: input.description ?? "",
    style: input.style ?? "",
    colors: input.colors ?? "",
    industry: input.industry ?? "",
    iconIdea: input.iconIdea ?? "",
    // Backward-compatible shape used by older function versions
    businessName: input.name,
  };
}

export function extractGeneratedImage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const response = data as GenerateLogoResponse;

  if (typeof response.imageUrl === "string" && response.imageUrl.trim()) {
    return response.imageUrl;
  }
  if (typeof response.image === "string" && response.image.trim()) {
    return response.image;
  }

  const first = response.data?.[0];
  if (!first) return null;

  if (typeof first.b64_json === "string" && first.b64_json.trim()) {
    return `data:image/png;base64,${first.b64_json}`;
  }
  if (typeof first.url === "string" && first.url.trim()) {
    return first.url;
  }

  return null;
}

function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

type LocalStyleFamily =
  | "minimalist"
  | "wordmark"
  | "abstract"
  | "emblem"
  | "mascot"
  | "3d"
  | "handdrawn";

function normalizeLocalStyleFamily(style?: string): LocalStyleFamily {
  const raw = (style || "").trim().toLowerCase();
  if (["mascot", "cartoon", "character"].includes(raw)) return "mascot";
  if (["wordmark", "logotype", "lineart"].includes(raw)) return "wordmark";
  if (["lettermark", "monogram"].includes(raw)) return "wordmark";
  if (["abstract", "geometric", "futuristic", "gradient"].includes(raw)) return "abstract";
  if (["emblem", "badge", "vintage", "retro"].includes(raw)) return "emblem";
  if (["3d"].includes(raw)) return "3d";
  if (["handdrawn", "hand-drawn", "watercolor"].includes(raw)) return "handdrawn";
  return "minimalist";
}

export function buildLocalLogoFallback(input: LocalLogoFallbackInput): string {
  const name = input.businessName.trim() || "Brand";
  const industry = input.industry.trim() || "General";
  const family = normalizeLocalStyleFamily(input.style);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LG";

  const palettes = [
    { bg: "#fff8ef", card: "#ffffff", primary: "#e11d48", secondary: "#7f1d1d", accent: "#fda4af" },
    { bg: "#f4fbff", card: "#ffffff", primary: "#2563eb", secondary: "#1e3a8a", accent: "#93c5fd" },
    { bg: "#f3fff7", card: "#ffffff", primary: "#16a34a", secondary: "#14532d", accent: "#86efac" },
    { bg: "#fffaf2", card: "#ffffff", primary: "#ea580c", secondary: "#7c2d12", accent: "#fdba74" },
    { bg: "#f8f5ff", card: "#ffffff", primary: "#7c3aed", secondary: "#581c87", accent: "#d8b4fe" },
    { bg: "#fffdf8", card: "#ffffff", primary: "#0f766e", secondary: "#134e4a", accent: "#99f6e4" },
  ];

  const seed = hashString(`${name}|${industry}|${input.style || ""}|${input.variant ?? 0}`);
  const theme = palettes[seed % palettes.length];
  const color1 = input.colors?.[0] || theme.primary;
  const color2 = input.colors?.[1] || theme.secondary;
  const color3 = input.colors?.[2] || theme.accent;
  const variant = input.variant ?? 0;
  const styleLabel = {
    minimalist: "MINIMALIST",
    wordmark: "WORDMARK",
    abstract: "ABSTRACT",
    emblem: "EMBLEM",
    mascot: "MASCOT",
    "3d": "3D",
    handdrawn: "HANDDRAWN",
  }[family];
  const mood = input.mood?.trim() || "premium, clean, memorable";
  const bgGradient = `
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeSvg(theme.bg)}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>`;
  const badgeGradient = `
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeSvg(color1)}"/>
      <stop offset="100%" stop-color="${escapeSvg(color3)}"/>
    </linearGradient>`;
  const mascotFigure = `
    <g>
      <ellipse cx="512" cy="332" rx="150" ry="170" fill="${escapeSvg(color3)}" opacity="0.18"/>
      <circle cx="512" cy="334" r="122" fill="#ffffff" stroke="rgba(15, 23, 42, 0.09)" stroke-width="8"/>
      <path d="M438 276 C448 236, 476 218, 512 218 C548 218, 576 236, 586 276" fill="${escapeSvg(color1)}"/>
      <path d="M452 272 C472 246, 492 234, 512 234 C532 234, 552 246, 572 272" fill="#ffffff" opacity="0.22"/>
      <circle cx="472" cy="324" r="15" fill="${escapeSvg(color2)}"/>
      <circle cx="552" cy="324" r="15" fill="${escapeSvg(color2)}"/>
      <circle cx="472" cy="318" r="5" fill="#ffffff"/>
      <circle cx="552" cy="318" r="5" fill="#ffffff"/>
      <path d="M488 356 C502 370, 522 370, 536 356" stroke="${escapeSvg(color2)}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M512 386 C494 382, 484 374, 478 364" stroke="${escapeSvg(color2)}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M512 386 C530 382, 540 374, 546 364" stroke="${escapeSvg(color2)}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <rect x="420" y="446" width="184" height="176" rx="56" fill="${escapeSvg(color1)}"/>
      <rect x="432" y="458" width="160" height="150" rx="48" fill="rgba(255,255,255,0.14)"/>
      <path d="M424 484 C394 500, 384 524, 376 550" stroke="${escapeSvg(color2)}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M600 484 C630 500, 640 524, 648 550" stroke="${escapeSvg(color2)}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M452 622 C438 646, 428 674, 424 700" stroke="${escapeSvg(color2)}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M572 622 C586 646, 596 674, 600 700" stroke="${escapeSvg(color2)}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M444 248 L468 210 L492 242 L512 204 L532 242 L556 210 L580 248" fill="${escapeSvg(color2)}"/>
      <circle cx="512" cy="208" r="10" fill="${escapeSvg(color3)}"/>
      <path d="M470 474 H554" stroke="${escapeSvg(color3)}" stroke-width="10" stroke-linecap="round"/>
    </g>`;

  const mascotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <circle cx="512" cy="350" r="232" fill="url(#badge)" opacity="0.12"/>
  <circle cx="512" cy="350" r="188" fill="#ffffff" stroke="rgba(15, 23, 42, 0.06)" stroke-width="2"/>
  ${mascotFigure}
  <rect x="198" y="594" width="628" height="120" rx="60" fill="${escapeSvg(color2)}"/>
  <text x="512" y="671" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800" letter-spacing="0.5" fill="#ffffff">${escapeSvg(name)}</text>
  <text x="512" y="754" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
  <text x="512" y="812" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" letter-spacing="2" fill="${escapeSvg(color2)}" opacity="0.72">${escapeSvg(mood)}</text>
</svg>`.trim();

  const minimalistSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <circle cx="512" cy="344" r="196" fill="url(#badge)"/>
  <circle cx="512" cy="344" r="130" fill="rgba(255,255,255,0.18)"/>
  <text x="512" y="391" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="118" font-weight="800" letter-spacing="2" fill="#ffffff">${escapeSvg(initials)}</text>
  <rect x="236" y="612" width="552" height="5" rx="2.5" fill="${escapeSvg(color1)}"/>
  <text x="512" y="690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="800" letter-spacing="0.4" fill="${escapeSvg(color2)}">${escapeSvg(name)}</text>
  <text x="512" y="756" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
</svg>`.trim();

  const wordmarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <circle cx="176" cy="178" r="74" fill="url(#badge)"/>
  <text x="176" y="195" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800" fill="#ffffff">${escapeSvg(initials)}</text>
  <text x="512" y="448" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" letter-spacing="0.8" fill="${escapeSvg(color2)}">${escapeSvg(name)}</text>
  <line x1="246" y1="520" x2="778" y2="520" stroke="${escapeSvg(color1)}" stroke-width="6" stroke-linecap="round"/>
  <text x="512" y="612" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="5" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
  <text x="512" y="686" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="600" letter-spacing="2" fill="${escapeSvg(color2)}" opacity="0.74">${escapeSvg(mood)}</text>
</svg>`.trim();

  const abstractSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <circle cx="512" cy="348" r="228" fill="rgba(255,255,255,0.92)" stroke="rgba(15,23,42,0.05)" stroke-width="2"/>
  <path d="M512 204 L648 286 L596 438 L428 438 L376 286 Z" fill="${escapeSvg(color1)}" opacity="0.92"/>
  <circle cx="512" cy="344" r="88" fill="#ffffff" opacity="0.82"/>
  <circle cx="512" cy="344" r="38" fill="${escapeSvg(color3)}"/>
  <path d="M286 530 C380 462, 644 462, 738 530" stroke="${escapeSvg(color2)}" stroke-width="18" stroke-linecap="round" fill="none"/>
  <text x="512" y="676" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" letter-spacing="0.8" fill="${escapeSvg(color2)}">${escapeSvg(name)}</text>
  <text x="512" y="744" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
  <text x="512" y="804" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" letter-spacing="2" fill="${escapeSvg(color2)}" opacity="0.72">${escapeSvg(mood)}</text>
</svg>`.trim();

  const emblemSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <circle cx="512" cy="348" r="248" fill="url(#badge)"/>
  <circle cx="512" cy="348" r="198" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.62)" stroke-width="4"/>
  <text x="512" y="376" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="700" fill="#ffffff">${escapeSvg(initials)}</text>
  <path d="M274 548 H750" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
  <text x="512" y="670" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" letter-spacing="0.5" fill="${escapeSvg(color2)}">${escapeSvg(name)}</text>
  <text x="512" y="744" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
  <text x="512" y="804" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" letter-spacing="2" fill="${escapeSvg(color2)}" opacity="0.72">${escapeSvg(mood)}</text>
</svg>`.trim();

  const threeDSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${bgGradient}${badgeGradient}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect x="56" y="56" width="912" height="912" rx="46" fill="${escapeSvg(theme.card)}" stroke="rgba(15, 23, 42, 0.08)" stroke-width="3"/>
  <ellipse cx="512" cy="344" rx="236" ry="198" fill="rgba(15, 23, 42, 0.06)"/>
  <ellipse cx="512" cy="334" rx="214" ry="180" fill="url(#badge)"/>
  <ellipse cx="468" cy="292" rx="78" ry="44" fill="rgba(255,255,255,0.28)"/>
  <circle cx="512" cy="334" r="86" fill="rgba(255,255,255,0.18)"/>
  <text x="512" y="354" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="800" fill="#ffffff">${escapeSvg(initials)}</text>
  <text x="512" y="672" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" letter-spacing="0.6" fill="${escapeSvg(color2)}">${escapeSvg(name)}</text>
  <text x="512" y="742" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${escapeSvg(color1)}">${escapeSvg(styleLabel)} • ${escapeSvg(industry.toUpperCase())}</text>
</svg>`.trim();

  const layouts: Record<LocalStyleFamily, string> = {
    mascot: mascotSvg,
    minimalist: minimalistSvg,
    wordmark: wordmarkSvg,
    abstract: abstractSvg,
    emblem: emblemSvg,
    "3d": threeDSvg,
    handdrawn: abstractSvg,
  };

  return `data:image/svg+xml;utf8,${encodeURIComponent(layouts[family])}`;
}
