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
    id: 'cyber-neon',
    name: 'Cyber Neon',
    isLight: false,
    bgApp: '#09090b',
    bgSurface: '#131317',
    bgCard: '#1d1d24',
    accentPrimary: '#ec4899',
    accentGreen: '#06b6d4',
  },
  {
    id: 'dracula-plum',
    name: 'Dracula Plum',
    isLight: false,
    bgApp: '#191626',
    bgSurface: '#221e33',
    bgCard: '#2d2844',
    accentPrimary: '#c084fc',
    accentGreen: '#34d399',
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    isLight: false,
    bgApp: '#14110e',
    bgSurface: '#1f1a15',
    bgCard: '#2c251d',
    accentPrimary: '#f59e0b',
    accentGreen: '#22c55e',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    isLight: false,
    bgApp: '#1d232e',
    bgSurface: '#242b38',
    bgCard: '#2e3748',
    accentPrimary: '#88c0d0',
    accentGreen: '#a3be8c',
  },

  // ==================== TEMAS CLAROS ====================
  {
    id: 'clean-studio',
    name: 'Clean Studio',
    isLight: true,
    bgApp: '#e8eef5',
    bgSurface: '#ffffff',
    bgCard: '#f4f7fb',
    accentPrimary: '#2563eb',
    accentGreen: '#059669',
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    isLight: true,
    bgApp: '#e3ede5',
    bgSurface: '#f9fcf9',
    bgCard: '#edf5ee',
    accentPrimary: '#15803d',
    accentGreen: '#0d9488',
  },
  {
    id: 'peach-terracotta',
    name: 'Terracotta',
    isLight: true,
    bgApp: '#f6e9e1',
    bgSurface: '#fffbf8',
    bgCard: '#faefe8',
    accentPrimary: '#ea580c',
    accentGreen: '#0f766e',
  },
  {
    id: 'royal-lavender',
    name: 'Royal Lavender',
    isLight: true,
    bgApp: '#eae6fa',
    bgSurface: '#ffffff',
    bgCard: '#f3f0fc',
    accentPrimary: '#6d28d9',
    accentGreen: '#0891b2',
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura',
    isLight: true,
    bgApp: '#fbeaf0',
    bgSurface: '#ffffff',
    bgCard: '#fdf3f6',
    accentPrimary: '#db2777',
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
    adjustHex(theme.bgApp, isLight ? -9 : -4)
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
    isLight ? adjustHex(theme.bgApp, -16) : adjustHex(theme.bgCard, 4)
  );
  root.style.setProperty(
    '--border-strong',
    isLight ? adjustHex(theme.bgApp, -28) : adjustHex(theme.bgCard, 20)
  );

  root.style.setProperty('--text-primary', isLight ? '#0f172a' : '#f8fafc');
  root.style.setProperty('--text-secondary', isLight ? '#475569' : '#94a3b8');
  root.style.setProperty('--text-muted', isLight ? '#64748b' : '#64748b');

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
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.11 : 0.16})`
  );
  root.style.setProperty(
    '--accent-primary-border',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.4 : 0.4})`
  );

  root.style.setProperty('--accent-green', theme.accentGreen);
  root.style.setProperty(
    '--accent-green-text',
    isLight ? adjustHex(theme.accentGreen, -14) : adjustHex(theme.accentGreen, 28)
  );
  root.style.setProperty(
    '--accent-green-bg',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, ${isLight ? 0.08 : 0.14})`
  );
  root.style.setProperty(
    '--accent-green-border',
    `rgba(${gRgb.r}, ${gRgb.g}, ${gRgb.b}, ${isLight ? 0.45 : 0.45})`
  );

  // Cor específica do botão Multi-Task (harmônica e legível tanto no claro quanto no escuro)
  root.style.setProperty(
    '--accent-multi',
    isLight ? adjustHex(theme.accentPrimary, -10) : theme.accentPrimary
  );
  root.style.setProperty(
    '--accent-multi-bg',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.14 : 0.2})`
  );
  root.style.setProperty(
    '--accent-multi-border',
    `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isLight ? 0.45 : 0.48})`
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
