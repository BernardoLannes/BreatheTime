import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  Timer,
  History,
  FolderPlus,
  Pause,
  Copy,
  Check,
  Zap,
  PauseCircle,
  Play,
  X,
  Search,
  Bell,
} from 'lucide-react';
import {
  Project,
  TaskItem,
  TimerDivision,
  CompletedLogEntry,
  ShortcutConfig,
  ReminderSettings,
  BitrixStatus,
  ThemeConfig,
} from './types/timer';
import { PRESET_THEMES, applyThemeToDocument } from './utils/themes';
import { ThemeModal } from './components/ThemeModal';
import { SettingsModal, BitrixRoundingMode } from './components/SettingsModal';
import {
  getDivisionElapsedMs,
  splitDuration,
  formatDivisionClipboardText,
  formatConsolidatedTaskDescription,
  copyToClipboard,
} from './utils/timeFormat';
import { BitrixContext, BitrixContextValue } from './bitrix/BitrixContext';
import { BitrixSettingsModal } from './components/BitrixSettingsModal';
import { TitleBar } from './components/TitleBar';
import { CompactPillView } from './components/CompactPillView';
import { ProjectSection } from './components/ProjectSection';
import { HistoryTab } from './components/HistoryTab';

const STORAGE_KEY = 'breathe_time_state_v1';

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  togglePlay: 'Alt+Shift+P',
  toggleCompact: 'Alt+Shift+M',
  toggleMinimize: 'Alt+Shift+B',
  copyDescription: 'Alt+Shift+C',
  toggleAvoidMouse: 'Alt+Shift+E',
};

const DEFAULT_REMINDERS: ReminderSettings = {
  idleMinutes: 15,
  breakMinutes: 0,
  autoPauseIdleMinutes: 10,
  pauseOnSleepOrLock: true,
  remindOnResume: true,
};

const DEFAULT_PRESET_LABELS = [
  'Desenvolvimento',
  'Pesquisa',
  'Reunião',
  'Análise',
  'Testes',
  'Ajustes',
];

const PROJECT_COLORS = [
  '#38bdf8', // Sky
  '#a78bfa', // Violet
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#fb7185', // Rose
];

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface StoredState {
  projects: Project[];
  tasks: TaskItem[];
  divisions: TimerDivision[];
  history: CompletedLogEntry[];
  autoPauseOthers: boolean;
  lastSelectedDivisionId: string | null;
  shortcuts: ShortcutConfig;
  presetLabels: string[];
  unfocusedOpacity?: number;
  reminders?: ReminderSettings;
  theme?: ThemeConfig;
  bitrixRounding?: BitrixRoundingMode;
}

function getInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects)) {
        return {
          projects: parsed.projects || [],
          tasks: parsed.tasks || [],
          divisions: parsed.divisions || [],
          history: parsed.history || [],
          autoPauseOthers:
            typeof parsed.autoPauseOthers === 'boolean'
              ? parsed.autoPauseOthers
              : true,
          lastSelectedDivisionId: parsed.lastSelectedDivisionId || null,
          shortcuts: {
            ...DEFAULT_SHORTCUTS,
            ...(parsed.shortcuts || {}),
          },
          presetLabels: Array.isArray(parsed.presetLabels)
            ? parsed.presetLabels
            : DEFAULT_PRESET_LABELS,
          unfocusedOpacity:
            typeof parsed.unfocusedOpacity === 'number'
              ? parsed.unfocusedOpacity
              : 1.0,
          reminders: {
            ...DEFAULT_REMINDERS,
            ...(parsed.reminders || {}),
          },
          theme: parsed.theme || PRESET_THEMES[0],
          bitrixRounding: parsed.bitrixRounding || 'exact',
        };
      }
    }
  } catch {
    // ignore storage errors
  }

  const projId = 'proj_initial';
  const taskId = 'task_initial';
  const divId = 'div_initial';
  const now = Date.now();

  return {
    projects: [
      {
        id: projId,
        name: 'Projeto Principal',
        color: PROJECT_COLORS[0],
        isExpanded: true,
        createdAt: now,
      },
    ],
    tasks: [
      {
        id: taskId,
        projectId: projId,
        title: 'Tarefa #1 (Edite o nome ou crie novas)',
        isExpanded: true,
        createdAt: now,
      },
    ],
    divisions: [
      {
        id: divId,
        taskId: taskId,
        projectId: projId,
        label: '',
        description: '',
        accumulatedMs: 0,
        startedAt: null,
        isRunning: false,
        createdAt: now,
      },
    ],
    history: [],
    autoPauseOthers: true,
    lastSelectedDivisionId: divId,
    shortcuts: DEFAULT_SHORTCUTS,
    presetLabels: DEFAULT_PRESET_LABELS,
  };
}

