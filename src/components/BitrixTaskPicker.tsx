import React, { useEffect, useMemo, useState } from 'react';
import { Link2Off, X } from 'lucide-react';
import { BitrixTask } from '../types/timer';

interface BitrixTaskPickerProps {
  currentId?: number;
  onSelect: (bitrixTaskId: number | undefined) => void;
  onClose: () => void;
}

export const BitrixTaskPicker: React.FC<BitrixTaskPickerProps> = ({
  currentId,
  onSelect,
  onClose,
}) => {
  const [tasks, setTasks] = useState<BitrixTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.electronAPI?.bitrix.listTasks().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setTasks(res.data);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q)
    );
  }, [tasks, query]);

  // Permite vincular por ID mesmo que a tarefa não esteja na lista
  const manualId = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;

  return (
    <div className="modal-backdrop no-drag">
      <div className="exit-multi-modal bitrix-modal">
        <div className="exit-multi-header">
          <div className="exit-multi-title">
            <span>Vincular tarefa do Bitrix24</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <input
          type="text"
          className="bitrix-picker-search"
          placeholder="Buscar por título ou ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="exit-multi-list bitrix-picker-list">
          {loading && <p className="exit-multi-desc">Carregando tarefas...</p>}
          {error && <p className="bitrix-error">{error}</p>}
          {!loading && !error && filtered.length === 0 && !manualId && (
            <p className="exit-multi-desc">Nenhuma tarefa encontrada.</p>
          )}
          {manualId !== null && !filtered.some((t) => t.id === manualId) && (
            <button
              type="button"
              className="exit-multi-option-btn"
              onClick={() => onSelect(manualId)}
            >
              <span className="option-task">Usar tarefa #{manualId}</span>
            </button>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`exit-multi-option-btn ${t.id === currentId ? 'selected' : ''}`}
              onClick={() => onSelect(t.id)}
            >
              <span className="option-task">{t.title}</span>
              <span className="option-proj">#{t.id}</span>
            </button>
          ))}
        </div>

        <div className="exit-multi-footer">
          {currentId !== undefined && (
            <button
              type="button"
              className="btn-pause-all-multi"
              onClick={() => onSelect(undefined)}
            >
              <Link2Off size={14} />
              <span>Remover vínculo</span>
            </button>
          )}
          <button type="button" className="btn-cancel-multi" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
