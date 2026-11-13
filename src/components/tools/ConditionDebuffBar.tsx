import React from 'react';
import { Shield, AlertTriangle, Sparkles, CheckSquare, Square, X } from 'lucide-react';
import { ConditionState } from '../../types/character';
import { evaluateConditions } from '../../engine/pf1eMath';

interface ConditionDebuffBarProps {
  conditions: ConditionState;
  onToggleCondition: (key: keyof ConditionState) => void;
  onClearAll?: () => void;
  isCollapsible?: boolean;
}

export const ConditionDebuffBar: React.FC<ConditionDebuffBarProps> = ({
  conditions,
  onToggleCondition,
  onClearAll,
}) => {
  const penalties = evaluateConditions(conditions);
  const activeCount = Object.values(conditions).filter(Boolean).length;

  const debuffList: Array<{ key: keyof ConditionState; label: string; isBuff?: boolean }> = [
    { key: 'shaken', label: 'Shaken (-2)' },
    { key: 'sickened', label: 'Sickened (-2)' },
    { key: 'fatigued', label: 'Fatigued (-2 STR/DEX)' },
    { key: 'exhausted', label: 'Exhausted (-6 STR/DEX)' },
    { key: 'entangled', label: 'Entangled (-4 DEX, -2 Atk)' },
    { key: 'prone', label: 'Prone (-4 Melee)' },
    { key: 'blinded', label: 'Blinded (No DEX to AC)' },
    { key: 'frightened', label: 'Frightened (-2)' },
    { key: 'grappled', label: 'Grappled (-4 DEX)' },
    { key: 'pinned', label: 'Pinned (-4 AC)' },
    { key: 'dazzled', label: 'Dazzled (-1 Atk)' },
    { key: 'deafened', label: 'Deafened (-4 Init)' },
    { key: 'stunned', label: 'Stunned (No DEX)' },
    // Buffs
    { key: 'haste', label: 'Haste (+1 Atk/AC/Ref)', isBuff: true },
    { key: 'prayer', label: 'Prayer (+1 Luck)', isBuff: true },
    { key: 'heroism', label: 'Heroism (+2 Morale)', isBuff: true },
    { key: 'enlarge', label: 'Enlarge Person', isBuff: true },
    { key: 'reduce', label: 'Reduce Person', isBuff: true },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-200">
            Active Conditions & Buffs
          </h4>
          {activeCount > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {activeCount} Active
            </span>
          )}
        </div>
        {activeCount > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Quick toggle chips */}
      <div className="flex flex-wrap gap-1.5">
        {debuffList.map((item) => {
          const isActive = conditions[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleCondition(item.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 transition-all ${
                isActive
                  ? item.isBuff
                    ? 'bg-sky-950/80 border-sky-500 text-sky-200 font-bold'
                    : 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {isActive ? (
                item.isBuff ? (
                  <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                )
              ) : (
                <Square className="w-3 h-3 opacity-40 shrink-0" />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live penalty breakdown if any active */}
      {penalties.notes.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1">
          <div className="font-semibold text-slate-400">Current Combat Penalties / Bonuses:</div>
          <div className="flex flex-wrap gap-2 text-slate-300 font-mono">
            {penalties.notes.map((note, idx) => (
              <span key={idx} className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                • {note}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
