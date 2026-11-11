import React, { useState } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Copy,
  Check,
  Pin,
  PinOff,
  Plus,
  GripHorizontal,
} from 'lucide-react';
import { Project, TaskItem, TimerDivision } from '../types/timer';
import {
  getDivisionElapsedMs,
  splitDuration,
  formatDivisionClipboardText,
  copyToClipboard,
} from '../utils/timeFormat';

interface CompactPillViewProps {
  projects: Project[];
  tasks: TaskItem[];
  divisions: TimerDivision[];
  activeDivision: TimerDivision | null;
  now: number;
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  onExitCompactMode: () => void;
  onTogglePlayDivision: (divisionId: string) => void;
  onAdjustTimeMs: (divisionId: string, deltaMs: number) => void;
  onUpdateDescription: (divisionId: string, description: string) => void;
  onSelectDivision: (divisionId: string) => void;
}

export const CompactPillView: React.FC<CompactPillViewProps> = ({
  projects,
  tasks,
  divisions,
  activeDivision,
  now,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  onExitCompactMode,
  onTogglePlayDivision,
  onAdjustTimeMs,
  onUpdateDescription,
  onSelectDivision,
}) => {
  const [copied, setCopied] = useState(false);

  const currentTask = activeDivision
    ? tasks.find((t) => t.id === activeDivision.taskId)
    : undefined;
  const currentProject = activeDivision
    ? projects.find((p) => p.id === activeDivision.projectId)
    : undefined;

  const elapsedMs = activeDivision ? getDivisionElapsedMs(activeDivision, now) : 0;
  const time = splitDuration(elapsedMs);

  const handleCopy = async () => {
    if (!activeDivision) return;
    const text = formatDivisionClipboardText(
      activeDivision.label,
      activeDivision.description,
      currentTask?.title || ''
    );
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="compact-pill-container">
      {/* Top micro bar */}
      <div className="compact-pill-header">
        <div className="compact-drag-handle" title="Arraste aqui para mover a janela">
          <GripHorizontal size={14} />
        </div>

        <div className="compact-breadcrumb no-drag">
          {divisions.length > 0 ? (
            <select
              className="compact-task-select no-drag"
              value={activeDivision?.id || ''}
              onChange={(e) => onSelectDivision(e.target.value)}
              title="Trocar projeto / tarefa / divisão ativa"
            >
              {projects.map((proj) => {
                const projDivs = divisions.filter((d) => d.projectId === proj.id);
                if (projDivs.length === 0) return null;
                return (
                  <optgroup key={proj.id} label={`📁 ${proj.name}`}>
                    {projDivs.map((div) => {
                      const t = tasks.find((task) => task.id === div.taskId);
                      const divTime = splitDuration(getDivisionElapsedMs(div, now));
                      const labelPart = div.label ? ` • ${div.label}` : '';
                      return (
                        <option key={div.id} value={div.id}>
                          {div.isRunning ? '🟢 ' : '⏸ '}
                          {t?.title || 'Tarefa'}
                          {labelPart} ({divTime.paddedHours}h{divTime.paddedMinutes}m)
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          ) : (
            <span className="compact-empty-label">Nenhum cronômetro criado</span>
          )}
        </div>

        <div className="compact-header-Ctrls no-drag">
          <button
            type="button"
            className={`icon-btn tiny ${alwaysOnTop ? 'pinned' : ''}`}
            onClick={onToggleAlwaysOnTop}
            title={alwaysOnTop ? 'Sempre no Topo ATIVO' : 'Fixar Sempre no Topo'}
          >
            {alwaysOnTop ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button
            type="button"
            className="icon-btn tiny expand-btn"
            onClick={onExitCompactMode}
            title="Expandir para Janela Completa"
          >
            <Maximize2 size={12} />
            <span>Expandir</span>
          </button>
        </div>
      </div>

      {/* Main row: Play/Pause + Time + Quick Description + 1-Click Copy */}
      {activeDivision ? (
        <div className="compact-pill-body no-drag">
          <button
            type="button"
            className={`play-btn compact ${activeDivision.isRunning ? 'running' : ''}`}
            onClick={() => onTogglePlayDivision(activeDivision.id)}
            title={activeDivision.isRunning ? 'Pausar' : 'Iniciar'}
          >
            {activeDivision.isRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div
            className="compact-time-Readout"
            title={`Projeto: ${currentProject?.name || '-'} | Horas: ${time.hours}h | Minutos: ${time.minutes}m`}
          >
            <span className="hm-unit">
              <strong>{time.paddedHours}</strong>
              <small>h</small>
            </span>
            <span className="hm-unit">
              <strong>{time.paddedMinutes}</strong>
              <small>m</small>
            </span>
            <span className="sec-unit">{time.paddedSeconds}s</span>
          </div>

          <button
            type="button"
            className="micro-adj-btn"
            onClick={() => onAdjustTimeMs(activeDivision.id, 5 * 60 * 1000)}
            title="Adicionar +5 minutos"
          >
            <Plus size={10} />5m
          </button>

          <input
            type="text"
            className="compact-desc-input"
            placeholder={
              activeDivision.label
                ? `Descrição (${activeDivision.label})...`
                : 'Descrição do que está fazendo...'
            }
            value={activeDivision.description}
            onChange={(e) => onUpdateDescription(activeDivision.id, e.target.value)}
          />

          <button
            type="button"
            className={`copy-btn compact ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copiar descrição com 1 clique para colar no Bitrix24"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      ) : (
        <div className="compact-pill-empty no-drag">
          <span>Expanda a janela para criar sua primeira tarefa.</span>
          <button type="button" className="btn-primary-sm" onClick={onExitCompactMode}>
            Abrir Painel
          </button>
        </div>
      )}
    </div>
  );
};
