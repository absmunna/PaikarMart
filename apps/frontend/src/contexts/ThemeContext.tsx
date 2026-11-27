import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system' | 'deepDark' | 'nakshiLight' | 'greenField';

export interface ThemePresetMeta {
  id: ThemeMode;
  nameEn: string;
  nameBn: string;
  descEn: string;
  descBn: string;
  isDark: boolean;
  bgHex: string;
  surfaceHex: string;
  accentHex: string;
  textHex: string;
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'light',
    nameEn: 'Clean Light',
    nameBn: 'ক্লিন লাইট',
    descEn: 'Leaf-tinted daylight with market-green accents',
    descBn: 'সবুজ আভা ও বাজারি সবুজ অ্যাকসেন্টের দিনের থিম',
    isDark: false,
    bgHex: '#f2f6f2',
    surfaceHex: '#ffffff',
    accentHex: '#087a55',
    textHex: '#16271e',
  },
  {
    id: 'nakshiLight',
    nameEn: 'Nakshi Light',
    nameBn: 'নকশী লাইট',
    descEn: 'Soft heritage cream with market-green actions',
    descBn: 'হালকা ঐতিহ্যবাহী ক্রিম রঙে বাজারি সবুজের ছোঁয়া',
    isDark: false,
    bgHex: '#fffbeb',
    surfaceHex: '#fef3c7',
    accentHex: '#087a55',
    textHex: '#26392f',
  },
  {
    id: 'greenField',
    nameEn: 'Green Field',
    nameBn: 'সবুজ প্রান্তর',
    descEn: 'Deep field greens with bright leaf accents',
    descBn: 'সবুজ বাংলার গভীর পান্না থিম',
    isDark: true,
    bgHex: '#021a12',
    surfaceHex: '#052e22',
    accentHex: '#54c98b',
    textHex: '#ecfdf5',
  },
  {
    id: 'deepDark',
    nameEn: 'Deep Dark',
    nameBn: 'ডিপ ডার্ক',
    descEn: 'Near-black forest canvas with leaf-green actions',
    descBn: 'গভীর বন-সবুজ পটভূমিতে উজ্জ্বল পাতার অ্যাকসেন্ট',
    isDark: true,
    bgHex: '#050c08',
    surfaceHex: '#0b1610',
    accentHex: '#54c98b',
    textHex: '#f3f7f3',
  },
  {
    id: 'dark',
    nameEn: 'Forest Midnight',
    nameBn: 'সবুজ মধ্যরাত',
    descEn: 'Deep forest surfaces with mint-green accents',
    descBn: 'গভীর সবুজ সারফেস ও মিন্ট সবুজ অ্যাকসেন্ট',
    isDark: true,
    bgHex: '#071811',
    surfaceHex: '#10271e',
    accentHex: '#4dbb80',
    textHex: '#edf5ef',
  },
  {
    id: 'system',
    nameEn: 'System Auto',
    nameBn: 'সিস্টেম অটো',
    descEn: 'Matches device OS light/dark state',
    descBn: 'ডিভাইসের ওএস সেটিং অনুসরণ করবে',
    isDark: false,
    bgHex: '#f2f6f2',
    surfaceHex: '#ffffff',
    accentHex: '#087a55',
    textHex: '#16271e',
  },
];

const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'system', 'deepDark', 'nakshiLight', 'greenField'];

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  accentColor: string;
  presets: ThemePresetMeta[];
  setAccentColor: (color: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'paikarmart_theme_mode';
const ACCENT_STORAGE_KEY = 'paikarmart_accent_color';
const DEFAULT_ACCENT = '#4dbb80';
const LEGACY_PRESET_ACCENTS = ['#2563eb', '#3b82f6', '#ff7a00', '#b45309', '#10b981', '#0ea5e9'];

function getInitialAccentColor(): string {
  try {
    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (storedAccent && !LEGACY_PRESET_ACCENTS.includes(storedAccent.toLowerCase())) {
      return storedAccent;
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const themeMode = storedTheme && VALID_THEMES.includes(storedTheme) ? storedTheme : 'dark';
    const systemIsDark =
      typeof window === 'undefined'
        ? true
        : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    const effectiveTheme = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;

    return THEME_PRESETS.find((preset) => preset.id === effectiveTheme)?.accentHex ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored && VALID_THEMES.includes(stored)) {
        return stored;
      }
    } catch {}
    return 'dark';
  });

  const [accentColor, setAccentColorState] = useState<string>(getInitialAccentColor);

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemIsDark;
    return themeMode === 'dark' || themeMode === 'deepDark' || themeMode === 'greenField';
  }, [themeMode, systemIsDark]);

  const effectiveDataTheme = useMemo(() => {
    if (themeMode === 'system') return systemIsDark ? 'dark' : 'light';
    return themeMode;
  }, [themeMode, systemIsDark]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
      localStorage.setItem(ACCENT_STORAGE_KEY, accentColor);
    } catch {}

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', effectiveDataTheme);

    const activePreset = THEME_PRESETS.find((p) => p.id === effectiveDataTheme);
    const resolvedAccent = accentColor || activePreset?.accentHex || DEFAULT_ACCENT;

    // Compute WCAG-safe foreground for filled accent buttons
    let accentFg = '#ffffff';
    const hex = resolvedAccent.replace('#', '');
    if (hex.length === 6) {
      const toLinear = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const r = toLinear(parseInt(hex.slice(0, 2), 16));
      const g = toLinear(parseInt(hex.slice(2, 4), 16));
      const b = toLinear(parseInt(hex.slice(4, 6), 16));
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > 0.28) {
        accentFg = '#07080b';
      }
    }

    root.style.setProperty('--accent-color', resolvedAccent);
    root.style.setProperty('--pm-accent-fg', accentFg);
  }, [themeMode, isDark, effectiveDataTheme, accentColor]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    const resolvedMode = mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;
    const preset = THEME_PRESETS.find((p) => p.id === resolvedMode);
    if (preset) {
      setAccentColorState(preset.accentHex);
    }
  };

  const setAccentColor = (color: string) => setAccentColorState(color);

  const toggleTheme = () =>
    setThemeModeState((prev) => (prev === 'dark' || prev === 'deepDark' || prev === 'greenField' ? 'light' : 'dark'));

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      accentColor,
      presets: THEME_PRESETS,
      setAccentColor,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, accentColor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
