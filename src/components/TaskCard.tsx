import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Copy,
  Check,
  CheckCheck,
  Trash2,
  Link2,
} from 'lucide-react';
import { TaskItem, TimerDivision } from '../types/timer';
import { useBitrix } from '../bitrix/BitrixContext';
import { BitrixLogButton } from './BitrixLogButton';
import { BitrixTaskPicker } from './BitrixTaskPicker';
import {
  getDivisionElapsedMs,
  splitDuration,
  formatConsolidatedTaskDescription,
  copyToClipboard,
} from '../utils/timeFormat';
import { DivisionRow } from './DivisionRow';

interface TaskCardProps {
  task: TaskItem;
  divisions: TimerDivision[];
  now: number;
  presetLabels: string[];
  onUpdatePresetLabels: (nextPresets: string[]) => void;
  onToggleExpandTask: (taskId: string) => void;
  onUpdateTaskTitle: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddDivision: (taskId: string) => void;
  onTogglePlayDivision: (divisionId: string) => void;
  onUpdateDivisionLabel: (divisionId: string, label: string) => void;
  onUpdateDivisionDescription: (divisionId: string, description: string) => void;
  onAdjustDivisionTimeMs: (divisionId: string, deltaMs: number) => void;
  onSetDivisionManualTime: (divisionId: string, hours: number, minutes: number) => void;
  onCompleteDivision: (divisionId: string) => void;
  onDeleteDivision: (divisionId: string) => void;
  onCompleteAllTaskDivisions: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  divisions,
  now,
  presetLabels,
  onUpdatePresetLabels,
  onToggleExpandTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onAddDivision,
  onTogglePlayDivision,
  onUpdateDivisionLabel,
  onUpdateDivisionDescription,
  onAdjustDivisionTimeMs,
  onSetDivisionManualTime,
  onCompleteDivision,
  onDeleteDivision,
  onCompleteAllTaskDivisions,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const bitrix = useBitrix();

  const totalTaskMs = divisions.reduce(
    (acc, div) => acc + getDivisionElapsedMs(div, now),
    0
  );
  const totalTime = splitDuration(totalTaskMs);
  const anyRunning = divisions.some((d) => d.isRunning);

  const handleCopyAllTaskDescriptions = async () => {
    const consolidated = formatConsolidatedTaskDescription(divisions, task.title);
    const ok = await copyToClipboard(consolidated);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    }
  };

  return (
    <div className={`task-card ${anyRunning ? 'task-running' : ''}`}>
      {/* Cabeçalho da Tarefa */}
      <div className="task-card-header">
        <button
          type="button"
          className="collapse-btn"
          onClick={() => onToggleExpandTask(task.id)}
          title={task.isExpanded ? 'Recolher tarefa' : 'Expandir tarefa'}
        >
          {task.isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        {anyRunning && <span className="pulse-dot task-dot" title="Cronômetro rodando" />}

        <input
          type="text"
          className="task-title-input"
          value={task.title}
          onChange={(e) => onUpdateTaskTitle(task.id, e.target.value)}
          placeholder="Nome da Tarefa do Bitrix24..."
        />

        <button
          type="button"
          className={`icon-action-btn bitrix-link-btn ${task.bitrixTaskId ? 'linked' : ''}`}
          onClick={() => setShowPicker(true)}
          title={
            task.bitrixTaskId
              ? `Vinculada à tarefa #${task.bitrixTaskId} do Bitrix24 (clique para alterar)`
              : 'Vincular a uma tarefa do Bitrix24'
          }
        >
          <Link2 size={13} />
          {task.bitrixTaskId && <span className="bitrix-id-tag">#{task.bitrixTaskId}</span>}
        </button>

        {/* Total Somado da Tarefa (destacado em Horas e Minutos para o Bitrix24) */}
        <div
          className="task-total-badge"
          title={`Tempo total somado da tarefa: ${totalTime.hours}h ${totalTime.minutes}m ${totalTime.seconds}s`}
        >
          <span className="task-hm">
            {totalTime.paddedHours}h {totalTime.paddedMinutes}m
          </span>
          <span className="task-sec">{totalTime.paddedSeconds}s</span>
        </div>

        <button
          type="button"
          className="icon-action-btn danger"
          onClick={() => onDeleteTask(task.id)}
          title="Excluir tarefa"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Barra de Ações da Tarefa: + Divisão | Copiar Consolidado (quando > 1 divisão) | Concluir Tarefa */}
      {task.isExpanded && (
        <>
          <div className="task-SubToolbar">
            <button
              type="button"
              className="add-division-btn"
              onClick={() => onAddDivision(task.id)}
              title="Criar mais uma divisão de cronômetro para esta mesma tarefa"
            >
              <Plus size={13} />
              <span>Dividir Cronômetro ({divisions.length})</span>
            </button>

            <div className="task-consolidated-actions">
              {divisions.length > 1 && (
                <button
                  type="button"
                  className={`task-copy-all-btn ${copiedAll ? 'copied' : ''}`}
                  onClick={handleCopyAllTaskDescriptions}
                  title="Copiar todas as descrições das divisões juntas para fazer um lançamento único no Bitrix24"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                  <span>
                    {copiedAll ? 'Descrições Copiadas!' : 'Copiar Tudo Junto'}
                  </span>
                </button>
              )}

              <BitrixLogButton
                label="Lançar no Bitrix"
                onLog={() => bitrix.logTask(task.id)}
                disabledReason={
                  !bitrix.status.connected
                    ? 'Conecte-se ao Bitrix24 (ícone de nuvem na barra de título)'
                    : !task.bitrixTaskId
                      ? 'Vincule esta tarefa a uma tarefa do Bitrix24 (ícone de link)'
                      : undefined
                }
              />

              {divisions.length > 1 && totalTaskMs > 0 && (
                <button
                  type="button"
                  className="task-complete-all-btn"
                  onClick={() => onCompleteAllTaskDivisions(task.id)}
                  title="Concluir e zerar todas as divisões desta tarefa (envia para o Histórico do Dia)"
                >
                  <CheckCheck size={13} />
                  <span>Concluir Todas</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de Divisões de Cronômetro da Tarefa */}
          <div className="divisions-list">
            {divisions.map((div) => (
              <DivisionRow
                key={div.id}
                division={div}
                taskTitle={task.title}
                taskBitrixId={task.bitrixTaskId}
                isOnlyDivision={divisions.length === 1}
                now={now}
                presetLabels={presetLabels}
                onUpdatePresetLabels={onUpdatePresetLabels}
                onTogglePlay={onTogglePlayDivision}
                onUpdateLabel={onUpdateDivisionLabel}
                onUpdateDescription={onUpdateDivisionDescription}
                onAdjustTimeMs={onAdjustDivisionTimeMs}
                onSetManualTime={onSetDivisionManualTime}
                onCompleteAndReset={onCompleteDivision}
                onDeleteDivision={onDeleteDivision}
              />
            ))}
          </div>
        </>
      )}
      {showPicker && (
        <BitrixTaskPicker
          currentId={task.bitrixTaskId}
          onSelect={(id) => {
            bitrix.linkTask(task.id, id);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};
