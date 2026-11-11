export interface Project {
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
  createdAt: number;
}

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  isExpanded: boolean;
  createdAt: number;
}

export interface TimerDivision {
  id: string;
  taskId: string;
  projectId: string;
  /** Nome opcional da divisão (ex: 'Reunião', 'Análise', 'Execução'). Vazio no cronômetro principal inicial. */
  label: string;
  /** Descrição do que foi feito para colar no Bitrix24 */
  description: string;
  /** Tempo acumulado em milissegundos */
  accumulatedMs: number;
  /** Timestamp (Date.now()) de quando recebeu Play, ou null se pausado */
  startedAt: number | null;
  isRunning: boolean;
  createdAt: number;
}

export interface CompletedLogEntry {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  taskId: string;
  taskTitle: string;
  divisionLabel: string;
  description: string;
  durationMs: number;
  completedAt: number;
}

export interface ShortcutConfig {
  togglePlay: string;
  toggleCompact: string;
  toggleMinimize: string;
}

export interface ElectronWindowState {
  alwaysOnTop: boolean;
  compactMode: boolean;
  opacity: number;
  shortcuts: ShortcutConfig;
}

declare global {
  interface Window {
    electronAPI?: {
      getState: () => Promise<ElectronWindowState>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      setCompactMode: (compact?: boolean) => Promise<boolean>;
      ensureCompactHeight: (minHeight: number) => Promise<void>;
      setOpacity: (opacity: number) => Promise<number>;
      updateShortcuts: (shortcuts: ShortcutConfig) => Promise<ShortcutConfig>;
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      onShortcutTogglePlay: (callback: () => void) => () => void;
      onShortcutCompactChanged: (
        callback: (isCompact: boolean) => void
      ) => () => void;
    };
  }
}
