import React, { useState } from 'react';
import {
  Settings,
  X,
  Power,
  Pin,
  MoveHorizontal,
  Eye,
  Palette,
  Bell,
  Keyboard,
  RotateCcw,
  Download,
  Upload,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { ReminderSettings, ShortcutConfig, ThemeConfig } from '../types/timer';

export type BitrixRoundingMode = 'exact' | 'ceil_1m' | 'ceil_5m';

interface SettingsModalProps {
  onClose: () => void;
  // Janela & Comportamento
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  autoLaunch: boolean;
  onToggleAutoLaunch: () => void;
  avoidMouse: boolean;
  onToggleAvoidMouse: () => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  // Aparência
  theme: ThemeConfig;
  onOpenThemeModal: () => void;
  // Controle Bitrix & Dados
  bitrixRounding: BitrixRoundingMode;
  onChangeBitrixRounding: (mode: BitrixRoundingMode) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  // Proteção & Lembretes
  reminders: ReminderSettings;
  onUpdateReminders: (next: ReminderSettings) => void;
  // Atalhos
  shortcuts: ShortcutConfig;
  onUpdateShortcuts: (next: ShortcutConfig) => void;
}

type SettingsTab = 'general' | 'reminders' | 'shortcuts';

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  togglePlay: 'Alt+Shift+P',
  toggleCompact: 'Alt+Shift+M',
  toggleMinimize: 'Alt+Shift+B',
  copyDescription: 'Alt+Shift+C',
  toggleAvoidMouse: 'Alt+Shift+E',
};

