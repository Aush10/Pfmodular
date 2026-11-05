import React, { useState } from 'react';
import { HelpCircle, Check, X, ArrowRight, Calculator } from 'lucide-react';
import { MacaroniQueryRequest } from '../../engine/macaroni/types';

interface InteractiveQueryModalProps {
  query: MacaroniQueryRequest;
}

export const InteractiveQueryModal: React.FC<InteractiveQueryModalProps> = ({ query }) => {
  const [customVal, setCustomVal] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(
    query.options.some((o) => o.isCustomInput || o.label === '[]')
  );

  const handleSelect = (val: string) => {
    query.onSelect(val);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customVal.trim()) {
      query.onSelect(customVal.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/70 rounded-xl shadow-2xl p-5 text-amber-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-900/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-950/80 rounded-lg border border-amber-600/50 text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-amber-200 tracking-wide">
                Decision Context <span className="text-amber-400 font-mono text-sm">&lt;?&gt;</span>
              </h3>
              <p className="text-xs text-amber-300/70">Macro requires input to proceed</p>
            </div>
          </div>
          {query.onCancel && (
            <button
              onClick={query.onCancel}
              className="text-amber-400/60 hover:text-amber-200 transition-colors p-1"
              aria-label="Cancel query"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Prompt */}
        <div className="text-sm text-amber-100 bg-slate-950/70 p-3.5 rounded-lg border border-amber-900/40">
          <span className="font-semibold text-amber-300">Query: </span>
          {query.prompt || 'Choose an option to continue macro execution:'}
        </div>

        {/* Standard Options */}
        <div className="flex flex-wrap gap-2">
          {query.options.map((opt, idx) => {
            if (opt.isCustomInput || opt.label === '[]') return null;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt.value)}
                className="flex-1 min-w-[120px] px-4 py-2.5 bg-gradient-to-r from-amber-950/70 to-slate-800 hover:from-amber-900 hover:to-slate-700 border border-amber-600/50 hover:border-amber-400 rounded-lg text-sm font-medium text-amber-100 shadow transition-all duration-150 flex items-center justify-between group active:scale-95"
              >
                <span>{opt.label}</span>
                <ArrowRight className="w-4 h-4 text-amber-400/60 group-hover:text-amber-200 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>

        {/* Custom Input Option or Toggle */}
        {showCustomInput ? (
          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-2 pt-2 border-t border-amber-900/40">
            <label className="text-xs text-amber-300 font-mono flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Custom Expression [ ]
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                placeholder="e.g. 1d6 + 4 or manual value..."
                className="flex-1 bg-slate-950 border border-amber-700/60 rounded-lg px-3 py-1.5 text-sm text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400 font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={!customVal.trim()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm flex items-center gap-1 shadow transition-colors"
              >
                <Check className="w-4 h-4" /> Feed
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center pt-2 border-t border-amber-900/30">
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="text-xs text-amber-400/70 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
            >
              <Calculator className="w-3 h-3" /> Enter custom formula [ ]
            </button>
            {query.onCancel && (
              <button
                type="button"
                onClick={query.onCancel}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip / Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
