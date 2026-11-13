import React from 'react';
import {
  FilePlus,
  RotateCcw,
  Download,
  X,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Check,
} from 'lucide-react';

interface NewSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBlank: () => void;
  onConfirmDefault: () => void;
  onExportBackup: () => void;
  characterName: string;
}

export const NewSheetModal: React.FC<NewSheetModalProps> = ({
  isOpen,
  onClose,
  onConfirmBlank,
  onConfirmDefault,
  onExportBackup,
  characterName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-serif">
                Start New Sheet / Clear All
              </h2>
              <p className="text-xs text-slate-400">
                Replace active sheet for <span className="text-amber-300 font-semibold">{characterName || 'Unnamed'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300 block mb-0.5">Starting a new sheet resets your current character.</strong>
              If you have progress you want to keep, download a JSON backup file first with the button below. You can always re-import it anytime!
            </div>
          </div>

          {/* Quick Backup Button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Save current sheet to your computer:</span>
            </div>
            <button
              onClick={onExportBackup}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Export JSON Backup</span>
            </button>
          </div>

          {/* Options */}
          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Choose New Sheet Template
            </span>

            {/* Option 1: Blank Level 1 */}
            <button
              onClick={() => {
                onConfirmBlank();
                onClose();
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-left transition-all group flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <FilePlus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                    Blank Slate (Level 1 Clean Sheet)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Recommended for new character
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Fresh 1st-level adventurer with base 10 scores, 0 skill ranks, standard adventurer backpack, empty weapon & spell list.
                </p>
              </div>
            </button>

            {/* Option 2: Reset to Iconic Valerius */}
            <button
              onClick={() => {
                onConfirmDefault();
                onClose();
              }}
              className="w-full p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/60 text-left transition-all group flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                    Reset to Iconic Demo (Valerius Lvl 12)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Full Features Showcase
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Pre-populated 12th-level Fighter/Dragon Disciple with complete weapons, magic items, custom macros, spells, and typed buff matrix.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel (Keep Current Sheet)
          </button>
        </div>
      </div>
    </div>
  );
};
