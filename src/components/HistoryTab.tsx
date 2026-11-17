import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { CompletedLogEntry } from '../types/timer';
import { useBitrix } from '../bitrix/BitrixContext';
import { BitrixLogButton } from './BitrixLogButton';
import {
  splitDuration,
  formatDivisionClipboardText,
  copyToClipboard,
} from '../utils/timeFormat';

interface HistoryTabProps {
  entries: CompletedLogEntry[];
  onRestoreEntry: (entry: CompletedLogEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onClearHistory: () => void;
  /** taskId local → ID da tarefa Bitrix vinculada (para entradas antigas sem vínculo) */
  taskLinks: Record<string, number | undefined>;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  taskLinks,
  entries,
  onRestoreEntry,
  onDeleteEntry,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bitrix = useBitrix();

  const totalDayMs = entries.reduce((acc, item) => acc + item.durationMs, 0);
  const totalDay = splitDuration(totalDayMs);

  const handleCopyEntry = async (entry: CompletedLogEntry) => {
    const text = formatDivisionClipboardText(
      entry.divisionLabel,
      entry.description,
      entry.taskTitle
    );
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <div className="history-tab-container">
      {/* Resumo Total do Histórico */}
      <div className="history-summary-banner">
        <div className="history-summary-left">
          <CheckCircle2 size={18} className="summary-icon" />
          <div>
            <div className="summary-title">Total Concluído / Lançado</div>
            <div className="summary-subtitle">
              {entries.length} registro{entries.length !== 1 ? 's' : ''} salvo{entries.length !== 1 ? 's' : ''} no histórico
            </div>
          </div>
        </div>

        <div className="history-summary-right">
          <span className="summary-total-hm">
            {totalDay.paddedHours}h {totalDay.paddedMinutes}m
          </span>
          {entries.length > 0 && (
            <button
              type="button"
              className="btn-clear-history"
              onClick={onClearHistory}
              title="Limpar todo o histórico"
            >
              Limpar tudo
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="history-empty-state">
          <Clock size={32} className="empty-icon" />
          <h4>Nenhum tempo concluído ainda</h4>
          <p>
            Quando você lançar um tempo no Bitrix24 e clicar em{' '}
            <strong>Concluir</strong> no cronômetro, ele vem para cá para você
            não perder a descrição nem o controle das horas trabalhadas no dia.
          </p>
        </div>
      ) : (
        <div className="history-entries-list">
          {entries.map((entry) => {
            const dur = splitDuration(entry.durationMs);
            const completedTimeStr = new Date(entry.completedAt).toLocaleTimeString(
              'pt-BR',
              { hour: '2-digit', minute: '2-digit' }
            );
            const isCopied = copiedId === entry.id;
            const linkedId = entry.bitrixTaskId ?? taskLinks[entry.taskId];
            const fullyLogged =
              (entry.bitrixLoggedMs || 0) >= entry.durationMs - 500;
            const formattedCopyText = formatDivisionClipboardText(
              entry.divisionLabel,
              entry.description,
              entry.taskTitle
            );

            return (
              <div key={entry.id} className="history-entry-card">
                <div className="history-entry-header">
                  <div className="history-entry-meta">
                    <span
                      className="project-badge"
                      style={{
                        backgroundColor: `${entry.projectColor}22`,
                        color: entry.projectColor,
                        borderColor: `${entry.projectColor}55`,
                      }}
                    >
                      {entry.projectName}
                    </span>
                    <span className="history-task-name">{entry.taskTitle}</span>
                    {entry.divisionLabel && (
                      <span className="history-division-pill">
                        {entry.divisionLabel}
                      </span>
                    )}
                  </div>
                  <span className="history-timestamp" title="Horário em que foi concluído">
                    às {completedTimeStr}
                  </span>
                </div>

                <div className="history-entry-body">
                  <div className="history-entry-hm">
                    <span className="hm-box">
                      <strong>{dur.paddedHours}</strong>h
                    </span>
                    <span className="hm-box">
                      <strong>{dur.paddedMinutes}</strong>m
                    </span>
                    <span className="sec-small">{dur.paddedSeconds}s</span>
                  </div>

                  <div className="history-entry-desc">
                    {formattedCopyText || <em>Sem descrição informada</em>}
                  </div>
                </div>

                <div className="history-entry-actions">
                  <button
                    type="button"
                    className={`history-btn copy ${isCopied ? 'copied' : ''}`}
                    onClick={() => handleCopyEntry(entry)}
                    title="Copiar descrição novamente para o clipboard"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isCopied ? 'Copiado!' : 'Copiar Descrição'}</span>
                  </button>

                  <BitrixLogButton
                    className="history-btn"
                    label={fullyLogged ? 'Lançado' : 'Lançar no Bitrix'}
                    onLog={() => bitrix.logHistoryEntry(entry.id)}
                    disabledReason={
                      fullyLogged
                        ? 'Este tempo já foi lançado no Bitrix24'
                        : !bitrix.status.connected
                          ? 'Conecte-se ao Bitrix24 (ícone de nuvem na barra de título)'
                          : !linkedId
                            ? 'Restaure e vincule a tarefa ao Bitrix24 para lançar'
                            : undefined
                    }
                  />

                  <button
                    type="button"
                    className="history-btn restore"
                    onClick={() => onRestoreEntry(entry)}
                    title="Devolver este tempo e descrição para a lista de cronômetros ativos"
                  >
                    <RotateCcw size={13} />
                    <span>Restaurar</span>
                  </button>

                  <button
                    type="button"
                    className="history-btn delete"
                    onClick={() => onDeleteEntry(entry.id)}
                    title="Remover do histórico"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
