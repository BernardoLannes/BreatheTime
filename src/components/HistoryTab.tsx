import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  Calendar,
  Edit3,
  Upload,
  Loader2,
} from 'lucide-react';
import { CompletedLogEntry } from '../types/timer';
import { useBitrix } from '../bitrix/BitrixContext';
import { BitrixLogButton } from './BitrixLogButton';
import {
  splitDuration,
  formatDivisionClipboardText,
  copyToClipboard,
} from '../utils/timeFormat';

type DateFilterMode = 'today' | 'yesterday' | 'week' | 'all' | 'custom';

interface HistoryTabProps {
  entries: CompletedLogEntry[];
  onRestoreEntry: (entry: CompletedLogEntry) => void;
  onUpdateEntry: (
    entryId: string,
    patch: Partial<Pick<CompletedLogEntry, 'startedAt' | 'completedAt' | 'description'>>
  ) => void;
  onDeleteEntry: (entryId: string) => void;
  onClearHistory: () => void;
  /** taskId local → ID da tarefa Bitrix vinculada (para entradas antigas sem vínculo) */
  taskLinks: Record<string, number | undefined>;
}

function getLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDayGroupTitle(dateKey: string, todayKey: string, yesterdayKey: string): string {
  const [y, m, d] = dateKey.split('-');
  const brDate = `${d}/${m}/${y}`;
  if (dateKey === todayKey) return `Hoje — ${brDate}`;
  if (dateKey === yesterdayKey) return `Ontem — ${brDate}`;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${weekday.replace('.', '')}, ${brDate}`;
}

function toInputDateTimeValues(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  taskLinks,
  entries,
  onRestoreEntry,
  onUpdateEntry,
  onDeleteEntry,
  onClearHistory,
}) => {
  const [filterMode, setFilterMode] = useState<DateFilterMode>('today');
  const [customDate, setCustomDate] = useState<string>(() =>
    getLocalDateKey(Date.now())
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateStr, setEditDateStr] = useState('');
  const [editTimeStr, setEditTimeStr] = useState('');
  const [batchLogging, setBatchLogging] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  const bitrix = useBitrix();

  const todayKey = getLocalDateKey(Date.now());
  const yesterdayKey = getLocalDateKey(Date.now() - 24 * 60 * 60 * 1000);
  const weekCutoffTs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() - 6 * 24 * 60 * 60 * 1000;
  }, []);

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.completedAt - a.completedAt);
    if (filterMode === 'all') return sorted;
    if (filterMode === 'today') {
      return sorted.filter((e) => getLocalDateKey(e.completedAt) === todayKey);
    }
    if (filterMode === 'yesterday') {
      return sorted.filter(
        (e) => getLocalDateKey(e.completedAt) === yesterdayKey
      );
    }
    if (filterMode === 'week') {
      return sorted.filter((e) => e.completedAt >= weekCutoffTs);
    }
    return sorted.filter((e) => getLocalDateKey(e.completedAt) === customDate);
  }, [entries, filterMode, todayKey, yesterdayKey, weekCutoffTs, customDate]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, CompletedLogEntry[]>();
    for (const entry of filteredEntries) {
      const key = getLocalDateKey(entry.completedAt);
      const list = groups.get(key) || [];
      list.push(entry);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const totalFilteredMs = filteredEntries.reduce(
    (acc, item) => acc + item.durationMs,
    0
  );
  const totalFiltered = splitDuration(totalFilteredMs);

  const projectSummary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; totalMs: number; count: number }
    >();
    for (const e of filteredEntries) {
      const existing = map.get(e.projectName);
      if (existing) {
        existing.totalMs += e.durationMs;
        existing.count += 1;
      } else {
        map.set(e.projectName, {
          name: e.projectName,
          color: e.projectColor,
          totalMs: e.durationMs,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.totalMs - a.totalMs);
  }, [filteredEntries]);

  const pendingBitrixEntries = useMemo(() => {
    return filteredEntries.filter((e) => {
      const bId = e.bitrixTaskId ?? taskLinks[e.taskId];
      const unloggedMs = e.durationMs - (e.bitrixLoggedMs || 0);
      return Boolean(bId) && Math.round(unloggedMs / 1000) > 0;
    });
  }, [filteredEntries, taskLinks]);

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

  const handleCopySummary = async () => {
    if (filteredEntries.length === 0) return;
    const filterTitle =
      filterMode === 'today'
        ? 'Hoje'
        : filterMode === 'yesterday'
          ? 'Ontem'
          : filterMode === 'week'
            ? 'Últimos 7 dias'
            : filterMode === 'custom'
              ? customDate.split('-').reverse().join('/')
              : 'Todo o Histórico';

    const lines: string[] = [
      `Resumo BreatheTime (${filterTitle}) — Total: ${totalFiltered.paddedHours}h ${totalFiltered.paddedMinutes}m`,
      '',
      'Por Projeto:',
      ...projectSummary.map((p) => {
        const d = splitDuration(p.totalMs);
        return `• ${p.name}: ${d.paddedHours}h ${d.paddedMinutes}m (${p.count} registro${p.count > 1 ? 's' : ''})`;
      }),
      '',
      'Detalhamento:',
      ...filteredEntries.map((e) => {
        const d = splitDuration(e.durationMs);
        const dt = new Date(e.completedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const desc = formatDivisionClipboardText(
          e.divisionLabel,
          e.description,
          e.taskTitle
        );
        return `- [${dt}] [${e.projectName}] ${e.taskTitle} (${d.paddedHours}h${d.paddedMinutes}m): ${desc}`;
      }),
    ];
    const ok = await copyToClipboard(lines.join('\n'));
    if (ok) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1800);
    }
  };

  const handleExportCsv = () => {
    if (filteredEntries.length === 0) return;
    const escapeCsv = (val: string) =>
      `"${String(val || '').replace(/"/g, '""')}"`;
    const header = [
      'Data/Hora Inicio',
      'Data/Hora Fim',
      'Projeto',
      'Tarefa',
      'Divisao',
      'Duracao (HH:MM:SS)',
      'Minutos',
      'Descricao',
      'Bitrix Task ID',
      'Status Bitrix',
    ].join(';');
    const rows = filteredEntries.map((e) => {
      const d = splitDuration(e.durationMs);
      const mins = Math.round(e.durationMs / 60000);
      const startTs = e.startedAt ?? Math.max(0, e.completedAt - e.durationMs);
      const dtStart = new Date(startTs).toLocaleString('pt-BR');
      const dtEnd = new Date(e.completedAt).toLocaleString('pt-BR');
      const logged = e.bitrixLoggedMs || 0;
      const statusStr =
        logged >= e.durationMs - 999
          ? 'Lancado'
          : logged > 0
            ? 'Parcial'
            : 'Pendente';
      return [
        escapeCsv(dtStart),
        escapeCsv(dtEnd),
        escapeCsv(e.projectName),
        escapeCsv(e.taskTitle),
        escapeCsv(e.divisionLabel),
        escapeCsv(d.formattedHMS),
        String(mins),
        escapeCsv(e.description),
        String(e.bitrixTaskId ?? taskLinks[e.taskId] ?? ''),
        statusStr,
      ].join(';');
    });
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breathetime-historico-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDateTimeEditor = (entry: CompletedLogEntry) => {
    const { date, time } = toInputDateTimeValues(entry.completedAt);
    setEditDateStr(date);
    setEditTimeStr(time);
    setEditingDateId(entry.id);
  };

  const handleSaveDateTime = (entry: CompletedLogEntry) => {
    if (!editDateStr || !editTimeStr) {
      setEditingDateId(null);
      return;
    }
    const [y, m, d] = editDateStr.split('-').map(Number);
    const [hh, mm] = editTimeStr.split(':').map(Number);
    const nextEnd = new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
    if (!Number.isNaN(nextEnd)) {
      onUpdateEntry(entry.id, {
        completedAt: nextEnd,
        startedAt: Math.max(0, nextEnd - entry.durationMs),
      });
    }
    setEditingDateId(null);
  };

  const handleBatchLogPending = async () => {
    if (!bitrix.status.connected || pendingBitrixEntries.length === 0 || batchLogging) {
      return;
    }
    setBatchLogging(true);
    setBatchFeedback(null);
    let okCount = 0;
    let failCount = 0;
    for (const entry of pendingBitrixEntries) {
      const res = await bitrix.logHistoryEntry(entry.id);
      if (res.ok) okCount += 1;
      else failCount += 1;
    }
    setBatchLogging(false);
    setBatchFeedback(
      failCount === 0
        ? `${okCount} lançamento(s) enviado(s) com a data/hora correta!`
        : `${okCount} enviado(s), ${failCount} falharam.`
    );
    setTimeout(() => setBatchFeedback(null), 4000);
  };

  return (
    <div className="history-tab-container">
      {/* Filtros de Data */}
      <div className="history-filter-bar">
        <div className="history-filter-pills">
          {(
            [
              ['today', 'Hoje'],
              ['yesterday', 'Ontem'],
              ['week', '7 dias'],
              ['all', 'Todos'],
            ] as [DateFilterMode, string][]
          ).map(([mode, lbl]) => (
            <button
              key={mode}
              type="button"
              className={`filter-pill ${filterMode === mode ? 'active' : ''}`}
              onClick={() => setFilterMode(mode)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <label className="history-date-picker-label" title="Filtrar por um dia específico">
          <Calendar size={12} />
          <input
            type="date"
            className="history-date-input"
            value={customDate}
            onChange={(e) => {
              if (e.target.value) {
                setCustomDate(e.target.value);
                setFilterMode('custom');
              }
            }}
          />
        </label>
      </div>

      {/* Resumo Total do Período Selecionado */}
      <div className="history-summary-banner">
        <div className="history-summary-left">
          <CheckCircle2 size={18} className="summary-icon" />
          <div>
            <div className="summary-title">
              {filterMode === 'today'
                ? 'Total Trabalhado Hoje'
                : filterMode === 'yesterday'
                  ? 'Total de Ontem'
                  : filterMode === 'week'
                    ? 'Total (Últimos 7 dias)'
                    : filterMode === 'custom'
                      ? `Total (${customDate.split('-').reverse().join('/')})`
                      : 'Total Geral Salvo'}
            </div>
            <div className="summary-subtitle">
              {filteredEntries.length} registro
              {filteredEntries.length !== 1 ? 's' : ''} neste período
            </div>
          </div>
        </div>

        <div className="history-summary-right">
          <span className="summary-total-hm">
            {totalFiltered.paddedHours}h {totalFiltered.paddedMinutes}m
          </span>
          {entries.length > 0 && (
            <button
              type="button"
              className={`btn-clear-history ${confirmClearAll ? 'confirming' : ''}`}
              onClick={() => {
                if (confirmClearAll) {
                  onClearHistory();
                  setConfirmClearAll(false);
                } else {
                  setConfirmClearAll(true);
                  setTimeout(() => setConfirmClearAll(false), 3000);
                }
              }}
              title="Limpar todo o histórico"
            >
              {confirmClearAll ? 'Confirmar?' : 'Limpar'}
            </button>
          )}
        </div>
      </div>

      {/* Resumo por Projeto + Lançar Pendentes + Export */}
      {filteredEntries.length > 0 && (
        <div className="history-project-summary-card">
          <div className="project-summary-header">
            <span className="project-summary-title">Resumo por Projeto</span>
            <div className="project-summary-actions">
              {bitrix.status.connected && pendingBitrixEntries.length > 0 && (
                <button
                  type="button"
                  className="history-btn batch-bitrix"
                  onClick={handleBatchLogPending}
                  disabled={batchLogging}
                  title="Enviar todos os pendentes deste filtro ao Bitrix24 na data/hora correta"
                >
                  {batchLogging ? (
                    <Loader2 size={12} className="spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  <span>
                    {batchLogging
                      ? 'Enviando...'
                      : `Lançar ${pendingBitrixEntries.length}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                className={`history-btn ${copiedSummary ? 'copied' : ''}`}
                onClick={handleCopySummary}
                title="Copiar resumo formatado para o clipboard"
              >
                {copiedSummary ? <Check size={12} /> : <FileText size={12} />}
                <span>{copiedSummary ? 'Copiado!' : 'Resumo'}</span>
              </button>

              <button
                type="button"
                className="history-btn"
                onClick={handleExportCsv}
                title="Exportar período para CSV (Excel)"
              >
                <Download size={12} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {batchFeedback && (
            <div className="batch-feedback-line">{batchFeedback}</div>
          )}

          <div className="project-summary-chips">
            {projectSummary.map((proj) => {
              const d = splitDuration(proj.totalMs);
              return (
                <div key={proj.name} className="project-summary-chip">
                  <span
                    className="summary-dot"
                    style={{ backgroundColor: proj.color }}
                  />
                  <span className="summary-proj-name">{proj.name}</span>
                  <strong className="summary-proj-time">
                    {d.paddedHours}h {d.paddedMinutes}m
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="history-empty-state">
          <Clock size={32} className="empty-icon" />
          <h4>
            {entries.length === 0
              ? 'Nenhum tempo concluído ainda'
              : 'Nenhum registro neste filtro de data'}
          </h4>
          <p>
            {entries.length === 0
              ? 'Quando você concluir um cronômetro (ou clicar em Lançar+Fim), ele fica salvo aqui com a data e hora exatas para lançar no Bitrix24 mesmo depois.'
              : 'Tente selecionar "7 dias" ou "Todos" acima para ver registros de outros dias.'}
          </p>
        </div>
      ) : (
        <div className="history-days-stack">
          {groupedByDay.map(([dateKey, dayEntries]) => {
            const dayTotalMs = dayEntries.reduce(
              (acc, item) => acc + item.durationMs,
              0
            );
            const dayTotal = splitDuration(dayTotalMs);

            return (
              <div key={dateKey} className="history-day-group">
                <div className="history-day-header">
                  <span className="history-day-title">
                    {formatDayGroupTitle(dateKey, todayKey, yesterdayKey)}
                  </span>
                  <span className="history-day-subtotal">
                    {dayTotal.paddedHours}h {dayTotal.paddedMinutes}m
                  </span>
                </div>

                <div className="history-entries-list">
                  {dayEntries.map((entry) => {
                    const dur = splitDuration(entry.durationMs);
                    const startTs =
                      entry.startedAt ??
                      Math.max(0, entry.completedAt - entry.durationMs);
                    const startTimeStr = new Date(startTs).toLocaleTimeString(
                      'pt-BR',
                      { hour: '2-digit', minute: '2-digit' }
                    );
                    const endTimeStr = new Date(
                      entry.completedAt
                    ).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const isCopied = copiedId === entry.id;
                    const formattedCopyText = formatDivisionClipboardText(
                      entry.divisionLabel,
                      entry.description,
                      entry.taskTitle
                    );
                    const linkedBitrixId =
                      entry.bitrixTaskId ?? taskLinks[entry.taskId];
                    const loggedMs = entry.bitrixLoggedMs || 0;
                    const remainingSecs = Math.round(
                      (entry.durationMs - loggedMs) / 1000
                    );
                    const isFullyLogged =
                      entry.durationMs > 0 && remainingSecs <= 0;

                    return (
                      <div
                        key={entry.id}
                        className={`history-entry-card ${
                          isFullyLogged ? 'is-logged-bitrix' : ''
                        }`}
                      >
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
                            <span className="history-task-name">
                              {entry.taskTitle}
                            </span>
                            {entry.divisionLabel && (
                              <span className="history-division-pill">
                                {entry.divisionLabel}
                              </span>
                            )}
                            {isFullyLogged && (
                              <span className="bitrix-logged-badge">
                                ✓ No Bitrix
                              </span>
                            )}
                          </div>

                          {editingDateId === entry.id ? (
                            <div className="history-datetime-editor">
                              <input
                                type="date"
                                value={editDateStr}
                                onChange={(e) => setEditDateStr(e.target.value)}
                              />
                              <input
                                type="time"
                                value={editTimeStr}
                                onChange={(e) => setEditTimeStr(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-save-time"
                                onClick={() => handleSaveDateTime(entry)}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                className="btn-cancel-time"
                                onClick={() => setEditingDateId(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="history-timestamp-btn"
                              onClick={() => openDateTimeEditor(entry)}
                              title="Clique para ajustar a data/hora que será enviada ao Bitrix24"
                            >
                              <span>
                                {startTimeStr} → {endTimeStr}
                              </span>
                              <Edit3 size={10} />
                            </button>
                          )}
                        </div>

                        <div className="history-entry-body">
                          <div className="history-entry-hm">
                            <span className="hm-box">
                              <strong>{dur.paddedHours}</strong>h
                            </span>
                            <span className="hm-box">
                              <strong>{dur.paddedMinutes}</strong>m
                            </span>
                            <span className="sec-small">
                              {dur.paddedSeconds}s
                            </span>
                          </div>

                          <div className="history-entry-desc">
                            {formattedCopyText || (
                              <em>Sem descrição informada</em>
                            )}
                          </div>
                        </div>

                        <div className="history-entry-actions">
                          <BitrixLogButton
                            label={
                              isFullyLogged
                                ? 'Lançado ✓'
                                : loggedMs > 0
                                  ? 'Lançar restante'
                                  : 'Lançar no Bitrix'
                            }
                            onLog={() => bitrix.logHistoryEntry(entry.id)}
                            disabledReason={
                              !bitrix.status.connected
                                ? 'Conecte-se ao Bitrix24 (ícone de nuvem na barra de título)'
                                : !linkedBitrixId
                                  ? 'Vincule a tarefa a uma tarefa do Bitrix24'
                                  : remainingSecs <= 0
                                    ? 'Tempo já lançado no Bitrix24'
                                    : undefined
                            }
                          />

                          <button
                            type="button"
                            className={`history-btn copy ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopyEntry(entry)}
                            title="Copiar descrição novamente para o clipboard"
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                          </button>

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
