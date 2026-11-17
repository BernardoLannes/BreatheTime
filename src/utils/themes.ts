import { ThemeConfig } from '../types/timer';

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    isLight: false,
    bgApp: '#0b1120',
    bgSurface: '#111827',
    bgCard: '#1e293b',
    accentPrimary: '#38bdf8',
    accentGreen: '#10b981',
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    isLight: false,
    bgApp: '#071310',
    bgSurface: '#0d1f1a',
    bgCard: '#142c25',
    accentPrimary: '#34d399',
    accentGreen: '#22c55e',
  },
  {
    id: 'amethyst-dusk',
    name: 'Amethyst Dusk',
    isLight: false,
    bgApp: '#110b1f',
    bgSurface: '#1a122e',
    bgCard: '#261b42',
    accentPrimary: '#a78bfa',
    accentGreen: '#34d399',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    isLight: false,
    bgApp: '#16100c',
    bgSurface: '#211812',
    bgCard: '#30231a',
    accentPrimary: '#f59e0b',
    accentGreen: '#10b981',
  },
  {
    id: 'rose-noir',
    name: 'Rose Noir',
    isLight: false,
    bgApp: '#140b12',
    bgSurface: '#1f111c',
    bgCard: '#2e1929',
    accentPrimary: '#fb7185',
    accentGreen: '#34d399',
  },
  {
    id: 'clean-light',
    name: 'Clean Light',
    isLight: true,
    bgApp: '#f1f5f9',
    bgSurface: '#ffffff',
    bgCard: '#f8fafc',
    accentPrimary: '#0284c7',
    accentGreen: '#059669',
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 56, g: 189, b: 248 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function adjustHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(r + amount);
  const ng = clamp(g + amount);
  const nb = clamp(b + amount);
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function applyThemeToDocument(theme: ThemeConfig): void {
  const root = document.documentElement;
  const isLight = Boolean(theme.isLight);
  const pRgb = hexToRgb(theme.accentPrimary);
  const gRgb = hexToRgb(theme.accentGreen);

  root.dataset.themeMode = isLight ? 'light' : 'dark';

  root.style.setProperty('--bg-app', theme.bgApp);
  root.style.setProperty('--bg-surface', theme.bgSurface);
  root.style.setProperty('--bg-card', theme.bgCard);
  root.style.setProperty(
    '--bg-card-hover',
    adjustHex(theme.bgCard, isLight ? -8 : 10)
  );
  root.style.setProperty(
    '--bg-input',
    isLight ? '#ffffff' : adjustHex(theme.bgApp, 4)
  );
  root.style.setProperty(
    '--bg-titlebar',
    adjustHex(theme.bgApp, isLight ? -10 : -4)
  );

  root.style.setProperty(
    '--border-subtle',
    isLight ? '#e2e8f0' : adjustHex(theme.bgCard, 2)
  );
  root.style.setProperty(
    '--border-strong',
    isLight ? '#cbd5e1' : adjustHex(theme.bgCard, 18)
  );

  root.style.setProperty('--text-primary', isLight ? '#0f172a' : '#f8fafc');
  root.style.setProperty('--text-secondary', isLight ? '#475569' : '#94a3b8');
  root.style.setProperty('--text-muted', isLight ? '#64748b' : '#64748b');

  root.style.setProperty('--accent-primary', theme.accentPrimary);
  root.style.setProperty(
    '--accent-primary-hover',
    adjustHex(theme.accentPrimary, isLight ? -16 : -18)
  );
  root.style.setProperty(
    '--accent-primary-bg',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.14)`
  );
  root.style.setProperty(
    '--accent-primary-border',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.38)`
  );

  root.style.setProperty('--accent-green', theme.accentGreen);
  root.style.setProperty(
    '--accent-green-bg',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, 0.15)`
  );
  root.style.setProperty(
    '--accent-green-border',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, 0.42)`
  );
}
