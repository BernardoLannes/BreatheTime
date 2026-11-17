import React from 'react';
import { Palette, X, Check, RotateCcw, Sun, Moon } from 'lucide-react';
import { ThemeConfig } from '../types/timer';
import { PRESET_THEMES } from '../utils/themes';

interface ThemeModalProps {
  theme: ThemeConfig;
  onChangeTheme: (next: ThemeConfig) => void;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  theme,
  onChangeTheme,
  onClose,
}) => {
  const darkPresets = PRESET_THEMES.filter((t) => !t.isLight);
  const lightPresets = PRESET_THEMES.filter((t) => t.isLight);

  const handleSelectPreset = (preset: ThemeConfig) => {
    onChangeTheme({ ...preset });
  };

  const handleCustomColor = (
    field: keyof Pick<
      ThemeConfig,
      'bgApp' | 'bgSurface' | 'bgCard' | 'accentPrimary' | 'accentGreen'
    >,
    value: string
  ) => {
    onChangeTheme({
      ...theme,
      id: 'custom',
      name: 'Personalizado',
      [field]: value,
    });
  };

  const renderPresetGrid = (list: ThemeConfig[]) => (
    <div className="theme-presets-grid">
      {list.map((preset) => {
        const isSelected = theme.id === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            className={`theme-preset-card ${isSelected ? 'selected' : ''}`}
            onClick={() => handleSelectPreset(preset)}
            style={{
              backgroundColor: preset.bgApp,
              borderColor: isSelected ? preset.accentPrimary : undefined,
              color: preset.isLight ? '#0f172a' : '#f8fafc',
            }}
          >
            <div className="theme-swatches">
              <span style={{ backgroundColor: preset.bgSurface }} />
              <span style={{ backgroundColor: preset.bgCard }} />
              <span style={{ backgroundColor: preset.accentPrimary }} />
              <span style={{ backgroundColor: preset.accentGreen }} />
            </div>
            <div className="theme-preset-name">
              <span>{preset.name}</span>
              {isSelected && (
                <Check
                  size={12}
                  style={{ color: preset.accentPrimary, flexShrink: 0 }}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="modal-backdrop no-drag" onClick={onClose}>
      <div
        className="exit-multi-modal theme-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exit-multi-header">
          <div className="exit-multi-title">
            <Palette size={15} className="theme-icon-accent" />
            <span>Temas & Cores Personalizáveis</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="theme-group-title">
          <Sun size={12} />
          <span>Temas Claros</span>
        </div>
        {renderPresetGrid(lightPresets)}

        <div className="theme-group-title" style={{ marginTop: '4px' }}>
          <Moon size={12} />
          <span>Temas Escuros</span>
        </div>
        {renderPresetGrid(darkPresets)}

        <div className="popover-divider" />

        <div className="theme-custom-header">
          <span className="theme-section-label">Personalizar Cores</span>
          <button
            type="button"
            className="reset-shortcuts-btn"
            onClick={() => handleSelectPreset(PRESET_THEMES[0])}
            title="Restaurar tema padrão"
          >
            <RotateCcw size={11} />
            <span>Padrão</span>
          </button>
        </div>

        <div className="theme-custom-grid">
          <label className="color-field-item">
            <span>Fundo</span>
            <input
              type="color"
              value={theme.bgApp}
              onChange={(e) => handleCustomColor('bgApp', e.target.value)}
            />
          </label>
          <label className="color-field-item">
            <span>Painéis</span>
            <input
              type="color"
              value={theme.bgSurface}
              onChange={(e) => handleCustomColor('bgSurface', e.target.value)}
            />
          </label>
          <label className="color-field-item">
            <span>Cartões</span>
            <input
              type="color"
              value={theme.bgCard}
              onChange={(e) => handleCustomColor('bgCard', e.target.value)}
            />
          </label>
          <label className="color-field-item">
            <span>Destaque</span>
            <input
              type="color"
              value={theme.accentPrimary}
              onChange={(e) =>
                handleCustomColor('accentPrimary', e.target.value)
              }
            />
          </label>
          <label className="color-field-item">
            <span>Ativo</span>
            <input
              type="color"
              value={theme.accentGreen}
              onChange={(e) => handleCustomColor('accentGreen', e.target.value)}
            />
          </label>
          <label className="color-field-item mode-toggle">
            <span>Modo Claro</span>
            <input
              type="checkbox"
              checked={Boolean(theme.isLight)}
              onChange={(e) =>
                onChangeTheme({
                  ...theme,
                  id: 'custom',
                  name: 'Personalizado',
                  isLight: e.target.checked,
                })
              }
            />
          </label>
        </div>

        <div className="exit-multi-footer">
          <button
            type="button"
            className="btn-confirm-project"
            style={{ width: '100%', justifyContent: 'center', height: '32px' }}
            onClick={onClose}
          >
            Aplicar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
