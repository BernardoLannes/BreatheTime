import React, { useState } from 'react';
import {
  Pin,
  PinOff,
  Minimize2,
  Minus,
  X,
  Eye,
  Layers,
  Zap,
  Timer,
  Keyboard,
  RotateCcw,
  Power,
  Cloud,
  MoveHorizontal,
  Bell,
  Palette,
} from 'lucide-react';
import { ReminderSettings, ShortcutConfig } from '../types/timer';

interface TitleBarProps {
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  onEnterCompactMode: () => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  autoPauseOthers: boolean;
  onToggleAutoPause: () => void;
  runningCount: number;
  shortcuts: ShortcutConfig;
  onUpdateShortcuts: (next: ShortcutConfig) => void;
  autoLaunch: boolean;
  onToggleAutoLaunch: () => void;
  avoidMouse: boolean;
  onToggleAvoidMouse: () => void;
  reminders: ReminderSettings;
  onUpdateReminders: (next: ReminderSettings) => void;
  bitrixConnected: boolean;
  onOpenBitrix: () => void;
  onOpenThemeModal: () => void;
}

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  togglePlay: 'Alt+Shift+P',
  toggleCompact: 'Alt+Shift+M',
  toggleMinimize: 'Alt+Shift+B',
  copyDescription: 'Alt+Shift+C',
  toggleAvoidMouse: 'Alt+Shift+E',
};

function formatKeyEventToAccelerator(e: React.KeyboardEvent): string | null {
  const ignoredKeys = new Set([
    'Control',
    'Shift',
    'Alt',
    'Meta',
    'OS',
    'Dead',
  ]);
  if (ignoredKeys.has(e.key)) {
    return null;
  }

  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');

  if (mods.length === 0) {
    // Require at least one modifier for global shortcuts
    return null;
  }

  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();

  return [...mods, keyName].join('+');
}

