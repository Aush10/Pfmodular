import React, { useState } from 'react';
import { Dices, RotateCcw, Sparkles, X, ChevronRight } from 'lucide-react';
import { executeDiceRoll, DiceRollOutcome } from '../../engine/formula';

interface DiceRollerTrayProps {
  isOpen: boolean;
  onClose: () => void;
  presetFormula?: string;
  onRollComplete?: (outcome: DiceRollOutcome) => void;
}

export const DiceRollerTray: React.FC<DiceRollerTrayProps> = ({
  isOpen,
  onClose,
  presetFormula,
  onRollComplete,
}) => {
  const [formulaInput, setFormulaInput] = useState(presetFormula || '1d20+7');
  const [history, setHistory] = useState<DiceRollOutcome[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceRollOutcome | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Update formula when presetFormula changes
  React.useEffect(() => {
    if (presetFormula) {
      setFormulaInput(presetFormula);
      handleRoll(presetFormula);
    }
  }, [presetFormula]);

  const handleRoll = (formulaToRoll?: string) => {
    const expr = formulaToRoll || formulaInput;
    if (!expr.trim()) return;

    setIsRolling(true);
    setTimeout(() => {
      const outcome = executeDiceRoll(expr);
      setLastRoll(outcome);
      setHistory((prev) => [outcome, ...prev.slice(0, 19)]);
      setIsRolling(false);
      if (onRollComplete) onRollComplete(outcome);
    }, 180);
  };

  const addDie = (die: string) => {
    setFormulaInput((prev) => {
      if (!prev || prev === '0') return die;
      return `${prev}+${die}`;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-base text-amber-200 tracking-wide">
              Pathfinder Dice Tray
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Roll Outcome Area */}
        <div className="p-6 bg-radial from-slate-800/80 to-slate-900 flex flex-col items-center justify-center text-center border-b border-slate-800/60 min-h-[140px]">
          {lastRoll ? (
            <div className={`transition-all duration-200 ${isRolling ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}>
              <div className="text-xs font-mono text-slate-400 mb-1">{lastRoll.formula}</div>
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`text-5xl font-mono font-black tabular-nums tracking-tight ${
                    lastRoll.isNat20
                      ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse'
                      : lastRoll.isNat1
                      ? 'text-red-500'
                      : 'text-amber-100'
                  }`}
                >
                  {lastRoll.total}
                </span>
                {lastRoll.isNat20 && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                    Nat 20!
                  </span>
                )}
                {lastRoll.isNat1 && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded">
                    Nat 1
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400 max-w-xs break-words">
                {lastRoll.textOutput}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-sm flex flex-col items-center gap-1.5">
              <Dices className="w-8 h-8 opacity-40" />
              <span>Tap a quick die or enter a formula to roll</span>
            </div>
          )}
        </div>

        {/* Quick Dice Bar */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between gap-1.5 flex-wrap">
          {['1d20', '1d12', '1d10', '1d8', '1d6', '1d4', '1d100'].map((d) => (
            <button
              key={d}
              onClick={() => addDie(d)}
              className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-800/80 hover:bg-amber-600 hover:text-white text-slate-300 rounded border border-slate-700/60 transition-colors"
            >
              +{d}
            </button>
          ))}
          <button
            onClick={() => setFormulaInput('')}
            title="Clear formula"
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom Formula Input & Roll Button */}
        <div className="p-4 flex gap-2">
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoll()}
            placeholder="e.g. 1d20+12 or 2d6+7"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => handleRoll()}
            disabled={isRolling}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold text-sm rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Roll</span>
          </button>
        </div>

        {/* History List */}
        {history.length > 0 && (
          <div className="px-5 pb-4 flex-1 overflow-y-auto max-h-48">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Recent Rolls
            </div>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setFormulaInput(h.formula);
                    handleRoll(h.formula);
                  }}
                  className="px-3 py-1.5 bg-slate-950/60 hover:bg-slate-800/60 rounded border border-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <span className="font-mono text-slate-300">{h.formula}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 truncate max-w-[150px]">
                      {h.textOutput}
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                      {h.total}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