function formatKeyEventToAccelerator(e: React.KeyboardEvent): string | null {
  const ignoredKeys = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS', 'Dead']);
  if (ignoredKeys.has(e.key)) return null;

  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  if (mods.length === 0) return null;

  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();
  return [...mods, keyName].join('+');
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  autoLaunch,
  onToggleAutoLaunch,
  avoidMouse,
  onToggleAvoidMouse,
  opacity,
  onChangeOpacity,
  theme,
  onOpenThemeModal,
  bitrixRounding,
  onChangeBitrixRounding,
  onExportBackup,
  onImportBackup,
  reminders,
  onUpdateReminders,
  shortcuts,
  onUpdateShortcuts,
}) => {
  const [tab, setTab] = useState<SettingsTab>('general');
  const [recordingField, setRecordingField] = useState<
    keyof ShortcutConfig | null
  >(null);

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
      onUpdateShortcuts({ ...shortcuts, [field]: accel });
      setRecordingField(null);
    }
  };

  return (
    <div className="modal-backdrop no-drag" onClick={onClose}>
      <div
        className="exit-multi-modal settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exit-multi-header">
          <div className="exit-multi-title">
            <Settings size={15} className="theme-icon-accent" />
            <span>Configurações & Controles</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="settings-tabs-bar">
          <button
            type="button"
            className={`settings-tab-btn ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            <Sliders size={12} />
            <span>Geral & Visual</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${tab === 'reminders' ? 'active' : ''}`}
            onClick={() => setTab('reminders')}
          >
            <ShieldCheck size={12} />
            <span>Proteção</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${tab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setTab('shortcuts')}
          >
            <Keyboard size={12} />
            <span>Atalhos</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="settings-body">
          {tab === 'general' && (
            <div className="settings-section-stack">
              {/* Controles da Janela */}
              <div className="settings-group-card">
                <div className="settings-group-title">Janela & Sistema</div>

                <div className="settings-row">
                  <div className="settings-row-info">
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
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <Pin size={13} />
                    <span>Sempre no Topo (fixar na tela)</span>
                  </div>
                  <button
                    type="button"
                    className={`switch-pill ${alwaysOnTop ? 'on' : 'off'}`}
                    onClick={onToggleAlwaysOnTop}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <MoveHorizontal size={13} />
                    <div>
                      <div>Avoid Mouse (Esquiva)</div>
                      <small className="settings-sub">
                        Move para o outro lado se passar o mouse por cima
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`switch-pill ${avoidMouse ? 'on' : 'off'}`}
                    onClick={onToggleAvoidMouse}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>
              </div>

              {/* Aparência & Opacidade */}
              <div className="settings-group-card">
                <div className="settings-group-title">Aparência & Transparência</div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <Palette size={13} />
                    <div>
                      <div>Tema atual: <strong>{theme.name}</strong></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => {
                      onClose();
                      onOpenThemeModal();
                    }}
                  >
                    Trocar Tema / Cores
                  </button>
                </div>

                <div className="settings-opacity-box">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <Eye size={13} />
                      <span>Opacidade em 2º plano (volta a 100% ao focar)</span>
                    </div>
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
                    style={{ margin: '6px 0' }}
                  />
                  <div className="opacity-presets">
                    {[1, 0.85, 0.7, 0.55].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`preset-chip ${Math.abs(opacity - preset) < 0.03 ? 'selected' : ''}`}
                        onClick={() => onChangeOpacity(preset)}
                      >
                        {Math.round(preset * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Regras do Bitrix24 & Backup */}
              <div className="settings-group-card">
                <div className="settings-group-title">Bitrix24 & Backup de Dados</div>

                <div className="settings-row">
                  <span className="settings-label-text">Arredondamento ao lançar:</span>
                  <select
                    className="reminder-select"
                    value={bitrixRounding}
                    onChange={(e) =>
                      onChangeBitrixRounding(e.target.value as BitrixRoundingMode)
                    }
                  >
                    <option value="exact">Exato (segundos)</option>
                    <option value="ceil_1m">Arredondar p/ cima (1 min)</option>
                    <option value="ceil_5m">Múltiplos de 5 min</option>
                  </select>
                </div>

                <div className="settings-backup-row">
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={onExportBackup}
                    title="Salvar cópia de segurança de todos os projetos, tarefas e histórico"
                  >
                    <Download size={12} />
                    <span>Exportar Backup (.json)</span>
                  </button>

                  <label
                    className="btn-secondary-sm"
                    style={{ cursor: 'pointer' }}
                    title="Restaurar projetos, tarefas e histórico de um arquivo .json"
                  >
                    <Upload size={12} />
                    <span>Importar Backup</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImportBackup(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'reminders' && (
            <div className="settings-section-stack">
              <div className="settings-group-card">
                <div className="settings-group-title">
                  <Bell size={12} className="bell-icon" />
                  <span>Pausa Automática & Lembretes</span>
                </div>

                <div className="reminder-row">
                  <span>Pausar se PC inativo por:</span>
                  <select
                    className="reminder-select"
                    value={reminders.autoPauseIdleMinutes}
                    onChange={(e) =>
                      onUpdateReminders({
                        ...reminders,
                        autoPauseIdleMinutes: Number(e.target.value),
                      })
                    }
                  >
                    <option value={0}>Desativado</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>

                <div className="reminder-row">
                  <span>Pausar ao bloquear tela / suspender / desligar:</span>
                  <button
                    type="button"
                    className={`switch-pill ${reminders.pauseOnSleepOrLock ? 'on' : 'off'}`}
                    onClick={() =>
                      onUpdateReminders({
                        ...reminders,
                        pauseOnSleepOrLock: !reminders.pauseOnSleepOrLock,
                      })
                    }
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                <div className="reminder-row">
                  <span>Lembrar de retomar ao voltar ao PC:</span>
                  <button
                    type="button"
                    className={`switch-pill ${reminders.remindOnResume ? 'on' : 'off'}`}
                    onClick={() =>
                      onUpdateReminders({
                        ...reminders,
                        remindOnResume: !reminders.remindOnResume,
                      })
                    }
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                <div className="reminder-row">
                  <span>Lembrar de ligar se parado por:</span>
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
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>

                <div className="reminder-row">
                  <span>Lembrete de pausa contínua após:</span>
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

                <div className="settings-backup-row" style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() =>
                      window.electronAPI?.notify(
                        'BreatheTime — Teste de Notificação',
                        'As notificações nativas do Windows estão funcionando!'
                      )
                    }
                  >
                    <Bell size={12} />
                    <span>Testar Notificação do Windows</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'shortcuts' && (
            <div className="settings-section-stack">
              <div className="settings-group-card">
                <div className="shortcuts-popover-header">
                  <span>Atalhos Globais (em qualquer tela)</span>
                  <button
                    type="button"
                    className="reset-shortcuts-btn"
                    onClick={() => {
                      onUpdateShortcuts(DEFAULT_SHORTCUTS);
                      setRecordingField(null);
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>Padrão</span>
                  </button>
                </div>

                <p className="shortcuts-hint">
                  Funcionam mesmo com o app em segundo plano ou minimizado. Clique
                  em um atalho e pressione a nova combinação:
                </p>

                <div className="shortcuts-list">
                  {(
                    [
                      ['togglePlay', 'Play / Pause Tempo'],
                      ['toggleCompact', 'Compactar ↔ Expandir'],
                      ['toggleMinimize', 'Minimizar ↔ Abrir'],
                      ['copyDescription', 'Copiar Descrição'],
                      ['toggleAvoidMouse', 'Avoid Mouse (Esquiva)'],
                    ] as [keyof ShortcutConfig, string][]
                  ).map(([field, label]) => (
                    <div key={field} className="shortcut-row">
                      <span className="shortcut-label">{label}</span>
                      <button
                        type="button"
                        className={`shortcut-key-btn ${recordingField === field ? 'recording' : ''}`}
                        onClick={() => setRecordingField(field)}
                        onKeyDown={(e) => handleRecordKeyDown(e, field)}
                      >
                        {recordingField === field
                          ? 'Pressione teclas...'
                          : shortcuts[field]}
                      </button>
                    </div>
                  ))}

                  <div className="shortcut-row">
                    <span className="shortcut-label">Opacidade (+ / -)</span>
                    <span className="shortcut-static-badge">Alt+Shift+ + / -</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="exit-multi-footer">
          <button
            type="button"
            className="btn-confirm-project"
            style={{ width: '100%', justifyContent: 'center', height: '32px' }}
            onClick={onClose}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
