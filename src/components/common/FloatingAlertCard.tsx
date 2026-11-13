import React from 'react';
import { X, ExternalLink, Sparkles, Bell, AlertTriangle } from 'lucide-react';
import { UiMakePreset } from '../../types/character';

export interface FloatingAlertCardProps {
  message: string;
  preset?: UiMakePreset;
  onDismiss: () => void;
  tag?: number;
}

export const FloatingAlertCard: React.FC<FloatingAlertCardProps> = ({
  message,
  preset,
  onDismiss,
  tag,
}) => {
  const theme = preset?.theme || 'default_amber';
  const font = preset?.font || 'serif';
  const layout = preset?.layout || 'floating_card';

  // Palette styling
  const themeStyles = {
    crimson_gold: 'bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 border-amber-500/80 text-amber-100 shadow-red-950/50',
    celestial_cyan: 'bg-gradient-to-br from-cyan-950 via-slate-900 to-sky-950 border-cyan-400/80 text-cyan-100 shadow-cyan-950/50',
    toxic_emerald: 'bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 border-emerald-400/80 text-emerald-100 shadow-emerald-950/50',
    necrotic_slate: 'bg-gradient-to-br from-slate-950 via-purple-950/40 to-black border-slate-700 text-slate-200 shadow-black/80',
    default_amber: 'bg-slate-950/95 border-amber-500/60 text-amber-200 shadow-amber-950/40',
  }[theme];

  // Font styling
  const fontClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    gothic: 'font-serif tracking-wide',
  }[font];

  // Layout container classes
  const layoutClasses = {
    floating_card: 'fixed top-6 right-6 z-50 max-w-sm w-full',
    banner: 'fixed top-0 left-0 right-0 z-50 w-full flex justify-center py-2 px-4',
    modal: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4',
    toast: 'fixed bottom-6 right-6 z-50 max-w-xs w-full',
  }[layout];

  return (
    <div className={`${layoutClasses} animate-in fade-in slide-in-from-top-4 duration-200`}>
      <div
        className={`rounded-xl border p-4 shadow-2xl backdrop-blur-md relative ${themeStyles} ${fontClass} ${
          layout === 'banner' ? 'max-w-2xl w-full' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {preset?.imageUrl ? (
              <img
                src={preset.imageUrl}
                alt={preset.name}
                className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="p-2 rounded-lg bg-black/30 border border-white/10 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-90 truncate">
                  {preset?.name || 'Tabletop Event'}
                </h4>
                {tag !== undefined && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-300 border border-amber-500/30">
                    &lt;{tag}&gt;
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold mt-1 leading-snug break-words">
                {message}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hyperlink or Action footer if present */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
          {preset?.hyperlinkUrl ? (
            <a
              href={preset.hyperlinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 hover:underline text-[11px]"
            >
              <span>{preset.hyperlinkLabel || 'View Reference'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[10px] opacity-60">Macaroni UI Make Construct</span>
          )}

          <button
            onClick={onDismiss}
            className="px-3 py-1 rounded bg-white/15 hover:bg-white/25 text-white font-medium text-xs transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
