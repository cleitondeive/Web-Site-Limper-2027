import React, { useEffect, useState } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import {
  PROMO_BADGE_COLOR_PRESETS,
  getContrastTextColor,
  normalizeHexColor,
  resolveProductBadgeStyle,
} from '../utils/commerce';

interface BadgeColorPickerProps {
  idPrefix: string;
  kind: 'promo' | 'highlight';
  title: string;
  subtitle: string;
  labelValue: string;
  onLabelChange: (nextLabel: string) => void;
  labelPlaceholder: string;
  quickLabelSuggestions: string[];
  colorValue: string;
  onColorChange: (nextHex: string) => void;
  previewFallbackText: string;
  uppercasePreview?: boolean;
}

export const BadgeColorPicker: React.FC<BadgeColorPickerProps> = ({
  idPrefix,
  kind,
  title,
  subtitle,
  labelValue,
  onLabelChange,
  labelPlaceholder,
  quickLabelSuggestions,
  colorValue,
  onColorChange,
  previewFallbackText,
  uppercasePreview = false,
}) => {
  const resolved = resolveProductBadgeStyle(colorValue, kind);
  const [hexDraft, setHexDraft] = useState(resolved.backgroundColor);

  useEffect(() => {
    setHexDraft(resolved.backgroundColor);
  }, [resolved.backgroundColor]);

  const handleHexInputChange = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 7);
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    setHexDraft(formatted);
    if (/^#[0-9A-F]{6}$/.test(formatted)) {
      onColorChange(formatted);
    }
  };

  const handleHexInputBlur = () => {
    const normalized = normalizeHexColor(hexDraft, resolved.backgroundColor);
    setHexDraft(normalized);
    if (normalized !== resolved.backgroundColor) {
      onColorChange(normalized);
    }
  };

  const defaultHex = kind === 'promo' ? '#E5B800' : '#FF6B00';
  const isPresetColor = PROMO_BADGE_COLOR_PRESETS.some(
    (p) => p.hex === resolved.backgroundColor
  );
  const previewText = labelValue.trim() || previewFallbackText;

  return (
    <div className="rounded-xl border border-zinc-200 bg-[#FAFAFA]/80 p-3.5 space-y-3 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header + Live Mini Preview */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <label
              htmlFor={`${idPrefix}-text`}
              className="flex items-center gap-2 text-xs font-extrabold text-zinc-900"
            >
              <span
                className="w-3 h-3 rounded-xs shrink-0 border border-black/10"
                style={{ backgroundColor: resolved.backgroundColor }}
                aria-hidden="true"
              />
              <span className="truncate">{title}</span>
            </label>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{subtitle}</p>
          </div>

          {resolved.isCustom && (
            <button
              type="button"
              onClick={() => onColorChange(defaultHex)}
              title="Restaurar cor padrão"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-[10px] font-bold text-zinc-600 cursor-pointer shrink-0 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Padrão</span>
            </button>
          )}
        </div>

        {/* Badge Copy Input */}
        <div className="space-y-1.5">
          <input
            id={`${idPrefix}-text`}
            type="text"
            value={labelValue}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={labelPlaceholder}
            className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-[#FFBE00] focus:outline-none rounded-lg text-xs font-semibold text-zinc-900"
          />
          <div className="flex flex-wrap gap-1.5">
            {quickLabelSuggestions.map((tag) => {
              const isSelected = labelValue === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onLabelChange(tag)}
                  className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-900 text-white font-bold'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette + Custom Color Picker */}
        <div className="pt-2.5 border-t border-zinc-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[11px] font-bold text-zinc-700 whitespace-nowrap shrink-0">
              Cor do selo
            </span>
            <span className="text-[10px] font-mono text-zinc-500 truncate">
              {resolved.presetName} · {resolved.backgroundColor}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PROMO_BADGE_COLOR_PRESETS.map((preset) => {
              const isSelected = resolved.backgroundColor === preset.hex;
              const checkColor = getContrastTextColor(preset.hex);
              return (
                <button
                  key={`${idPrefix}-swatch-${preset.id}`}
                  type="button"
                  onClick={() => onColorChange(preset.hex)}
                  title={`${preset.name} (${preset.hex})`}
                  aria-label={`Selecionar cor ${preset.name} para ${title}`}
                  aria-pressed={isSelected}
                  style={{ backgroundColor: preset.hex }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-transform active:scale-95 border ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-zinc-950 border-white scale-105'
                      : 'border-black/10 hover:scale-105'
                  }`}
                >
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 stroke-[3]"
                      style={{ color: checkColor }}
                    />
                  )}
                </button>
              );
            })}

            {/* Custom Color Wheel + Editable HEX */}
            <div
              className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg border bg-white transition-colors ${
                !isPresetColor
                  ? 'border-zinc-950 ring-1 ring-zinc-950/15'
                  : 'border-zinc-300 hover:border-zinc-400'
              }`}
            >
              <label
                htmlFor={`${idPrefix}-color-wheel`}
                className="relative inline-flex items-center gap-1 cursor-pointer select-none"
                title="Escolher qualquer cor personalizada"
              >
                <span
                  className="w-5 h-5 rounded-md border border-black/15 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: resolved.backgroundColor }}
                >
                  <Palette
                    className="w-3 h-3"
                    style={{ color: resolved.color }}
                  />
                </span>
                <span className="text-[10px] font-bold text-zinc-700 whitespace-nowrap">
                  Outra cor
                </span>
                <input
                  id={`${idPrefix}-color-wheel`}
                  type="color"
                  value={resolved.backgroundColor}
                  onChange={(e) =>
                    onColorChange(
                      normalizeHexColor(e.target.value, resolved.backgroundColor)
                    )
                  }
                  aria-label={`Escolher cor personalizada para ${title}`}
                  className="sr-only"
                />
              </label>

              <span className="w-px h-3.5 bg-zinc-200" aria-hidden="true" />

              <input
                type="text"
                value={hexDraft}
                onChange={(e) => handleHexInputChange(e.target.value)}
                onBlur={handleHexInputBlur}
                aria-label={`Código HEX da cor para ${title}`}
                placeholder={defaultHex}
                maxLength={7}
                className="w-16 bg-transparent font-mono text-[11px] font-bold text-zinc-800 focus:outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Badge Result Bar */}
      <div className="pt-2.5 border-t border-zinc-200/70 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-zinc-500 shrink-0">
          Prévia do selo:
        </span>
        <span
          className={`inline-block max-w-[75%] py-0.5 px-2.5 rounded text-[10px] font-extrabold truncate shadow-2xs ${
            uppercasePreview ? 'uppercase tracking-tight' : ''
          }`}
          style={{
            backgroundColor: resolved.backgroundColor,
            color: resolved.color,
          }}
        >
          {previewText}
        </span>
      </div>
    </div>
  );
};
