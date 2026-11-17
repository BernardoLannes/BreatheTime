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
  /** ID da tarefa vinculada no Bitrix24 (opcional) */
  bitrixTaskId?: number;
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
  /** Parte do tempo já lançada no Bitrix24 (ms); só o restante é enviado */
  loggedMs?: number;
  /** Timestamp (Date.now()) de quando recebeu Play, ou null se pausado */
  startedAt: number | null;
  /** Timestamp (Date.now()) de quando recebeu Play pela primeira vez neste ciclo */
  firstStartedAt?: number | null;
  /** Último instante em que esteve ativo (Play/Pause/Ajuste) */
  lastActivityAt?: number | null;
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
  /** Timestamp de início da atividade (ou estimado por completedAt - durationMs) */
  startedAt?: number;
  /** Timestamp de término / data-hora de referência para lançamento no Bitrix24 */
  completedAt: number;
  bitrixTaskId?: number;
  /** Parte da duração (ms) já lançada no Bitrix24 (evita duplicar) */
  bitrixLoggedMs?: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isLight?: boolean;
  bgApp: string;
  bgSurface: string;
  bgCard: string;
  accentPrimary: string;
  accentGreen: string;
}

export interface ShortcutConfig {
  togglePlay: string;
  toggleCompact: string;
  toggleMinimize: string;
  copyDescription: string;
  toggleAvoidMouse: string;
}

export interface ReminderSettings {
  idleMinutes: number; // 0 = desativado (lembrete de ligar o tempo)
  breakMinutes: number; // 0 = desativado (lembrete de pausa contínua)
  autoPauseIdleMinutes: number; // 0 = desativado (pausar se PC ficar inativo)
  pauseOnSleepOrLock: boolean; // pausar ao bloquear tela / suspender / desligar
  remindOnResume: boolean; // lembrar ao desbloquear / voltar da suspensão
}

export interface ElectronWindowState {
  alwaysOnTop: boolean;
  compactMode: boolean;
  opacity: number;
  shortcuts: ShortcutConfig;
  autoLaunch: boolean;
  avoidMouse: boolean;
}

export interface BitrixStatus {
  connected: boolean;
  mode?: 'oauth' | 'webhook';
  portal?: string;
  user?: { id: number; name: string };
  /** true quando a credencial está salva sem criptografia (fallback em Linux sem chaveiro) */
  insecureStorage?: boolean;
  oauthAvailable?: boolean;
}

export interface BitrixTask {
  id: number;
  title: string;
}

export type BitrixResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export interface BitrixApi {
  getStatus: () => Promise<BitrixResult<BitrixStatus>>;
  connectWebhook: (webhookUrl: string) => Promise<BitrixResult<BitrixStatus>>;
  login: () => Promise<BitrixResult<BitrixStatus>>;
  disconnect: () => Promise<BitrixResult<BitrixStatus>>;
  onOAuthUrl: (callback: (url: string) => void) => () => void;
  listTasks: () => Promise<BitrixResult<BitrixTask[]>>;
  logTime: (payload: {
    taskId: number;
    seconds: number;
    comment: string;
    createdDate?: string | number;
  }) => Promise<BitrixResult<{ seconds: number; createdDate?: string }>>;
}

declare global {
  interface Window {
    electronAPI?: {
      bitrix: BitrixApi;
      getState: () => Promise<ElectronWindowState>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      setCompactMode: (compact?: boolean) => Promise<boolean>;
      ensureCompactHeight: (minHeight: number) => Promise<void>;
      setOpacity: (opacity: number) => Promise<number>;
      setAutoLaunch: (enabled: boolean) => Promise<boolean>;
      setAvoidMouse: (enabled: boolean) => Promise<boolean>;
      setPowerSettings: (settings: {
        autoPauseIdleMinutes: number;
        pauseOnSleepOrLock: boolean;
      }) => Promise<{ autoPauseIdleMinutes: number; pauseOnSleepOrLock: boolean }>;
      openExternal: (url: string) => Promise<void>;
      updateShortcuts: (shortcuts: ShortcutConfig) => Promise<ShortcutConfig>;
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      onShortcutTogglePlay: (callback: () => void) => () => void;
      onShortcutCompactChanged: (
        callback: (isCompact: boolean) => void
      ) => () => void;
      onShortcutCopyDescription: (callback: () => void) => () => void;
      onShortcutAvoidMouseChanged: (
        callback: (enabled: boolean) => void
      ) => () => void;
      onShortcutOpacityChanged: (
        callback: (opacity: number) => void
      ) => () => void;
      onPowerAutoPause: (
        callback: (payload: { reason: string; idleSeconds: number }) => void
      ) => () => void;
      onPowerResume: (callback: () => void) => () => void;
    };
  }
}