export const App: React.FC = () => {
  const initial = useMemo(() => getInitialState(), []);

  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [tasks, setTasks] = useState<TaskItem[]>(initial.tasks);
  const [divisions, setDivisions] = useState<TimerDivision[]>(initial.divisions);
  const [history, setHistory] = useState<CompletedLogEntry[]>(initial.history);
  const [autoPauseOthers, setAutoPauseOthers] = useState<boolean>(
    initial.autoPauseOthers
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(
    initial.lastSelectedDivisionId
  );
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(initial.shortcuts);
  const [presetLabels, setPresetLabels] = useState<string[]>(
    initial.presetLabels
  );

  // Estado da janela Electron
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(
    initial.unfocusedOpacity ?? 1.0
  );
  const [autoLaunch, setAutoLaunch] = useState<boolean>(false);
  const [avoidMouse, setAvoidMouse] = useState<boolean>(false);
  const [reminders, setReminders] = useState<ReminderSettings>(
    initial.reminders || DEFAULT_REMINDERS
  );
  const [reminderBanner, setReminderBanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ThemeConfig>(
    initial.theme || PRESET_THEMES[0]
  );
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [bitrixRounding, setBitrixRounding] = useState<BitrixRoundingMode>(
    initial.bitrixRounding || 'exact'
  );

  // Aplicar tema e cores personalizáveis no DOM
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Navegação e UI
  const [activeTab, setActiveTab] = useState<'timers' | 'history'>('timers');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [bannerCopiedId, setBannerCopiedId] = useState<string | null>(null);

  // Modal ao sair do modo Multi-Task com cronômetros rodando
  const [showExitMultiModal, setShowExitMultiModal] = useState(false);

  // Integração Bitrix24 (o segredo vive só no processo main)
  const [bitrixStatus, setBitrixStatus] = useState<BitrixStatus>({
    connected: false,
  });
  const [showBitrixModal, setShowBitrixModal] = useState(false);
  const bitrixLocks = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.electronAPI?.bitrix.getStatus().then((res) => {
      if (res.ok) setBitrixStatus(res.data);
    });
  }, []);

  // Tick de relógio para atualizar os cronômetros em tempo real (a cada 250ms)
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar estado inicial e atalhos com a janela Electron
  useEffect(() => {
    window.electronAPI?.getState().then((st) => {
      setAlwaysOnTop(st.alwaysOnTop);
      setCompactMode(st.compactMode);
      setAutoLaunch(Boolean(st.autoLaunch));
      setAvoidMouse(Boolean(st.avoidMouse));
      if (initial.unfocusedOpacity && initial.unfocusedOpacity < 1) {
        window.electronAPI?.setOpacity(initial.unfocusedOpacity);
      } else {
        setOpacity(st.opacity);
      }
      window.electronAPI?.updateShortcuts(initial.shortcuts);
      window.electronAPI?.setPowerSettings({
        autoPauseIdleMinutes: reminders.autoPauseIdleMinutes,
        pauseOnSleepOrLock: reminders.pauseOnSleepOrLock,
      });
    });
  }, [initial.shortcuts, initial.unfocusedOpacity]);

  // Sincronizar configurações de inatividade/suspensão sempre que o usuário alterar
  useEffect(() => {
    window.electronAPI?.setPowerSettings({
      autoPauseIdleMinutes: reminders.autoPauseIdleMinutes,
      pauseOnSleepOrLock: reminders.pauseOnSleepOrLock,
    });
  }, [reminders.autoPauseIdleMinutes, reminders.pauseOnSleepOrLock]);

  // Persistir no localStorage sempre que mudar
  useEffect(() => {
    const stateToSave: StoredState = {
      projects,
      tasks,
      divisions,
      history,
      autoPauseOthers,
      lastSelectedDivisionId: selectedDivisionId,
      shortcuts,
      presetLabels,
      unfocusedOpacity: opacity,
      reminders,
      theme,
      bitrixRounding,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // ignore quota errors
    }
  }, [
    projects,
    tasks,
    divisions,
    history,
    autoPauseOthers,
    selectedDivisionId,
    shortcuts,
    presetLabels,
    opacity,
    reminders,
    theme,
    bitrixRounding,
  ]);

  const handleTogglePlayDivision = useCallback(
    (divisionId: string) => {
      const currentTs = Date.now();
      setNow(currentTs);
      setSelectedDivisionId(divisionId);

      setDivisions((prev) => {
        const target = prev.find((d) => d.id === divisionId);
        if (!target) return prev;

        const willRun = !target.isRunning;

        return prev.map((div) => {
          if (div.id === divisionId) {
            if (willRun) {
              return {
                ...div,
                isRunning: true,
                startedAt: currentTs,
                firstStartedAt: div.firstStartedAt ?? currentTs,
                lastActivityAt: currentTs,
              };
            } else {
              const elapsed =
                div.startedAt !== null ? currentTs - div.startedAt : 0;
              return {
                ...div,
                isRunning: false,
                accumulatedMs: Math.max(0, div.accumulatedMs + elapsed),
                startedAt: null,
                lastActivityAt: currentTs,
              };
            }
          }

          if (willRun && autoPauseOthers && div.isRunning) {
            const elapsed =
              div.startedAt !== null ? currentTs - div.startedAt : 0;
            return {
              ...div,
              isRunning: false,
              accumulatedMs: Math.max(0, div.accumulatedMs + elapsed),
              startedAt: null,
              lastActivityAt: currentTs,
            };
          }

          return div;
        });
      });
    },
    [autoPauseOthers]
  );

  // Alternar entre Modo 1x (Auto-Pause) e Modo Multi-Task
  const handleRequestToggleAutoPause = () => {
    // Se está em 1x (autoPauseOthers === true) -> vai para Multi-Task direto
    if (autoPauseOthers) {
      setAutoPauseOthers(false);
      return;
    }

    // Se está saindo do Multi-Task (autoPauseOthers === false -> true):
    const currentlyRunning = divisions.filter((d) => d.isRunning);
    if (currentlyRunning.length > 0) {
      // Pergunta qual cronômetro deve continuar ativo ou se deve desativar todos
      setShowExitMultiModal(true);
    } else {
      setAutoPauseOthers(true);
    }
  };

  // Mantém apenas 1 cronômetro ativo ao sair do Multi-Task e pausa os demais
  const handleExitMultiKeepOne = (keepDivisionId: string) => {
    const currentTs = Date.now();
    setNow(currentTs);
    setSelectedDivisionId(keepDivisionId);

    setDivisions((prev) =>
      prev.map((div) => {
        if (div.id === keepDivisionId) {
          return div;
        }
        if (div.isRunning) {
          const elapsed =
            div.startedAt !== null ? currentTs - div.startedAt : 0;
          return {
            ...div,
            isRunning: false,
            accumulatedMs: Math.max(0, div.accumulatedMs + elapsed),
            startedAt: null,
          };
        }
        return div;
      })
    );

    setAutoPauseOthers(true);
    setShowExitMultiModal(false);
  };

  // Desativa (pausa) todos os cronômetros ao sair do Multi-Task
  const handleExitMultiPauseAll = () => {
    const currentTs = Date.now();
    setNow(currentTs);

    setDivisions((prev) =>
      prev.map((div) => {
        if (!div.isRunning) return div;
        const elapsed = div.startedAt !== null ? currentTs - div.startedAt : 0;
        return {
          ...div,
          isRunning: false,
          accumulatedMs: Math.max(0, div.accumulatedMs + elapsed),
          startedAt: null,
        };
      })
    );

    setAutoPauseOthers(true);
    setShowExitMultiModal(false);
  };

  // Refs para uso nos atalhos globais e lembretes
  const divisionsRef = useRef(divisions);
  divisionsRef.current = divisions;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const selectedDivisionIdRef = useRef(selectedDivisionId);
  selectedDivisionIdRef.current = selectedDivisionId;

  // Lembretes de ociosidade / pausa contínua
  const lastRunningChangeRef = useRef<number>(Date.now());
  const lastIdleNotifiedRef = useRef<number>(0);
  const lastBreakNotifiedRef = useRef<number>(0);
  const lastAutoPausedIdRef = useRef<string | null>(null);
  const anyRunningNow = divisions.some((d) => d.isRunning);

  useEffect(() => {
    lastRunningChangeRef.current = Date.now();
    lastIdleNotifiedRef.current = 0;
    lastBreakNotifiedRef.current = 0;
    if (anyRunningNow) {
      setReminderBanner((prev) =>
        prev &&
        (prev.includes('parado') ||
          prev.includes('voltou') ||
          prev.includes('pausado'))
          ? null
          : prev
      );
    }
  }, [anyRunningNow]);

  const sendSystemNotification = useCallback((title: string, body: string) => {
    if (window.electronAPI?.notify) {
      window.electronAPI.notify(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, []);

  const handleResumeFromReminder = useCallback(() => {
    if (divisions.length === 0) return;
    const targetId =
      lastAutoPausedIdRef.current &&
      divisions.some((d) => d.id === lastAutoPausedIdRef.current)
        ? lastAutoPausedIdRef.current
        : selectedDivisionId &&
            divisions.some((d) => d.id === selectedDivisionId)
          ? selectedDivisionId
          : divisions[0].id;
    handleTogglePlayDivision(targetId);
    setReminderBanner(null);
  }, [divisions, selectedDivisionId, handleTogglePlayDivision]);

  // Escutar eventos do powerMonitor (inatividade do PC, bloqueio, suspensão, desligamento)
  useEffect(() => {
    const unsubAutoPause = window.electronAPI?.onPowerAutoPause(
      ({ reason }) => {
        const currentDivs = divisionsRef.current;
        const running = currentDivs.filter((d) => d.isRunning);
        if (running.length === 0) return;

        lastAutoPausedIdRef.current = running[0].id;
        const currentTs = Date.now();
        setNow(currentTs);

        setDivisions((prev) =>
          prev.map((div) => {
            if (!div.isRunning) return div;
            const elapsed =
              div.startedAt !== null ? currentTs - div.startedAt : 0;
            return {
              ...div,
              isRunning: false,
              accumulatedMs: Math.max(0, div.accumulatedMs + elapsed),
              startedAt: null,
              lastActivityAt: currentTs,
            };
          })
        );

        const msg = `Pausado automaticamente: ${reason}.`;
        setReminderBanner(msg);
        sendSystemNotification('BreatheTime — Pausa Automática', msg);
      }
    );

    const unsubResume = window.electronAPI?.onPowerResume(() => {
      if (!reminders.remindOnResume) return;
      const currentDivs = divisionsRef.current;
      const hasRunning = currentDivs.some((d) => d.isRunning);
      if (hasRunning || currentDivs.length === 0) return;

      const msg = 'Você voltou ao PC — quer retomar seu cronômetro?';
      setReminderBanner(msg);
      sendSystemNotification('BreatheTime — Lembrar de Ligar o Tempo', msg);
    });

    return () => {
      unsubAutoPause?.();
      unsubResume?.();
    };
  }, [reminders.remindOnResume, sendSystemNotification]);

  useEffect(() => {
    if (reminders.idleMinutes <= 0 && reminders.breakMinutes <= 0) return;

    const timer = setInterval(() => {
      const current = Date.now();
      const elapsedMin = (current - lastRunningChangeRef.current) / 60000;

      if (!anyRunningNow && reminders.idleMinutes > 0) {
        if (
          elapsedMin >= reminders.idleMinutes &&
          current - lastIdleNotifiedRef.current >= reminders.idleMinutes * 60000
        ) {
          lastIdleNotifiedRef.current = current;
          const msg = `Nenhum cronômetro ativo há ${reminders.idleMinutes} min.`;
          setReminderBanner(msg);
          sendSystemNotification('BreatheTime — Lembrete de Tempo', msg);
        }
      }

      if (anyRunningNow && reminders.breakMinutes > 0) {
        if (
          elapsedMin >= reminders.breakMinutes &&
          current - lastBreakNotifiedRef.current >= reminders.breakMinutes * 60000
        ) {
          lastBreakNotifiedRef.current = current;
          const msg = `Você está cronometrando há ${reminders.breakMinutes} min seguidos. Que tal uma pausa?`;
          setReminderBanner(msg);
          sendSystemNotification('BreatheTime — Hora da Pausa', msg);
        }
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [anyRunningNow, reminders.idleMinutes, reminders.breakMinutes, sendSystemNotification]);

  useEffect(() => {
    const unsubPlay = window.electronAPI?.onShortcutTogglePlay(() => {
      const currentDivs = divisionsRef.current;
      if (currentDivs.length === 0) return;

      const running = currentDivs.find((d) => d.isRunning);
      if (running) {
        handleTogglePlayDivision(running.id);
        return;
      }

      const target =
        currentDivs.find((d) => d.id === selectedDivisionIdRef.current) ||
        currentDivs[0];
      if (target) {
        handleTogglePlayDivision(target.id);
      }
    });

    const unsubCompact = window.electronAPI?.onShortcutCompactChanged(
      (isCompact) => {
        setCompactMode(isCompact);
      }
    );

    const unsubCopy = window.electronAPI?.onShortcutCopyDescription(() => {
      const currentDivs = divisionsRef.current;
      const target =
        currentDivs.find((d) => d.isRunning) ||
        currentDivs.find((d) => d.id === selectedDivisionIdRef.current) ||
        currentDivs[0];
      if (!target) return;
      const t = tasksRef.current.find((item) => item.id === target.taskId);
      const txt = formatDivisionClipboardText(
        target.label,
        target.description,
        t?.title || ''
      );
      if (txt) {
        copyToClipboard(txt);
      }
    });

    const unsubAvoid = window.electronAPI?.onShortcutAvoidMouseChanged(
      (enabled) => {
        setAvoidMouse(enabled);
      }
    );

    const unsubOpacity = window.electronAPI?.onShortcutOpacityChanged(
      (nextOp) => {
        setOpacity(nextOp);
      }
    );

    return () => {
      unsubPlay?.();
      unsubCompact?.();
      unsubCopy?.();
      unsubAvoid?.();
      unsubOpacity?.();
    };
  }, [handleTogglePlayDivision]);

  // Handlers da janela Electron
  const handleToggleAlwaysOnTop = async () => {
    if (window.electronAPI) {
      const next = await window.electronAPI.toggleAlwaysOnTop();
      setAlwaysOnTop(next);
    } else {
      setAlwaysOnTop((prev) => !prev);
    }
  };

  const handleSetCompactMode = async (target: boolean) => {
    if (window.electronAPI) {
      const next = await window.electronAPI.setCompactMode(target);
      setCompactMode(next);
    } else {
      setCompactMode(target);
    }
  };

  const handleChangeOpacity = async (val: number) => {
    if (window.electronAPI) {
      const next = await window.electronAPI.setOpacity(val);
      setOpacity(next);
    } else {
      setOpacity(val);
    }
  };

  const handleUpdateShortcuts = async (next: ShortcutConfig) => {
    setShortcuts(next);
    if (window.electronAPI) {
      const registered = await window.electronAPI.updateShortcuts(next);
      setShortcuts(registered);
    }
  };

  const handleToggleAutoLaunch = async () => {
    const target = !autoLaunch;
    if (window.electronAPI) {
      const updated = await window.electronAPI.setAutoLaunch(target);
      setAutoLaunch(updated);
    } else {
      setAutoLaunch(target);
    }
  };

  const handleToggleAvoidMouse = async () => {
    const target = !avoidMouse;
    if (window.electronAPI) {
      const updated = await window.electronAPI.setAvoidMouse(target);
      setAvoidMouse(updated);
    } else {
      setAvoidMouse(target);
    }
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    setTasks((prev) => {
      const targetTask = prev.find((t) => t.id === taskId);
      if (!targetTask) return prev;

      const sameProjectTasks = prev.filter(
        (t) => t.projectId === targetTask.projectId
      );
      const localIdx = sameProjectTasks.findIndex((t) => t.id === taskId);
      const swapIdx = direction === 'up' ? localIdx - 1 : localIdx + 1;
      if (swapIdx < 0 || swapIdx >= sameProjectTasks.length) return prev;

      const neighborTask = sameProjectTasks[swapIdx];
      const idxA = prev.findIndex((t) => t.id === targetTask.id);
      const idxB = prev.findIndex((t) => t.id === neighborTask.id);
      const copy = [...prev];
      copy[idxA] = prev[idxB];
      copy[idxB] = prev[idxA];
      return copy;
    });
  };

  // ==================== LÓGICA DE PROJETOS ====================
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    const projId = generateId('proj');
    const newProj: Project = {
      id: projId,
      name: trimmed,
      color: newProjectColor,
      isExpanded: true,
      createdAt: Date.now(),
    };

    setProjects((prev) => [...prev, newProj]);
    setNewProjectName('');
    const nextColorIdx =
      (PROJECT_COLORS.indexOf(newProjectColor) + 1) % PROJECT_COLORS.length;
    setNewProjectColor(PROJECT_COLORS[nextColorIdx]);
    setShowNewProjectForm(false);
  };

  const handleToggleExpandProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
      )
    );
  };

  const handleUpdateProjectName = (projectId: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name } : p))
    );
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
    setDivisions((prev) => prev.filter((d) => d.projectId !== projectId));
  };

  // ==================== LÓGICA DE TAREFAS ====================
  const handleCreateTask = (projectId: string, title: string) => {
    const taskId = generateId('task');
    const divId = generateId('div');
    const timestamp = Date.now();

    const newTask: TaskItem = {
      id: taskId,
      projectId,
      title,
      isExpanded: true,
      createdAt: timestamp,
    };

    const initialDivision: TimerDivision = {
      id: divId,
      taskId,
      projectId,
      label: '',
      description: '',
      accumulatedMs: 0,
      startedAt: null,
      isRunning: false,
      createdAt: timestamp,
    };

    setTasks((prev) => [...prev, newTask]);
    setDivisions((prev) => [...prev, initialDivision]);
    setSelectedDivisionId(divId);
  };

  const handleToggleExpandTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, isExpanded: !t.isExpanded } : t
      )
    );
  };

  const handleUpdateTaskTitle = (taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDivisions((prev) => prev.filter((d) => d.taskId !== taskId));
  };

  // ==================== LÓGICA DE DIVISÕES DE CRONÔMETRO ====================
  const handleAddDivision = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const divId = generateId('div');

    const newDiv: TimerDivision = {
      id: divId,
      taskId,
      projectId: task.projectId,
      label: '',
      description: '',
      accumulatedMs: 0,
      startedAt: null,
      isRunning: false,
      createdAt: Date.now(),
    };

    setDivisions((prev) => [...prev, newDiv]);
    setSelectedDivisionId(divId);
  };

  const handleUpdateDivisionLabel = (divisionId: string, label: string) => {
    setDivisions((prev) =>
      prev.map((d) => (d.id === divisionId ? { ...d, label } : d))
    );
  };

  const handleUpdateDivisionDescription = (
    divisionId: string,
    description: string
  ) => {
    setDivisions((prev) =>
      prev.map((d) => (d.id === divisionId ? { ...d, description } : d))
    );
  };

  const handleAdjustDivisionTimeMs = (divisionId: string, deltaMs: number) => {
    const currentTs = Date.now();
    setNow(currentTs);

    setDivisions((prev) =>
      prev.map((div) => {
        if (div.id !== divisionId) return div;
        const currentElapsed = getDivisionElapsedMs(div, currentTs);
        const updatedMs = Math.max(0, currentElapsed + deltaMs);

        if (div.isRunning) {
          return {
            ...div,
            accumulatedMs: updatedMs,
            startedAt: currentTs,
          };
        }
        return {
          ...div,
          accumulatedMs: updatedMs,
        };
      })
    );
  };

  const handleSetDivisionManualTime = (
    divisionId: string,
    hours: number,
    minutes: number
  ) => {
    const currentTs = Date.now();
    setNow(currentTs);
    const targetMs = (hours * 3600 + minutes * 60) * 1000;

    setDivisions((prev) =>
      prev.map((div) => {
        if (div.id !== divisionId) return div;
        return {
          ...div,
          accumulatedMs: Math.max(0, targetMs),
          startedAt: div.isRunning ? currentTs : null,
        };
      })
    );
  };

  const handleCompleteDivision = (divisionId: string) => {
    const currentTs = Date.now();
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return;

    const elapsedMs = getDivisionElapsedMs(div, currentTs);
    const task = tasks.find((t) => t.id === div.taskId);
    const project = projects.find((p) => p.id === div.projectId);

    if (elapsedMs > 0 || div.description.trim()) {
      const endTs = div.isRunning ? currentTs : div.lastActivityAt || currentTs;
      const startTs =
        div.firstStartedAt || Math.max(0, endTs - elapsedMs);
      const logEntry: CompletedLogEntry = {
        id: generateId('hist'),
        projectId: div.projectId,
        projectName: project?.name || 'Projeto',
        projectColor: project?.color || PROJECT_COLORS[0],
        taskId: div.taskId,
        taskTitle: task?.title || 'Tarefa',
        divisionLabel: div.label,
        description: div.description,
        durationMs: elapsedMs,
        startedAt: startTs,
        completedAt: endTs,
        bitrixTaskId: task?.bitrixTaskId,
        bitrixLoggedMs: div.loggedMs,
      };
      setHistory((prev) => [logEntry, ...prev]);
    }

    const siblingDivs = divisions.filter((d) => d.taskId === div.taskId);

    if (siblingDivs.length > 1) {
      setDivisions((prev) => prev.filter((d) => d.id !== divisionId));
    } else {
      setDivisions((prev) =>
        prev.map((d) =>
          d.id === divisionId
            ? {
                ...d,
                description: '',
                accumulatedMs: 0,
                loggedMs: 0,
                startedAt: null,
                firstStartedAt: null,
                lastActivityAt: null,
                isRunning: false,
              }
            : d
        )
      );
    }
  };

  const handleCompleteAllTaskDivisions = (taskId: string) => {
    const currentTs = Date.now();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const project = projects.find((p) => p.id === task.projectId);
    const taskDivs = divisions.filter((d) => d.taskId === taskId);

    const newEntries: CompletedLogEntry[] = [];
    for (const div of taskDivs) {
      const elapsedMs = getDivisionElapsedMs(div, currentTs);
      if (elapsedMs > 0 || div.description.trim()) {
        const endTs = div.isRunning ? currentTs : div.lastActivityAt || currentTs;
        const startTs =
          div.firstStartedAt || Math.max(0, endTs - elapsedMs);
        newEntries.push({
          id: generateId('hist'),
          projectId: div.projectId,
          projectName: project?.name || 'Projeto',
          projectColor: project?.color || PROJECT_COLORS[0],
          taskId: div.taskId,
          taskTitle: task.title,
          divisionLabel: div.label,
          description: div.description,
          durationMs: elapsedMs,
          startedAt: startTs,
          completedAt: endTs,
          bitrixTaskId: task.bitrixTaskId,
          bitrixLoggedMs: div.loggedMs,
        });
      }
    }

    if (newEntries.length > 0) {
      setHistory((prev) => [...newEntries, ...prev]);
    }

    const firstDiv = taskDivs[0];
    if (firstDiv) {
      setDivisions((prev) => [
        ...prev.filter((d) => d.taskId !== taskId),
        {
          ...firstDiv,
          label: '',
          description: '',
          accumulatedMs: 0,
          loggedMs: 0,
          startedAt: null,
          firstStartedAt: null,
          lastActivityAt: null,
          isRunning: false,
        },
      ]);
    }
  };

  const handleDeleteDivision = (divisionId: string) => {
    setDivisions((prev) => prev.filter((d) => d.id !== divisionId));
  };

  // ==================== LÓGICA DO HISTÓRICO DO DIA ====================
  const handleRestoreHistoryEntry = (entry: CompletedLogEntry) => {
    let targetProjectId = entry.projectId;
    const projExists = projects.some((p) => p.id === entry.projectId);
    if (!projExists) {
      targetProjectId = generateId('proj');
      setProjects((prev) => [
        ...prev,
        {
          id: targetProjectId,
          name: entry.projectName,
          color: entry.projectColor,
          isExpanded: true,
          createdAt: Date.now(),
        },
      ]);
    }

    let targetTaskId = entry.taskId;
    const taskExists = tasks.some((t) => t.id === entry.taskId);
    if (!taskExists) {
      targetTaskId = generateId('task');
      setTasks((prev) => [
        ...prev,
        {
          id: targetTaskId,
          projectId: targetProjectId,
          title: entry.taskTitle,
          isExpanded: true,
          createdAt: Date.now(),
          bitrixTaskId: entry.bitrixTaskId,
        },
      ]);
    }

    const restoredDiv: TimerDivision = {
      id: generateId('div'),
      taskId: targetTaskId,
      projectId: targetProjectId,
      label: entry.divisionLabel,
      description: entry.description,
      accumulatedMs: entry.durationMs,
      loggedMs: entry.bitrixLoggedMs,
      startedAt: null,
      isRunning: false,
      createdAt: Date.now(),
    };

    setDivisions((prev) => [...prev, restoredDiv]);
    setHistory((prev) => prev.filter((h) => h.id !== entry.id));
    setActiveTab('timers');
  };

  const handleUpdateHistoryEntry = (
    entryId: string,
    patch: Partial<Pick<CompletedLogEntry, 'startedAt' | 'completedAt' | 'description'>>
  ) => {
    setHistory((prev) =>
      prev.map((h) => (h.id === entryId ? { ...h, ...patch } : h))
    );
  };

  const handleDeleteHistoryEntry = (entryId: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== entryId));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  // ==================== INTEGRAÇÃO BITRIX24 ====================
  const handleLinkBitrixTask = (taskId: string, bitrixTaskId: number | undefined) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, bitrixTaskId } : t))
    );
  };

  /** Envia o tempo ao Bitrix24 na data/hora informada. Retorna os ms realmente enviados. */
  const sendToBitrix = async (
    lockKey: string,
    bitrixTaskId: number | undefined,
    deltaMs: number,
    comment: string,
    createdDate?: number
  ): Promise<{ ok: boolean; message?: string; sentMs?: number }> => {
    if (!window.electronAPI) {
      return { ok: false, message: 'Disponível apenas no aplicativo desktop.' };
    }
    if (!bitrixStatus.connected) {
      return { ok: false, message: 'Conecte-se ao Bitrix24 primeiro.' };
    }
    if (!bitrixTaskId) {
      return { ok: false, message: 'Vincule esta tarefa a uma tarefa do Bitrix24.' };
    }
    let seconds = Math.round(deltaMs / 1000);
    if (seconds < 1) {
      return { ok: false, message: 'Nenhum tempo novo para lançar.' };
    }
    if (bitrixRounding === 'ceil_1m') {
      seconds = Math.ceil(seconds / 60) * 60;
    } else if (bitrixRounding === 'ceil_5m') {
      seconds = Math.ceil(seconds / 300) * 300;
    }
    if (bitrixLocks.current.has(lockKey)) {
      return { ok: false, message: 'Lançamento já em andamento.' };
    }
    bitrixLocks.current.add(lockKey);
    try {
      const res = await window.electronAPI.bitrix.logTime({
        taskId: bitrixTaskId,
        seconds,
        comment,
        createdDate,
      });
      if (!res.ok) {
        if (res.code === 'auth' || res.code === 'not_connected') {
          setBitrixStatus({ connected: false });
        }
        return { ok: false, message: res.message };
      }
      return { ok: true, message: `${seconds}s lançados no Bitrix24.`, sentMs: seconds * 1000 };
    } finally {
      bitrixLocks.current.delete(lockKey);
    }
  };

  const handleLogDivisionToBitrix = async (divisionId: string) => {
    const div = divisions.find((d) => d.id === divisionId);
    const task = div && tasks.find((t) => t.id === div.taskId);
    if (!div || !task) return { ok: false, message: 'Cronômetro não encontrado.' };
    const delta = getDivisionElapsedMs(div, Date.now()) - (div.loggedMs || 0);
    const r = await sendToBitrix(
      `task:${task.id}`,
      task.bitrixTaskId,
      delta,
      formatDivisionClipboardText(div.label, div.description, task.title),
      div.isRunning ? Date.now() : div.lastActivityAt || Date.now()
    );
    if (r.ok && r.sentMs) {
      setDivisions((prev) =>
        prev.map((d) =>
          d.id === divisionId ? { ...d, loggedMs: (d.loggedMs || 0) + r.sentMs! } : d
        )
      );
    }
    return r;
  };

  const handleLogTaskToBitrix = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, message: 'Tarefa não encontrada.' };
    const ts = Date.now();
    const parts = divisions
      .filter((d) => d.taskId === taskId)
      .map((d) => ({ div: d, delta: getDivisionElapsedMs(d, ts) - (d.loggedMs || 0) }))
      .filter((p) => p.delta > 0);
    const total = parts.reduce((acc, p) => acc + p.delta, 0);
    const r = await sendToBitrix(
      `task:${taskId}`,
      task.bitrixTaskId,
      total,
      formatConsolidatedTaskDescription(
        parts.map((p) => p.div),
        task.title
      )
    );
    if (r.ok) {
      const deltaById = new Map(parts.map((p) => [p.div.id, p.delta]));
      setDivisions((prev) =>
        prev.map((d) =>
          deltaById.has(d.id)
            ? { ...d, loggedMs: (d.loggedMs || 0) + deltaById.get(d.id)! }
            : d
        )
      );
    }
    return r;
  };

  const handleLogHistoryEntryToBitrix = async (entryId: string) => {
    const entry = history.find((h) => h.id === entryId);
    if (!entry) return { ok: false, message: 'Registro não encontrado.' };
    const bitrixTaskId =
      entry.bitrixTaskId ?? tasks.find((t) => t.id === entry.taskId)?.bitrixTaskId;
    const delta = entry.durationMs - (entry.bitrixLoggedMs || 0);
    const r = await sendToBitrix(
      `hist:${entryId}`,
      bitrixTaskId,
      delta,
      formatDivisionClipboardText(entry.divisionLabel, entry.description, entry.taskTitle),
      entry.completedAt
    );
    if (r.ok && r.sentMs) {
      setHistory((prev) =>
        prev.map((h) =>
          h.id === entryId
            ? {
                ...h,
                bitrixTaskId,
                bitrixLoggedMs: Math.min(h.durationMs, (h.bitrixLoggedMs || 0) + r.sentMs!),
              }
            : h
        )
      );
    }
    return r;
  };

  const bitrixContextValue: BitrixContextValue = {
    status: bitrixStatus,
    openSettings: () => setShowBitrixModal(true),
    linkTask: handleLinkBitrixTask,
    logDivision: handleLogDivisionToBitrix,
    logTask: handleLogTaskToBitrix,
    logHistoryEntry: handleLogHistoryEntryToBitrix,
  };

  const bitrixModalNode = showBitrixModal && (
    <BitrixSettingsModal
      status={bitrixStatus}
      onStatusChange={setBitrixStatus}
      onClose={() => setShowBitrixModal(false)}
    />
  );

  // Divisão em destaque (prioriza a selecionada manualmente no seletor ou a que está rodando)
  const runningDivisions = divisions.filter((d) => d.isRunning);
  const primaryRunningDiv = runningDivisions[0] || null;
  const activeCompactDivision =
    divisions.find((d) => d.id === selectedDivisionId) ||
    primaryRunningDiv ||
    divisions[0] ||
    null;

  const totalActiveMs = divisions.reduce(
    (acc, d) => acc + getDivisionElapsedMs(d, now),
    0
  );
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const todayEntries = history.filter((h) => h.completedAt >= todayStartMs);
  const totalTodayHistoryMs = todayEntries.reduce(
    (acc, h) => acc + h.durationMs,
    0
  );
  const activeTimeSplit = splitDuration(totalActiveMs);
  const historyTimeSplit = splitDuration(totalTodayHistoryMs);

  // Modal de Saída do Modo Multi-Task
  const exitMultiModalNode = showExitMultiModal && (
    <div className="modal-backdrop no-drag">
      <div className="exit-multi-modal">
        <div className="exit-multi-header">
          <div className="exit-multi-title">
            <Zap size={15} className="zap-icon" />
            <span>Sair do Modo Multi-Task</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setShowExitMultiModal(false)}
          >
            <X size={14} />
          </button>
        </div>

        <p className="exit-multi-desc">
          Escolha qual cronômetro deve <strong>continuar ativo</strong> (os demais
          serão pausados) ou desative todos:
        </p>

        <div className="exit-multi-list">
          {runningDivisions.map((div) => {
            const t = tasks.find((task) => task.id === div.taskId);
            const p = projects.find((proj) => proj.id === div.projectId);
            const tm = splitDuration(getDivisionElapsedMs(div, now));
            return (
              <button
                key={div.id}
                type="button"
                className="exit-multi-option-btn"
                onClick={() => handleExitMultiKeepOne(div.id)}
              >
                <div className="option-left">
                  <span
                    className="proj-dot"
                    style={{ backgroundColor: p?.color || '#38bdf8' }}
                  />
                  <div className="option-texts">
                    <span className="option-task">
                      {t?.title || 'Tarefa'}
                      {div.label ? ` • ${div.label}` : ''}
                    </span>
                    <span className="option-proj">{p?.name || 'Projeto'}</span>
                  </div>
                </div>

                <div className="option-right">
                  <span className="option-time">
                    {tm.paddedHours}h {tm.paddedMinutes}m
                  </span>
                  <span className="keep-pill">
                    <Play size={10} /> Manter ativo
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="exit-multi-footer">
          <button
            type="button"
            className="btn-pause-all-multi"
            onClick={handleExitMultiPauseAll}
          >
            <PauseCircle size={14} />
            <span>Desativar / Pausar Todos</span>
          </button>

          <button
            type="button"
            className="btn-cancel-multi"
            onClick={() => setShowExitMultiModal(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  // Modo Mini-Barra Flutuante / Widget Compacto
  if (compactMode) {
    return (
      <BitrixContext.Provider value={bitrixContextValue}>
        <CompactPillView
          projects={projects}
          tasks={tasks}
          divisions={divisions}
          activeDivision={activeCompactDivision}
          now={now}
          alwaysOnTop={alwaysOnTop}
          avoidMouse={avoidMouse}
          autoPauseOthers={autoPauseOthers}
          onToggleAutoPause={handleRequestToggleAutoPause}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onToggleAvoidMouse={handleToggleAvoidMouse}
          onExitCompactMode={() => handleSetCompactMode(false)}
          onTogglePlayDivision={handleTogglePlayDivision}
          onAdjustTimeMs={handleAdjustDivisionTimeMs}
          onUpdateDescription={handleUpdateDivisionDescription}
          onSelectDivision={(id) => setSelectedDivisionId(id)}
          reminderBanner={reminderBanner}
          canResumeFromReminder={!anyRunningNow && divisions.length > 0}
          onResumeFromReminder={handleResumeFromReminder}
          onDismissReminder={() => setReminderBanner(null)}
        />
        {exitMultiModalNode}
      </BitrixContext.Provider>
    );
  }

  return (
    <BitrixContext.Provider value={bitrixContextValue}>
    <div className="app-shell">
      <TitleBar
        alwaysOnTop={alwaysOnTop}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        onEnterCompactMode={() => handleSetCompactMode(true)}
        autoPauseOthers={autoPauseOthers}
        onToggleAutoPause={handleRequestToggleAutoPause}
        runningCount={runningDivisions.length}
        shortcuts={shortcuts}
        bitrixConnected={bitrixStatus.connected}
        onOpenBitrix={() => setShowBitrixModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {reminderBanner && (
        <div className="reminder-toast-banner">
          <div className="reminder-toast-left">
            <Bell size={13} />
            <span>{reminderBanner}</span>
          </div>
          <div className="reminder-toast-actions">
            {!anyRunningNow && divisions.length > 0 && (
              <button
                type="button"
                className="reminder-resume-btn"
                onClick={handleResumeFromReminder}
              >
                <Play size={11} />
                <span>Retomar</span>
              </button>
            )}
            <button
              type="button"
              className="reminder-toast-close"
              onClick={() => setReminderBanner(null)}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Destaque Fixo dos Cronômetros Ativos no Topo (mostra 1 ou todos em Multi-Task) */}
      {runningDivisions.length > 0 && (
        <div className="active-running-stack">
          {runningDivisions.map((rDiv) => {
            const rTask = tasks.find((t) => t.id === rDiv.taskId);
            const rTime = splitDuration(getDivisionElapsedMs(rDiv, now));
            const isThisCopied = bannerCopiedId === rDiv.id;

            return (
              <div key={rDiv.id} className="active-running-banner">
                <div className="banner-left">
                  <span className="pulse-dot" />
                  <div className="banner-info">
                    <span className="banner-task-title">
                      {rTask?.title || 'Tarefa'}
                      {rDiv.label ? ` • ${rDiv.label}` : ''}
                    </span>
                    <span className="banner-desc-preview">
                      {rDiv.description || 'Sem descrição ainda...'}
                    </span>
                  </div>
                </div>

                <div className="banner-right">
                  <span className="banner-hm">
                    {rTime.paddedHours}h {rTime.paddedMinutes}m{' '}
                    <small>{rTime.paddedSeconds}s</small>
                  </span>

                  <button
                    type="button"
                    className="banner-btn copy"
                    onClick={async () => {
                      const txt = formatDivisionClipboardText(
                        rDiv.label,
                        rDiv.description,
                        rTask?.title || ''
                      );
                      const ok = await copyToClipboard(txt);
                      if (ok) {
                        setBannerCopiedId(rDiv.id);
                        setTimeout(() => setBannerCopiedId(null), 1500);
                      }
                    }}
                    title="Copiar descrição deste cronômetro"
                  >
                    {isThisCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>

                  <button
                    type="button"
                    className="banner-btn pause"
                    onClick={() => handleTogglePlayDivision(rDiv.id)}
                    title={`Pausar cronômetro (${shortcuts.togglePlay})`}
                  >
                    <Pause size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de Navegação: Cronômetros Ativos | Histórico do Dia + Botão Novo Projeto */}
      <div className="top-nav-bar">
        <div className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'timers' ? 'active' : ''}`}
            onClick={() => setActiveTab('timers')}
          >
            <Timer size={14} />
            <span>Ativos</span>
            <span className="tab-badge">
              {activeTimeSplit.paddedHours}h{activeTimeSplit.paddedMinutes}m
            </span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} />
            <span>Histórico</span>
            {todayEntries.length > 0 && (
              <span className="tab-badge history-badge">
                {todayEntries.length} ({historyTimeSplit.paddedHours}h
                {historyTimeSplit.paddedMinutes}m)
              </span>
            )}
          </button>
        </div>

        {activeTab === 'timers' && (
          <button
            type="button"
            className="btn-new-project-toggle"
            onClick={() => setShowNewProjectForm((prev) => !prev)}
            title="Criar um novo Projeto / Cliente"
          >
            <FolderPlus size={14} />
            <span>+ Projeto</span>
          </button>
        )}
      </div>

      {/* Formulário Rápido de Novo Projeto */}
      {activeTab === 'timers' && showNewProjectForm && (
        <form className="new-project-bar" onSubmit={handleCreateProject}>
          <div className="color-picker-row">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${newProjectColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewProjectColor(color)}
              />
            ))}
          </div>
          <div className="new-project-input-row">
            <input
              type="text"
              placeholder="Nome do novo Projeto ou Cliente..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="btn-confirm-project"
              disabled={!newProjectName.trim()}
            >
              <Plus size={14} />
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      )}

      {/* Área Principal Rolável */}
      <main className="main-content-scroll">
        {activeTab === 'timers' ? (
          <>
            {projects.length > 0 && (
              <div className="search-filter-bar">
                <Search size={13} className="search-icon" />
                <input
                  type="text"
                  className="search-filter-input"
                  placeholder="Filtrar projetos, tarefas, labels ou descrições..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    title="Limpar filtro"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {projects.length === 0 ? (
              <div className="empty-projects-state">
                <FolderPlus size={36} className="empty-icon" />
                <h3>Comece criando um Projeto</h3>
                <p>
                  Organize suas tarefas por Projeto/Cliente, crie divisões de
                  cronômetro e copie as descrições com 1 clique para o Bitrix24.
                </p>
                <button
                  type="button"
                  className="btn-primary-md"
                  onClick={() => setShowNewProjectForm(true)}
                >
                  + Criar Primeiro Projeto
                </button>
              </div>
            ) : (
              <div className="projects-stack">
                {projects
                  .map((project) => {
                    const q = searchQuery.trim().toLowerCase();
                    const allProjTasks = tasks.filter(
                      (t) => t.projectId === project.id
                    );
                    const allProjDivs = divisions.filter(
                      (d) => d.projectId === project.id
                    );

                    if (!q) {
                      return { project, projectTasks: allProjTasks, projectDivisions: allProjDivs };
                    }

                    const projMatch = project.name.toLowerCase().includes(q);
                    if (projMatch) {
                      return { project, projectTasks: allProjTasks, projectDivisions: allProjDivs };
                    }

                    const filteredTasks = allProjTasks.filter((t) => {
                      if (t.title.toLowerCase().includes(q)) return true;
                      const tDivs = allProjDivs.filter((d) => d.taskId === t.id);
                      return tDivs.some(
                        (d) =>
                          d.label.toLowerCase().includes(q) ||
                          d.description.toLowerCase().includes(q)
                      );
                    });

                    if (filteredTasks.length === 0) return null;
                    return {
                      project: { ...project, isExpanded: true },
                      projectTasks: filteredTasks,
                      projectDivisions: allProjDivs,
                    };
                  })
                  .filter(Boolean)
                  .map((item) => {
                    const { project, projectTasks, projectDivisions } = item!;
                    return (
                      <ProjectSection
                        key={project.id}
                        project={project}
                        tasks={projectTasks}
                        divisions={projectDivisions}
                        now={now}
                        presetLabels={presetLabels}
                        onUpdatePresetLabels={setPresetLabels}
                        onToggleExpandProject={handleToggleExpandProject}
                        onUpdateProjectName={handleUpdateProjectName}
                        onDeleteProject={handleDeleteProject}
                        onCreateTask={handleCreateTask}
                        onToggleExpandTask={handleToggleExpandTask}
                        onUpdateTaskTitle={handleUpdateTaskTitle}
                        onDeleteTask={handleDeleteTask}
                        onMoveTask={handleMoveTask}
                        onAddDivision={handleAddDivision}
                        onTogglePlayDivision={handleTogglePlayDivision}
                        onUpdateDivisionLabel={handleUpdateDivisionLabel}
                        onUpdateDivisionDescription={handleUpdateDivisionDescription}
                        onAdjustDivisionTimeMs={handleAdjustDivisionTimeMs}
                        onSetDivisionManualTime={handleSetDivisionManualTime}
                        onCompleteDivision={handleCompleteDivision}
                        onDeleteDivision={handleDeleteDivision}
                        onCompleteAllTaskDivisions={handleCompleteAllTaskDivisions}
                      />
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <HistoryTab
            entries={history}
            taskLinks={Object.fromEntries(
              tasks.map((t) => [t.id, t.bitrixTaskId])
            )}
            onRestoreEntry={handleRestoreHistoryEntry}
            onUpdateEntry={handleUpdateHistoryEntry}
            onDeleteEntry={handleDeleteHistoryEntry}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {exitMultiModalNode}
      {bitrixModalNode}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          alwaysOnTop={alwaysOnTop}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          autoLaunch={autoLaunch}
          onToggleAutoLaunch={handleToggleAutoLaunch}
          avoidMouse={avoidMouse}
          onToggleAvoidMouse={handleToggleAvoidMouse}
          opacity={opacity}
          onChangeOpacity={handleChangeOpacity}
          theme={theme}
          onOpenThemeModal={() => setShowThemeModal(true)}
          bitrixRounding={bitrixRounding}
          onChangeBitrixRounding={setBitrixRounding}
          onExportBackup={() => {
            const payload = {
              exportedAt: new Date().toISOString(),
              projects,
              tasks,
              divisions,
              history,
              presetLabels,
              shortcuts,
              reminders,
              theme,
              bitrixRounding,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `breathetime-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportBackup={async (file) => {
            try {
              const text = await file.text();
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed.projects)) setProjects(parsed.projects);
              if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
              if (Array.isArray(parsed.divisions)) setDivisions(parsed.divisions);
              if (Array.isArray(parsed.history)) setHistory(parsed.history);
              if (Array.isArray(parsed.presetLabels)) setPresetLabels(parsed.presetLabels);
              if (parsed.theme) setTheme(parsed.theme);
              if (parsed.bitrixRounding) setBitrixRounding(parsed.bitrixRounding);
              setReminderBanner('Backup importado com sucesso!');
            } catch {
              setReminderBanner('Falha ao importar backup: arquivo JSON inválido.');
            }
          }}
          reminders={reminders}
          onUpdateReminders={(next) => {
            setReminders(next);
            if (
              (next.idleMinutes > 0 || next.breakMinutes > 0) &&
              'Notification' in window &&
              Notification.permission === 'default'
            ) {
              Notification.requestPermission().catch(() => undefined);
            }
          }}
          shortcuts={shortcuts}
          onUpdateShortcuts={handleUpdateShortcuts}
        />
      )}
      {showThemeModal && (
        <ThemeModal
          theme={theme}
          onChangeTheme={setTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
    </BitrixContext.Provider>
  );
};
