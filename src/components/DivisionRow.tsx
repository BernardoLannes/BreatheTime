import React, { useState } from 'react';
import {
  Play,
  Pause,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Tag,
  Edit3,
  Plus,
  Settings2,
  X,
} from 'lucide-react';
import { TimerDivision } from '../types/timer';
import { useBitrix } from '../bitrix/BitrixContext';
import { BitrixLogButton } from './BitrixLogButton';
import {
  getDivisionElapsedMs,
  splitDuration,
  formatDivisionClipboardText,
  copyToClipboard,
} from '../utils/timeFormat';

interface DivisionRowProps {
  division: TimerDivision;
  taskTitle: string;
  taskBitrixId?: number;
  isOnlyDivision: boolean;
  now: number;
  presetLabels: string[];
  onUpdatePresetLabels: (nextPresets: string[]) => void;
  onTogglePlay: (divisionId: string) => void;
  onUpdateLabel: (divisionId: string, label: string) => void;
  onUpdateDescription: (divisionId: string, description: string) => void;
  onAdjustTimeMs: (divisionId: string, deltaMs: number) => void;
  onSetManualTime: (divisionId: string, hours: number, minutes: number) => void;
  onCompleteAndReset: (divisionId: string) => void;
  onDeleteDivision: (divisionId: string) => void;
}

