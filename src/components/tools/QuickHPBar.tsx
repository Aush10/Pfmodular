import React, { useState } from 'react';
import { Heart, Plus, Minus, ShieldAlert, Sparkles, X, RotateCcw } from 'lucide-react';
import { PF1Character } from '../../types/character';

interface QuickHPBarProps {
  character: PF1Character;
  hpStatus: { label: string; color: string; percent: number };
  onUpdateHP: (updates: { hpCurrent?: number; hpNonlethal?: number; hpTemp?: number }) => void;
  onClose?: () => void;
  isCompact?: boolean;
}

export const QuickHPBar: React.FC<QuickHPBarProps> = ({
  character,
  hpStatus,
  onUpdateHP,
  onClose,
  isCompact = false,
}) => {
  const [deltaAmount, setDeltaAmount] = useState<number>(5);

  const applyDamage = (amount: number) => {
    // Damage first depletes temp HP, then current HP
    let remainingDamage = amount;
    let newTemp = character.hpTemp;
    let newCurrent = character.hpCurrent;

    if (newTemp > 0) {
      if (newTemp >= remainingDamage) {
        newTemp -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= newTemp;
        newTemp = 0;
      }
    }

    newCurrent -= remainingDamage;
    onUpdateHP({ hpCurrent: newCurrent, hpTemp: newTemp });
  };

  const applyHealing = (amount: number) => {
    const newCurrent = Math.min(character.hpTotalMax, character.hpCurrent + amount);
    const newNonlethal = Math.max(0, character.hpNonlethal - amount);
    onUpdateHP({ hpCurrent: newCurrent, hpNonlethal: newNonlethal });
  };

  const applyNonlethal = (amount: number) => {
    onUpdateHP({ hpNonlethal: character.hpNonlethal + amount });
  };

  const applyFullRest = () => {
    onUpdateHP({
      hpCurrent: Math.min(character.hpTotalMax, character.hpCurrent + character.level),
      hpNonlethal: 0,
    });
  };

  const hpBarPercent = Math.max(
    0,
    Math.min(100, character.hpTotalMax > 0 ? (character.hpCurrent / character.hpTotalMax) * 100 : 0)
  );

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 ${isCompact ? '' : 'shadow-xl'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
          <h4 className="font-serif font-bold text-sm text-slate-200">Interactive Hit Points</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium bg-slate-950 ${hpStatus.color}`}>
            {hpStatus.label}
          </span>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual HP Bar */}
      <div className="space-y-1 mb-4">
        <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
          <div
            className={`h-full transition-all duration-300 ${
              hpBarPercent > 50
                ? 'bg-emerald-500'
                : hpBarPercent > 25
                ? 'bg-amber-500'
                : 'bg-rose-600'
            }`}
            style={{ width: `${hpBarPercent}%` }}
          />
          {character.hpTemp > 0 && (
            <div
              className="h-full bg-cyan-400 absolute top-0 right-0 opacity-80"
              style={{
                width: `${Math.min(
                  100,
                  (character.hpTemp / character.hpTotalMax) * 100
                )}%`,
              }}
            />
          )}
        </div>
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>
            Current: <strong className="text-slate-100">{character.hpCurrent}</strong> /{' '}
            {character.hpTotalMax}
          </span>
          {character.hpTemp > 0 && (
            <span className="text-cyan-300">Temp: +{character.hpTemp}</span>
          )}
          {character.hpNonlethal > 0 && (
            <span className="text-amber-400">Nonlethal: {character.hpNonlethal}</span>
          )}
        </div>
      </div>

      {/* Quick Adjustment Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Amount:</span>
          {[1, 5, 10, 20].map((num) => (
            <button
              key={num}
              onClick={() => setDeltaAmount(num)}
              className={`px-2 py-0.5 text-xs font-mono rounded border ${
                deltaAmount === num
                  ? 'bg-amber-600 text-slate-950 font-bold border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {num}
            </button>
          ))}
          <input
            type="number"
            min="1"
            value={deltaAmount}
            onChange={(e) => setDeltaAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => applyDamage(deltaAmount)}
            className="py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Damage {deltaAmount}</span>
          </button>
          <button
            onClick={() => applyHealing(deltaAmount)}
            className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Heal {deltaAmount}</span>
          </button>
          <button
            onClick={() => applyNonlethal(deltaAmount)}
            className="py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Nonlethal</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={applyFullRest}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Full Rest (Heal {character.level} HP & clear nonlethal)</span>
          </button>
          <button
            onClick={() => {
              const val = prompt('Set Temporary HP:', String(character.hpTemp));
              if (val !== null) onUpdateHP({ hpTemp: Math.max(0, parseInt(val) || 0) });
            }}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Set Temp HP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
