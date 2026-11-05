import React from 'react';
import {
  GLYPH_DEFINITIONS,
  GlyphStyle,
  extractGlyphId,
  getGlyphUrl,
} from '../../data/glyphs';

interface GlyphPickerProps {
  value?: string;
  onChange: (glyphIdOrEmpty: string) => void;
  glyphStyle?: GlyphStyle;
  label?: string;
  compact?: boolean;
}

export const GlyphPicker: React.FC<GlyphPickerProps> = ({
  value = '',
  onChange,
  glyphStyle = '01-flat-enamel',
  label = 'Assign Glyph (Optional)',
  compact = false,
}) => {
  const selectedGlyphId = extractGlyphId(value);
  const previewStyle: Exclude<GlyphStyle, 'none'> =
    glyphStyle === 'none' ? '01-flat-enamel' : glyphStyle;

  return (
    <div className="space-y-1">
      {label && (
        <span className="block text-[10px] font-mono uppercase opacity-75">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`${
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
          } font-mono font-bold rounded border transition-all ${
            !selectedGlyphId && !value
              ? 'bg-amber-500/20 border-amber-500 text-amber-500 ring-1 ring-amber-500/40'
              : 'bg-black/10 dark:bg-white/5 border-black/20 dark:border-white/15 opacity-70 hover:opacity-100'
          }`}
          title="No glyph assigned"
        >
          None
        </button>
        {GLYPH_DEFINITIONS.map((g) => {
          const isSelected = selectedGlyphId === g.id;
          const url = getGlyphUrl(g.id, previewStyle, '01-flat-enamel');
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(isSelected ? '' : g.id)}
              title={`${g.name} (${g.category})`}
              className={`relative rounded border transition-all flex items-center justify-center overflow-hidden shrink-0 ${
                compact ? 'w-6 h-6 p-0.5' : 'w-8 h-8 p-1'
              } ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/50 scale-105'
                  : 'border-black/20 dark:border-white/15 bg-black/10 dark:bg-white/5 hover:border-amber-500/50 opacity-85 hover:opacity-100'
              }`}
            >
              {url && (
                <img
                  src={url}
                  alt={g.name}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

