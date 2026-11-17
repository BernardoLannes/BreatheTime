import React from 'react';
import {
  Pin,
  PinOff,
  Minimize2,
  Minus,
  X,
  Layers,
  Zap,
  Timer,
  Cloud,
  Settings,
} from 'lucide-react';
import { ShortcutConfig } from '../types/timer';

interface TitleBarProps {
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  onEnterCompactMode: () => void;
  autoPauseOthers: boolean;
  onToggleAutoPause: () => void;
  runningCount: number;
  shortcuts: ShortcutConfig;
  bitrixConnected: boolean;
  onOpenBitrix: () => void;
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  alwaysOnTop,
  onToggleAlwaysOnTop,
  onEnterCompactMode,
  autoPauseOthers,
  onToggleAutoPause,
  runningCount,
  shortcuts,
  bitrixConnected,
  onOpenBitrix,
  onOpenSettings,
}) => {
  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
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
        {/* Toggle Auto-Pause (1x) vs Multi-Task */}
        <button
          type="button"
          className={`icon-btn ${autoPauseOthers ? 'active-subtle' : 'multi-active'}`}
          onClick={onToggleAutoPause}
          title={
            autoPauseOthers
              ? 'Modo 1x (Auto-Pause ativo) — clique para permitir vários cronômetros juntos'
              : 'Modo Multi-Task ATIVO — clique para voltar ao modo 1x'
          }
        >
          {autoPauseOthers ? <Zap size={14} /> : <Layers size={14} />}
          <span className="btn-tiny-label">{autoPauseOthers ? '1x' : 'Multi'}</span>
        </button>

        {/* Conexão Bitrix24 */}
        <button
          type="button"
          className={`icon-btn ${bitrixConnected ? 'autolaunch-active' : ''}`}
          onClick={onOpenBitrix}
          title={
            bitrixConnected
              ? 'Bitrix24 conectado (clique para gerenciar)'
              : 'Conectar ao Bitrix24'
          }
        >
          <Cloud size={14} />
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

        {/* Configurações & Controles (Temas, Opacidade, Avoid Mouse, Atalhos, Proteção, Backup) */}
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          title="Configurações, Temas, Opacidade, Atalhos e Proteção"
        >
          <Settings size={14} />
        </button>

        <div className="titlebar-divider" />

        <button
          type="button"
          className="icon-btn window-ctrl"
          onClick={handleMinimize}
          title={`Minimizar (${shortcuts.toggleMinimize})`}
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
