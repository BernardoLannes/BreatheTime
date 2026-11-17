import { ThemeConfig } from '../types/timer';

export const PRESET_THEMES: ThemeConfig[] = [
  // ==================== TEMAS ESCUROS ====================
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
    bgCard: '#152e27',
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

  // ==================== TEMAS CLAROS ====================
  {
    id: 'clean-slate',
    name: 'Clean Slate',
    isLight: true,
    bgApp: '#eef2f6',
    bgSurface: '#ffffff',
    bgCard: '#f8fafc',
    accentPrimary: '#0284c7',
    accentGreen: '#059669',
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper',
    isLight: true,
    bgApp: '#f5f0e6',
    bgSurface: '#fffdf9',
    bgCard: '#faf5eb',
    accentPrimary: '#d97706',
    accentGreen: '#059669',
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    isLight: true,
    bgApp: '#e8f4f0',
    bgSurface: '#ffffff',
    bgCard: '#f2faf7',
    accentPrimary: '#0d9488',
    accentGreen: '#16a34a',
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    isLight: true,
    bgApp: '#efedf8',
    bgSurface: '#ffffff',
    bgCard: '#f7f5fc',
    accentPrimary: '#7c3aed',
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
    adjustHex(theme.bgApp, isLight ? -8 : -4)
  );
  root.style.setProperty(
    '--bg-elevated',
    isLight ? '#ffffff' : adjustHex(theme.bgCard, 4)
  );
  root.style.setProperty(
    '--bg-subtle',
    isLight ? adjustHex(theme.bgApp, -6) : adjustHex(theme.bgSurface, -4)
  );

  root.style.setProperty(
    '--border-subtle',
    isLight ? adjustHex(theme.bgApp, -16) : adjustHex(theme.bgCard, 2)
  );
  root.style.setProperty(
    '--border-strong',
    isLight ? adjustHex(theme.bgApp, -28) : adjustHex(theme.bgCard, 18)
  );

  root.style.setProperty('--text-primary', isLight ? '#0f172a' : '#f8fafc');
  root.style.setProperty('--text-secondary', isLight ? '#475569' : '#94a3b8');
  root.style.setProperty('--text-muted', isLight ? '#64748b' : '#64748b');

  // Contraste de texto em cima dos botões de destaque
  const pLuminance = (0.299 * pRgb.r + 0.587 * pRgb.g + 0.114 * pRgb.b) / 255;
  root.style.setProperty(
    '--text-on-accent',
    pLuminance > 0.58 ? '#082f49' : '#ffffff'
  );
  const gLuminance = (0.299 * gRgb.r + 0.587 * gRgb.g + 0.114 * gRgb.b) / 255;
  root.style.setProperty(
    '--text-on-green',
    gLuminance > 0.58 ? '#052e16' : '#ffffff'
  );

  root.style.setProperty('--accent-primary', theme.accentPrimary);
  root.style.setProperty(
    '--accent-primary-hover',
    adjustHex(theme.accentPrimary, isLight ? -16 : -18)
  );
  root.style.setProperty(
    '--accent-primary-bg',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.12 : 0.15})`
  );
  root.style.setProperty(
    '--accent-primary-border',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.42 : 0.38})`
  );

  root.style.setProperty('--accent-green', theme.accentGreen);
  root.style.setProperty(
    '--accent-green-text',
    isLight ? adjustHex(theme.accentGreen, -18) : adjustHex(theme.accentGreen, 28)
  );
  root.style.setProperty(
    '--accent-green-bg',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, ${isLight ? 0.12 : 0.16})`
  );
  root.style.setProperty(
    '--accent-green-border',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, ${isLight ? 0.42 : 0.42})`
  );

  root.style.setProperty(
    '--hover-overlay',
    isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.07)'
  );
  root.style.setProperty(
    '--shadow-popover',
    isLight
      ? '0 10px 26px rgba(15, 23, 42, 0.16)'
      : '0 12px 28px rgba(0, 0, 0, 0.65)'
  );
}
