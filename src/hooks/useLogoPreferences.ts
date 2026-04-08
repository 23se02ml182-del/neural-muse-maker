import { useEffect, useState } from "react";

export type LogoPreferences = {
  defaultStyle: string;
  defaultPalette: string;
  compactMode: boolean;
  autoSaveDownloads: boolean;
};

const STORAGE_KEY = "neural-muse-logo-preferences";

export const DEFAULT_LOGO_PREFERENCES: LogoPreferences = {
  defaultStyle: "auto",
  defaultPalette: "auto",
  compactMode: false,
  autoSaveDownloads: false,
};

function readPreferences(): LogoPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_LOGO_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOGO_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<LogoPreferences>;

    return {
      defaultStyle: typeof parsed.defaultStyle === "string" && parsed.defaultStyle.trim()
        ? parsed.defaultStyle.trim()
        : DEFAULT_LOGO_PREFERENCES.defaultStyle,
      defaultPalette: typeof parsed.defaultPalette === "string" && parsed.defaultPalette.trim()
        ? parsed.defaultPalette.trim()
        : DEFAULT_LOGO_PREFERENCES.defaultPalette,
      compactMode: Boolean(parsed.compactMode),
      autoSaveDownloads: Boolean(parsed.autoSaveDownloads),
    };
  } catch {
    return DEFAULT_LOGO_PREFERENCES;
  }
}

export function useLogoPreferences() {
  const [preferences, setPreferences] = useState<LogoPreferences>(readPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage failures and keep preferences in memory.
    }
  }, [preferences]);

  const updatePreference = <K extends keyof LogoPreferences>(key: K, value: LogoPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const resetPreferences = () => setPreferences(DEFAULT_LOGO_PREFERENCES);

  return { preferences, updatePreference, resetPreferences, setPreferences };
}