export const DivisionRow: React.FC<DivisionRowProps> = ({
  division,
  taskTitle,
  taskBitrixId,
  isOnlyDivision,
  now,
  presetLabels,
  onUpdatePresetLabels,
  onTogglePlay,
  onUpdateLabel,
  onUpdateDescription,
  onAdjustTimeMs,
  onSetManualTime,
  onCompleteAndReset,
  onDeleteDivision,
}) => {
  const bitrix = useBitrix();
  const [copied, setCopied] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');

  // Estado para gerenciar/editar as labels pré-selecionadas
  const [isManagingPresets, setIsManagingPresets] = useState(false);
  const [newPresetInput, setNewPresetInput] = useState('');
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
  const [editingPresetVal, setEditingPresetVal] = useState('');

  const elapsedMs = getDivisionElapsedMs(division, now);
  const time = splitDuration(elapsedMs);

  const openTimeEditor = () => {
    setEditHours(String(time.hours));
    setEditMinutes(String(time.minutes));
    setIsEditingTime(true);
  };

  const handleSaveManualTime = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Math.max(0, parseInt(editHours || '0', 10) || 0);
    const m = Math.max(0, parseInt(editMinutes || '0', 10) || 0);
    onSetManualTime(division.id, h, m);
    setIsEditingTime(false);
  };

  const handleCopyDescription = async () => {
    const textToCopy = formatDivisionClipboardText(
      division.label,
      division.description,
      taskTitle
    );
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSelectChip = (preset: string) => {
    // Se clicar na label que já está ativa, desmarca; caso contrário, seleciona
    if (division.label.trim().toLowerCase() === preset.toLowerCase()) {
      onUpdateLabel(division.id, '');
    } else {
      onUpdateLabel(division.id, preset);
    }
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPresetInput.trim();
    if (!clean) return;
    if (!presetLabels.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      onUpdatePresetLabels([...presetLabels, clean]);
    }
    onUpdateLabel(division.id, clean);
    setNewPresetInput('');
  };

  const handleDeletePreset = (idx: number) => {
    const target = presetLabels[idx];
    const next = presetLabels.filter((_, i) => i !== idx);
    onUpdatePresetLabels(next);
    if (division.label === target) {
      onUpdateLabel(division.id, '');
    }
  };

  const handleStartEditPreset = (idx: number) => {
    setEditingPresetIdx(idx);
    setEditingPresetVal(presetLabels[idx]);
  };

  const handleSaveEditPreset = (idx: number) => {
    const clean = editingPresetVal.trim();
    if (clean) {
      const oldVal = presetLabels[idx];
      const next = presetLabels.map((item, i) => (i === idx ? clean : item));
      onUpdatePresetLabels(next);
      if (division.label === oldVal) {
        onUpdateLabel(division.id, clean);
      }
    }
    setEditingPresetIdx(null);
    setEditingPresetVal('');
  };

  const previewCopyText = formatDivisionClipboardText(
    division.label,
    division.description,
    taskTitle
  );

  return (
    <div className={`division-card ${division.isRunning ? 'is-running' : ''}`}>
      {/* Linha Superior da Divisão: Play/Pause + Visor Horas/Minutos + Ajustes + Ações */}
      <div className="division-top-row">
        <button
          type="button"
          className={`play-btn ${division.isRunning ? 'running' : ''}`}
          onClick={() => onTogglePlay(division.id)}
          title={division.isRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
        >
          {division.isRunning ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Visor de Tempo ou Editor Manual */}
        {isEditingTime ? (
          <form className="manual-time-form" onSubmit={handleSaveManualTime}>
            <label className="manual-field">
              <input
                type="number"
                min={0}
                max={999}
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                autoFocus
              />
              <span>h</span>
            </label>
            <label className="manual-field">
              <input
                type="number"
                min={0}
                max={59}
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
              />
              <span>m</span>
            </label>
            <button type="submit" className="btn-save-time">
              OK
            </button>
            <button
              type="button"
              className="btn-cancel-time"
              onClick={() => setIsEditingTime(false)}
            >
              ✕
            </button>
          </form>
        ) : (
          <div className="time-control-group">
            <button
              type="button"
              className="time-readout-btn"
              onClick={openTimeEditor}
              title="Clique para editar manualmente as Horas e Minutos"
            >
              <span className="bitrix-hm-box" title="Horas para o Bitrix24">
                <span className="hm-val">{time.paddedHours}</span>
                <span className="hm-lbl">h</span>
              </span>
              <span className="bitrix-hm-box" title="Minutos para o Bitrix24">
                <span className="hm-val">{time.paddedMinutes}</span>
                <span className="hm-lbl">m</span>
              </span>
              <span className="seconds-sub">{time.paddedSeconds}s</span>
              <Edit3 size={11} className="edit-time-hint" />
            </button>

            <div className="quick-adjust-btns">
              <button
                type="button"
                className="adj-chip"
                onClick={() => onAdjustTimeMs(division.id, -5 * 60 * 1000)}
                disabled={elapsedMs === 0}
                title="Subtrair 5 minutos"
              >
                -5m
              </button>
              <button
                type="button"
                className="adj-chip"
                onClick={() => onAdjustTimeMs(division.id, 5 * 60 * 1000)}
                title="Adicionar 5 minutos"
              >
                +5m
              </button>
            </div>
          </div>
        )}

        {/* Botões da direita: Concluir/Zerar + Excluir */}
        <div className="division-right-actions">
          <button
            type="button"
            className="complete-reset-btn"
            onClick={() => onCompleteAndReset(division.id)}
            disabled={elapsedMs === 0 && !division.description.trim()}
            title="Concluir / Zerar: limpa este tempo da tela ativa e salva no Histórico do Dia"
          >
            <CheckCircle2 size={14} />
            <span>Concluir</span>
          </button>

          {!isOnlyDivision && (
            <button
              type="button"
              className="icon-action-btn danger"
              onClick={() => onDeleteDivision(division.id)}
              title="Remover esta divisão"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Labels Pré-Selecionadas e Editáveis */}
      <div className="division-presets-section">
        <div className="preset-chips-row">
          <Tag size={12} className="label-icon" />

          {presetLabels.map((preset, idx) => {
            const isSelected =
              division.label.trim().toLowerCase() === preset.toLowerCase();

            if (isManagingPresets && editingPresetIdx === idx) {
              return (
                <div key={idx} className="preset-inline-edit">
                  <input
                    type="text"
                    value={editingPresetVal}
                    onChange={(e) => setEditingPresetVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditPreset(idx);
                      if (e.key === 'Escape') setEditingPresetIdx(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEditPreset(idx)}
                    title="Salvar nome da label"
                  >
                    ✓
                  </button>
                </div>
              );
            }

            return (
              <div
                key={preset}
                className={`preset-label-chip ${isSelected ? 'selected' : ''} ${
                  isManagingPresets ? 'managing' : ''
                }`}
              >
                <button
                  type="button"
                  className="preset-chip-main"
                  onClick={() =>
                    isManagingPresets
                      ? handleStartEditPreset(idx)
                      : handleSelectChip(preset)
                  }
                  title={
                    isManagingPresets
                      ? 'Clique para renomear esta label'
                      : isSelected
                      ? 'Clique para desmarcar esta label'
                      : `Selecionar label "${preset}"`
                  }
                >
                  {preset}
                </button>
                {isManagingPresets && (
                  <button
                    type="button"
                    className="preset-chip-del"
                    onClick={() => handleDeletePreset(idx)}
                    title="Excluir esta label padrão"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Se a divisão tiver um nome customizado que não está nas presets, mostra como chip ativo */}
          {division.label.trim() &&
            !presetLabels.some(
              (p) => p.toLowerCase() === division.label.trim().toLowerCase()
            ) && (
              <div className="preset-label-chip selected">
                <button
                  type="button"
                  className="preset-chip-main"
                  onClick={() => onUpdateLabel(division.id, '')}
                  title="Clique para limpar"
                >
                  {division.label}
                </button>
              </div>
            )}

          <button
            type="button"
            className={`manage-presets-btn ${isManagingPresets ? 'active' : ''}`}
            onClick={() => {
              setIsManagingPresets((prev) => !prev);
              setEditingPresetIdx(null);
            }}
            title="Adicionar, renomear ou remover labels pré-selecionadas"
          >
            <Settings2 size={12} />
            <span>{isManagingPresets ? 'Pronto' : 'Editar'}</span>
          </button>
        </div>

        {/* Painel rápido de edição/adição de Labels (quando clicou em Editar) */}
        {isManagingPresets && (
          <div className="manage-presets-panel">
            <form className="add-preset-form" onSubmit={handleAddPreset}>
              <input
                type="text"
                className="add-preset-input"
                placeholder="Nova label padrão (ex: Code Review, Deploy, Suporte)..."
                value={newPresetInput}
                onChange={(e) => setNewPresetInput(e.target.value)}
              />
              <button
                type="submit"
                className="btn-add-preset"
                disabled={!newPresetInput.trim()}
              >
                <Plus size={12} />
                <span>Criar Label</span>
              </button>
            </form>
            <div className="custom-label-direct-row">
              <span>Ou digite um nome avulso só para esta divisão:</span>
              <input
                type="text"
                className="division-label-input"
                placeholder="Nome avulso..."
                value={division.label}
                onChange={(e) => onUpdateLabel(division.id, e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Linha de Descrição + Botão de 1 Clique para Copiar para o Bitrix24 */}
      <div className="division-desc-row">
        <textarea
          rows={2}
          className="division-desc-textarea"
          placeholder={
            division.label.trim()
              ? `O que foi feito em "${division.label.trim()}"? (Vai copiar como [${division.label.trim()}] ...)`
              : 'Descrição do que foi feito para lançar no Bitrix24...'
          }
          value={division.description}
          onChange={(e) => onUpdateDescription(division.id, e.target.value)}
        />

        <button
          type="button"
          className={`copy-bitrix-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopyDescription}
          title={
            previewCopyText
              ? `Copiar com 1 clique: "${previewCopyText}"`
              : 'Copiar descrição para colar no Bitrix24'
          }
        >
          {copied ? (
            <>
              <Check size={15} />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={15} />
              <span>Copiar</span>
            </>
          )}
        </button>

        <BitrixLogButton
          className="division-log-btn"
          iconSize={15}
          onLog={() => bitrix.logDivision(division.id)}
          disabledReason={
            !bitrix.status.connected
              ? 'Conecte-se ao Bitrix24 (ícone de nuvem na barra de título)'
              : !taskBitrixId
                ? 'Vincule a tarefa a uma tarefa do Bitrix24 (ícone de link)'
                : undefined
          }
        />
      </div>
    </div>
  );
};