export const TitleBar: React.FC<TitleBarProps> = ({
  alwaysOnTop,
  onToggleAlwaysOnTop,
  onEnterCompactMode,
  opacity,
  onChangeOpacity,
  autoPauseOthers,
  onToggleAutoPause,
  runningCount,
  shortcuts,
  onUpdateShortcuts,
  autoLaunch,
  onToggleAutoLaunch,
  avoidMouse,
  onToggleAvoidMouse,
  reminders,
  onUpdateReminders,
  bitrixConnected,
  onOpenBitrix,
  onOpenThemeModal,
}) => {
  const [showOpacityMenu, setShowOpacityMenu] = useState(false);
  const [showShortcutsMenu, setShowShortcutsMenu] = useState(false);
  const [recordingField, setRecordingField] = useState<
    keyof ShortcutConfig | null
  >(null);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  const handleRecordKeyDown = (
    e: React.KeyboardEvent,
    field: keyof ShortcutConfig
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setRecordingField(null);
      return;
    }

    const accel = formatKeyEventToAccelerator(e);
    if (accel) {
      onUpdateShortcuts({
        ...shortcuts,
        [field]: accel,
      });
      setRecordingField(null);
    }
  };

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className={`app-logo ${runningCount > 0 ? 'is-running' : ''}`}>
          <Timer size={15} />
        </div>
        <span className="app-title">BreatheTime</span>
        {runningCount > 0 && (
          <span
            className="running-pill"
            title={`${runningCount} cronômetro(s) rodando`}
          >
            <span className="pulse-dot" />
            {runningCount} ativo{runningCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="titlebar-actions no-drag">
        {/* Toggle Auto-Pause vs Multi-Timer */}
        <button
          type="button"
          className={`icon-btn ${autoPauseOthers ? 'active-subtle' : 'multi-active'}`}
          onClick={onToggleAutoPause}
          title={
            autoPauseOthers
              ? 'Auto-Pause ATIVO: dar Play em um cronômetro pausa os outros automaticamente (clique para permitir múltiplos)'
              : 'Múltiplos Simultâneos ATIVO: vários cronômetros podem rodar juntos (clique para ativar Auto-Pause)'
          }
        >
          {autoPauseOthers ? <Zap size={14} /> : <Layers size={14} />}
          <span className="btn-tiny-label">{autoPauseOthers ? '1x' : 'Multi'}</span>
        </button>

        {/* Conexão com o Bitrix24 */}
        <button
          type="button"
          className={`icon-btn bitrix-conn-btn ${bitrixConnected ? 'connected' : ''}`}
          onClick={onOpenBitrix}
          title={
            bitrixConnected
              ? 'Bitrix24 conectado (clique para gerenciar)'
              : 'Conectar ao Bitrix24 para lançar tempo nas tarefas'
          }
        >
          <Cloud size={14} />
        </button>

        {/* Menu de Atalhos Globais de Teclado */}
        <div className="opacity-dropdown-wrapper">
          <button
            type="button"
            className={`icon-btn ${showShortcutsMenu ? 'pinned' : ''}`}
            onClick={() => {
              setShowShortcutsMenu((prev) => !prev);
              setShowOpacityMenu(false);
              setRecordingField(null);
            }}
            title={`Atalhos Globais (funcionam sem clicar na janela):\n• Play/Pause: ${shortcuts.togglePlay}\n• Compacto/Expandir: ${shortcuts.toggleCompact}\n• Minimizar/Abrir: ${shortcuts.toggleMinimize}`}
          >
            <Keyboard size={14} />
          </button>

          {showShortcutsMenu && (
            <div className="shortcuts-popover">
              {/* Opção de Iniciar junto com o Windows */}
              <div className="autolaunch-toggle-row">
                <div className="autolaunch-info">
                  <Power size={13} className={autoLaunch ? 'power-on' : 'power-off'} />
                  <span>Iniciar junto com o Windows</span>
                </div>
                <button
                  type="button"
                  className={`switch-pill ${autoLaunch ? 'on' : 'off'}`}
                  onClick={onToggleAutoLaunch}
                >
                  <span className="switch-knob" />
                </button>
                <div className="shortcut-row">
                  <span className="shortcut-label">Opacidade (+ / -)</span>
                  <span className="shortcut-static-badge">Alt+Shift+ + / -</span>
                </div>
              </div>

              <div className="popover-divider" />

              <div className="shortcuts-popover-header">
                <span>Atalhos Globais (em qualquer tela)</span>
                <button
                  type="button"
                  className="reset-shortcuts-btn"
                  onClick={() => {
                    onUpdateShortcuts(DEFAULT_SHORTCUTS);
                    setRecordingField(null);
                  }}
                  title="Restaurar atalhos padrão"
                >
                  <RotateCcw size={11} />
                  <span>Padrão</span>
                </button>
              </div>

              <p className="shortcuts-hint">
                Funcionam mesmo com o app em segundo plano ou minimizado. Clique
                em um atalho para alterar:
              </p>

              <div className="shortcuts-list">
                <div className="shortcut-row">
                  <span className="shortcut-label">Play / Pause Tempo</span>
                  <button
                    type="button"
                    className={`shortcut-key-btn ${recordingField === 'togglePlay' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('togglePlay')}
                    onKeyDown={(e) => handleRecordKeyDown(e, 'togglePlay')}
                  >
                    {recordingField === 'togglePlay'
                      ? 'Pressione ex: Alt+Shift+P...'
                      : shortcuts.togglePlay}
                  </button>
                </div>

                <div className="shortcut-row">
                  <span className="shortcut-label">Compactar ↔ Expandir</span>
                  <button
                    type="button"
                    className={`shortcut-key-btn ${recordingField === 'toggleCompact' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('toggleCompact')}
                    onKeyDown={(e) => handleRecordKeyDown(e, 'toggleCompact')}
                  >
                    {recordingField === 'toggleCompact'
                      ? 'Pressione ex: Alt+Shift+M...'
                      : shortcuts.toggleCompact}
                  </button>
                </div>

                <div className="shortcut-row">
                  <span className="shortcut-label">Minimizar ↔ Abrir</span>
                  <button
                    type="button"
                    className={`shortcut-key-btn ${recordingField === 'toggleMinimize' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('toggleMinimize')}
                    onKeyDown={(e) => handleRecordKeyDown(e, 'toggleMinimize')}
                  >
                    {recordingField === 'toggleMinimize'
                      ? 'Pressione ex: Alt+Shift+B...'
                      : shortcuts.toggleMinimize}
                  </button>
                </div>

                <div className="shortcut-row">
                  <span className="shortcut-label">Copiar Descrição</span>
                  <button
                    type="button"
                    className={`shortcut-key-btn ${recordingField === 'copyDescription' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('copyDescription')}
                    onKeyDown={(e) => handleRecordKeyDown(e, 'copyDescription')}
                  >
                    {recordingField === 'copyDescription'
                      ? 'Pressione ex: Alt+Shift+C...'
                      : shortcuts.copyDescription}
                  </button>
                </div>

                <div className="shortcut-row">
                  <span className="shortcut-label">Avoid Mouse (Esquiva)</span>
                  <button
                    type="button"
                    className={`shortcut-key-btn ${recordingField === 'toggleAvoidMouse' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('toggleAvoidMouse')}
                    onKeyDown={(e) => handleRecordKeyDown(e, 'toggleAvoidMouse')}
                  >
                    {recordingField === 'toggleAvoidMouse'
                      ? 'Pressione ex: Alt+Shift+E...'
                      : shortcuts.toggleAvoidMouse}
                  </button>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-label">Opacidade (+ / -)</span>
                  <span className="shortcut-static-badge">Alt+Shift+ + / -</span>
                </div>
              </div>

              <div className="popover-divider" />

              <div className="reminders-section">
                <div className="reminders-header">
                  <Bell size={12} className="bell-icon" />
                  <span>Lembretes de Produtividade</span>
                </div>
                <div className="reminder-row">
                  <span>Avisar se parado por:</span>
                  <select
                    className="reminder-select"
                    value={reminders.idleMinutes}
                    onChange={(e) =>
                      onUpdateReminders({
                        ...reminders,
                        idleMinutes: Number(e.target.value),
                      })
                    }
                  >
                    <option value={0}>Desativado</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div className="reminder-row">
                  <span>Lembrete de pausa após:</span>
                  <select
                    className="reminder-select"
                    value={reminders.breakMinutes}
                    onChange={(e) =>
                      onUpdateReminders({
                        ...reminders,
                        breakMinutes: Number(e.target.value),
                      })
                    }
                  >
                    <option value={0}>Desativado</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão Temas & Cores Personalizáveis */}
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenThemeModal}
          title="Temas e Cores Personalizáveis"
        >
          <Palette size={14} />
        </button>

        {/* Controle de Transparência / Opacidade */}
        <div className="opacity-dropdown-wrapper">
          <button
            type="button"
            className={`icon-btn ${opacity < 1 ? 'active-subtle' : ''}`}
            onClick={() => {
              setShowOpacityMenu((prev) => !prev);
              setShowShortcutsMenu(false);
            }}
            title="Ajustar transparência da janela na tela"
          >
            <Eye size={14} />
            {opacity < 1 && (
              <span className="btn-tiny-label">{Math.round(opacity * 100)}%</span>
            )}
          </button>

          {showOpacityMenu && (
            <div className="opacity-popover">
              <div className="opacity-popover-header">
                <span>Transparência</span>
                <strong>{Math.round(opacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0.4}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="opacity-slider"
              />
              <div className="opacity-presets">
                {[1, 0.85, 0.7, 0.55].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip ${Math.abs(opacity - preset) < 0.03 ? 'selected' : ''}`}
                    onClick={() => {
                      onChangeOpacity(preset);
                      setShowOpacityMenu(false);
                    }}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão Rápido: Iniciar junto com o Windows */}
        <button
          type="button"
          className={`icon-btn ${autoLaunch ? 'autolaunch-active' : ''}`}
          onClick={onToggleAutoLaunch}
          title={
            autoLaunch
              ? 'Iniciar com o Windows: ATIVADO (clique para desativar)'
              : 'Iniciar com o Windows: DESATIVADO (clique para ativar)'
          }
        >
          <Power size={13} />
        </button>

        {/* Botão Avoid Mouse (Esquiva Inteligente) */}
        <button
          type="button"
          className={`icon-btn ${avoidMouse ? 'pinned' : ''}`}
          onClick={onToggleAvoidMouse}
          title={
            avoidMouse
              ? `Avoid Mouse ATIVO (${shortcuts.toggleAvoidMouse}): quando não estiver focada, a janela foge para o outro lado da tela ao passar o mouse`
              : `Ativar Avoid Mouse (${shortcuts.toggleAvoidMouse}): a janela foge para o outro lado da tela quando o mouse passa por cima`
          }
        >
          <MoveHorizontal size={14} />
        </button>

        {/* Botão Modo Pílula (Mini-Barra Flutuante) */}
        <button
          type="button"
          className="icon-btn"
          onClick={onEnterCompactMode}
          title={`Modo Mini-Barra Flutuante (${shortcuts.toggleCompact})`}
        >
          <Minimize2 size={14} />
        </button>

        {/* Botão Sempre no Topo (Pin) */}
        <button
          type="button"
          className={`icon-btn ${alwaysOnTop ? 'pinned' : ''}`}
          onClick={onToggleAlwaysOnTop}
          title={
            alwaysOnTop
              ? 'Sempre no Topo ATIVO (fixado sobre outras janelas)'
              : 'Fixar janela Sempre no Topo'
          }
        >
          {alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
        </button>

        <div className="titlebar-divider" />

        <button
          type="button"
          className="icon-btn window-ctrl"
          onClick={handleMinimize}
          title={`Minimizar (${shortcuts.toggleMinimize} para minimizar ou abrir de volta)`}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="icon-btn window-ctrl close"
          onClick={handleClose}
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
