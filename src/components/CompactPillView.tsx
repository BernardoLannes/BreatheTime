import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Copy,
  Check,
  Pin,
  PinOff,
  Plus,
  Timer,
  Minus,
  Layers,
  Zap,
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
  autoPauseOthers: boolean;
  onToggleAutoPause: () => void;
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
  autoPauseOthers,
  onToggleAutoPause,
  onToggleAlwaysOnTop,
  onExitCompactMode,
  onTogglePlayDivision,
  onAdjustTimeMs,
  onUpdateDescription,
  onSelectDivision,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lista quais divisões devem aparecer no modo compacto:
  // - Todas as divisões que estão rodando no momento (suporte total a Multi-Task)
  // - Mais a divisão selecionada no dropdown (caso esteja pausada e você queira vê-la/dar play)
  const displayedDivisions = useMemo(() => {
    const running = divisions.filter((d) => d.isRunning);
    if (running.length === 0) {
      return activeDivision ? [activeDivision] : [];
    }
    if (activeDivision && !activeDivision.isRunning) {
      return [activeDivision, ...running];
    }
    return running;
  }, [divisions, activeDivision]);

  // Garante altura confortável quando há múltiplos cronômetros visíveis no modo compacto
  useEffect(() => {
    const count = Math.max(1, displayedDivisions.length);
    const neededHeight = 50 + count * 108;
    window.electronAPI?.ensureCompactHeight(neededHeight);
  }, [displayedDivisions.length]);

  const handleCopy = async (div: TimerDivision, taskTitle: string) => {
    const text = formatDivisionClipboardText(
      div.label,
      div.description,
      taskTitle
    );
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(div.id);
      setTimeout(() => setCopiedId(null), 1600);
    }
  };

  return (
    <div className="compact-widget-shell">
      {/* Barra Superior Arrastável */}
      <header className="compact-widget-header">
        <div className="compact-brand">
          <div
            className={`compact-logo ${
              divisions.some((d) => d.isRunning) ? 'running' : ''
            }`}
          >
            <Timer size={13} />
          </div>
        </div>

        {/* Seletor de Tarefa / Divisão */}
        <div className="compact-selector-wrap no-drag">
          {divisions.length > 0 ? (
            <select
              className="compact-select-modern"
              value={activeDivision?.id || ''}
              onChange={(e) => onSelectDivision(e.target.value)}
              title="Selecionar projeto / tarefa / divisão"
            >
              {projects.map((proj) => {
                const projDivs = divisions.filter(
                  (d) => d.projectId === proj.id
                );
                if (projDivs.length === 0) return null;
                return (
                  <optgroup key={proj.id} label={`📁 ${proj.name}`}>
                    {projDivs.map((div) => {
                      const t = tasks.find((task) => task.id === div.taskId);
                      const divTime = splitDuration(
                        getDivisionElapsedMs(div, now)
                      );
                      const labelPart = div.label ? ` • ${div.label}` : '';
                      return (
                        <option key={div.id} value={div.id}>
                          {div.isRunning ? '🟢 ' : '⏸ '}
                          {t?.title || 'Tarefa'}
                          {labelPart} ({divTime.paddedHours}h
                          {divTime.paddedMinutes}m)
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          ) : (
            <span className="compact-empty-label">Sem cronômetros</span>
          )}
        </div>

        {/* Controles da Janela Compacta */}
        <div className="compact-header-actions no-drag">
          <button
            type="button"
            className={`icon-btn tiny ${
              autoPauseOthers ? 'active-subtle' : 'multi-active'
            }`}
            onClick={onToggleAutoPause}
            title={
              autoPauseOthers
                ? 'Modo 1x (Auto-Pause ativo) — clique para ativar Multi-Task'
                : 'Modo Multi-Task ativo — clique para voltar ao modo 1x'
            }
          >
            {autoPauseOthers ? <Zap size={12} /> : <Layers size={12} />}
            <span>{autoPauseOthers ? '1x' : 'Multi'}</span>
          </button>

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
            className="icon-btn tiny expand-pill-btn"
            onClick={onExitCompactMode}
            title="Expandir para Janela Completa"
          >
            <Maximize2 size={12} />
            <span>Expandir</span>
          </button>

          <button
            type="button"
            className="icon-btn tiny"
            onClick={() => window.electronAPI?.minimize()}
            title="Minimizar"
          >
            <Minus size={12} />
          </button>
        </div>
      </header>

      {/* Lista de Cronômetros no Modo Compacto (1 ou vários em Multi-Task) */}
      <div className="compact-cards-list no-drag">
        {displayedDivisions.length > 0 ? (
          displayedDivisions.map((div) => {
            const task = tasks.find((t) => t.id === div.taskId);
            const project = projects.find((p) => p.id === div.projectId);
            const elapsedMs = getDivisionElapsedMs(div, now);
            const time = splitDuration(elapsedMs);
            const isCopied = copiedId === div.id;

            return (
              <div
                key={div.id}
                className={`compact-timer-card ${
                  div.isRunning ? 'is-running' : ''
                }`}
              >
                {/* Linha 1: Contexto da Tarefa + Visor de Tempo + Play/Pause */}
                <div className="compact-card-top">
                  <div className="compact-card-meta">
                    <span
                      className="compact-proj-dot"
                      style={{ backgroundColor: project?.color || '#38bdf8' }}
                      title={project?.name || 'Projeto'}
                    />
                    <span className="compact-task-title" title={task?.title}>
                      {task?.title || 'Tarefa'}
                    </span>
                    {div.label && (
                      <span className="compact-div-badge">{div.label}</span>
                    )}
                  </div>

                  <div className="compact-card-controls">
                    <div className="compact-digital-clock">
                      <span className="clock-hm">
                        <strong>{time.paddedHours}</strong>
                        <small>h</small>
                      </span>
                      <span className="clock-hm">
                        <strong>{time.paddedMinutes}</strong>
                        <small>m</small>
                      </span>
                      <span className="clock-sec">{time.paddedSeconds}s</span>
                    </div>

                    <button
                      type="button"
                      className="compact-plus5-btn"
                      onClick={() => onAdjustTimeMs(div.id, 5 * 60 * 1000)}
                      title="Adicionar +5 minutos"
                    >
                      <Plus size={10} />
                      5m
                    </button>

                    <button
                      type="button"
                      className={`compact-play-btn ${
                        div.isRunning ? 'running' : ''
                      }`}
                      onClick={() => onTogglePlayDivision(div.id)}
                      title={div.isRunning ? 'Pausar' : 'Iniciar'}
                    >
                      {div.isRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </div>

                {/* Linha 2: Input Rápido de Descrição + Botão Copiar 1 Clique */}
                <div className="compact-card-bottom">
                  <input
                    type="text"
                    className="compact-desc-field"
                    placeholder={
                      div.label
                        ? `Descrição para [${div.label}]...`
                        : 'Digite a descrição do que está fazendo...'
                    }
                    value={div.description}
                    onChange={(e) =>
                      onUpdateDescription(div.id, e.target.value)
                    }
                  />

                  <button
                    type="button"
                    className={`compact-copy-btn ${isCopied ? 'copied' : ''}`}
                    onClick={() => handleCopy(div, task?.title || '')}
                    title="Copiar descrição com 1 clique para o Bitrix24"
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="compact-pill-empty">
            <span>Expanda a janela para criar sua primeira tarefa.</span>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={onExitCompactMode}
            >
              Abrir Painel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
