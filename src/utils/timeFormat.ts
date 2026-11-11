import { TimerDivision } from '../types/timer';

export interface SplitTime {
  hours: number;
  minutes: number;
  seconds: number;
  paddedHours: string;
  paddedMinutes: string;
  paddedSeconds: string;
  formattedHMS: string;
}

export function getDivisionElapsedMs(division: TimerDivision, now: number = Date.now()): number {
  if (division.isRunning && division.startedAt !== null) {
    return Math.max(0, division.accumulatedMs + (now - division.startedAt));
  }
  return Math.max(0, division.accumulatedMs);
}

export function splitDuration(ms: number): SplitTime {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    paddedHours,
    paddedMinutes,
    paddedSeconds,
    formattedHMS: `${paddedHours}:${paddedMinutes}:${paddedSeconds}`,
  };
}

/**
 * Regra alinhada:
 * - Se a divisão tiver um nome (ex: 'Reunião'), copia '[Reunião] Descrição que digitei'
 * - Se não tiver nome extra, copia só a Descrição pura
 */
export function formatDivisionClipboardText(
  label: string,
  description: string,
  fallbackTaskTitle: string = ''
): string {
  const cleanLabel = label.trim();
  const cleanDesc = description.trim();

  if (cleanLabel && cleanDesc) {
    return `[${cleanLabel}] ${cleanDesc}`;
  }
  if (cleanLabel && !cleanDesc) {
    return `[${cleanLabel}]`;
  }
  if (!cleanLabel && cleanDesc) {
    return cleanDesc;
  }
  return fallbackTaskTitle.trim();
}

/**
 * Une todas as descrições das divisões de uma Tarefa para lançamento consolidado no Bitrix24
 */
export function formatConsolidatedTaskDescription(
  divisions: TimerDivision[],
  taskTitle: string
): string {
  const lines: string[] = [];

  for (const div of divisions) {
    const cleanLabel = div.label.trim();
    const cleanDesc = div.description.trim();

    if (cleanLabel && cleanDesc) {
      lines.push(`[${cleanLabel}] ${cleanDesc}`);
    } else if (cleanLabel && !cleanDesc) {
      lines.push(`[${cleanLabel}]`);
    } else if (!cleanLabel && cleanDesc) {
      lines.push(cleanDesc);
    }
  }

  if (lines.length === 0) {
    return taskTitle.trim();
  }

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
