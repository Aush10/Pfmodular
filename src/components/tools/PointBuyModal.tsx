import React, { useEffect, useState } from 'react';
import { Calculator, X, Check, RotateCcw, Sparkles } from 'lucide-react';
import { AbilityName, PF1Character } from '../../types/character';
import { POINT_BUY_COST_TABLE, POINT_BUY_PRESETS, getPointBuyCost } from '../../engine/pf1eMath';
import { validatePointBuyAssignment } from '../../engine/companionSheet';

interface PointBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onApplyBaseScores: (scores: {
    bases: Record<AbilityName, number>;
    asi: Record<AbilityName, number>;
    budget: number;
  }) => void;
}

export const PointBuyModal: React.FC<PointBuyModalProps> = ({
  isOpen,
  onClose,
  character,
  onApplyBaseScores,
}) => {
  const abilities: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  // Base scores (clamped 6 to 18)
  const [baseScores, setBaseScores] = useState<Record<AbilityName, number>>({
    STR: Math.max(6, Math.min(18, character.abilities.STR.base || 10)),
    DEX: Math.max(6, Math.min(18, character.abilities.DEX.base || 10)),
    CON: Math.max(6, Math.min(18, character.abilities.CON.base || 10)),
    INT: Math.max(6, Math.min(18, character.abilities.INT.base || 10)),
    WIS: Math.max(6, Math.min(18, character.abilities.WIS.base || 10)),
    CHA: Math.max(6, Math.min(18, character.abilities.CHA.base || 10)),
  });

  // Level ASI (+1 every 4 levels: level 4, 8, 12, 16, 20)
  const totalAsiAllowed = Math.floor(character.level / 4);
  const [asiScores, setAsiScores] = useState<Record<AbilityName, number>>({
    STR: character.abilities.STR.levelAsiMod || 0,
    DEX: character.abilities.DEX.levelAsiMod || 0,
    CON: character.abilities.CON.levelAsiMod || 0,
    INT: character.abilities.INT.levelAsiMod || 0,
    WIS: character.abilities.WIS.levelAsiMod || 0,
    CHA: character.abilities.CHA.levelAsiMod || 0,
  });

  const [targetPool, setTargetPool] = useState<number>(character.pointBuyBudget ?? 20);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBaseScores({
      STR: Math.max(6, Math.min(18, character.abilities.STR.base || 10)),
      DEX: Math.max(6, Math.min(18, character.abilities.DEX.base || 10)),
      CON: Math.max(6, Math.min(18, character.abilities.CON.base || 10)),
      INT: Math.max(6, Math.min(18, character.abilities.INT.base || 10)),
      WIS: Math.max(6, Math.min(18, character.abilities.WIS.base || 10)),
      CHA: Math.max(6, Math.min(18, character.abilities.CHA.base || 10)),
    });
    setAsiScores({
      STR: character.abilities.STR.levelAsiMod || 0,
      DEX: character.abilities.DEX.levelAsiMod || 0,
      CON: character.abilities.CON.levelAsiMod || 0,
      INT: character.abilities.INT.levelAsiMod || 0,
      WIS: character.abilities.WIS.levelAsiMod || 0,
      CHA: character.abilities.CHA.levelAsiMod || 0,
    });
    setTargetPool(character.pointBuyBudget ?? 20);
    setSaveError(null);
  }, [isOpen]);

  // Total point buy calculation: 6=-5, 7=-4, 8=-2, 9=-1, 10=0, 11=1, 12=2, 13=3, 14=5, 15=7, 16=10, 17=13, 18=17
  const totalSpent = abilities.reduce((sum, ab) => sum + getPointBuyCost(baseScores[ab]), 0);
  const remaining = targetPool - totalSpent;

  // Total ASI spent
  const totalAsiSpent = abilities.reduce((sum, ab) => sum + (asiScores[ab] || 0), 0);

  const updateBase = (name: AbilityName, delta: number) => {
    setSaveError(null);
    setBaseScores((prev) => {
      const current = prev[name];
      const next = current + delta;
      if (next < 6 || next > 18) return prev; // min 6, max 18
      return { ...prev, [name]: next };
    });
  };

  const updateAsi = (name: AbilityName, delta: number) => {
    setSaveError(null);
    setAsiScores((prev) => {
      const current = prev[name] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      return { ...prev, [name]: next };
    });
  };

  const handleReset = () => {
    setBaseScores({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
    setAsiScores({ STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 });
  };

  const handleSave = () => {
    const decision = validatePointBuyAssignment({
      scores: baseScores,
      budget: targetPool,
      asi: asiScores,
      level: character.level,
    });
    if (!decision.ok) {
      setSaveError(decision.reason);
      return;
    }
    setSaveError(null);
    onApplyBaseScores({ bases: baseScores, asi: asiScores, budget: targetPool });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-base text-amber-200 tracking-wide">
              Pathfinder 1e Point Buy & Ability Score Calculator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campaign Preset & Points Pool Indicator */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 shrink-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Campaign Fantasy Budget:
            </div>
            <div className="flex items-center gap-1.5">
              {POINT_BUY_PRESETS.map((p) => (
                <button
                  key={p.points}
                  onClick={() => {
                    setSaveError(null);
                    setTargetPool(p.points);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all border ${
                    targetPool === p.points
                      ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.name.split(' ')[0]} ({p.points}p)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Point Buy Spent:</span>
              <span className="font-bold text-amber-300">
                {totalSpent} / {targetPool} pts
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  remaining === 0
                    ? 'text-emerald-400 bg-emerald-950/60'
                    : remaining > 0
                    ? 'text-sky-400 bg-sky-950/60'
                    : 'text-red-400 bg-red-950/60'
                }`}
              >
                {remaining >= 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Level ASI (+1/4 lvls):</span>
              <span className="font-bold text-cyan-300">
                {totalAsiSpent} / {totalAsiAllowed} pts
              </span>
              <span className="text-[11px] text-slate-500">
                Level {character.level}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Ability Scores Table with Racial, ASI, Total ABS, and ASB */}
        <div className="p-4 flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400 pb-2">
                <th className="pb-2">Ability</th>
                <th className="pb-2 text-center">Point Buy (6-18)</th>
                <th className="pb-2 text-center">Cost</th>
                <th className="pb-2 text-center">Racial (+2/+4)</th>
                <th className="pb-2 text-center">Level ASI</th>
                <th className="pb-2 text-center">Total ABS</th>
                <th className="pb-2 text-center font-bold text-amber-300">ASB (Mod)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {abilities.map((ab) => {
                const base = baseScores[ab];
                const cost = getPointBuyCost(base);
                const racial = character.abilities[ab].raceMod || 0;
                const asi = asiScores[ab] || 0;
                // Total ABS = Base + Race + ASI (bypasses limits)
                const totalAbs = base + racial + asi;
                // ASB = floor((ABS - 10) / 2)
                const asb = Math.floor((totalAbs - 10) / 2);

                return (
                  <tr key={ab} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-serif font-bold text-amber-200 text-sm">
                      {ab}
                    </td>

                    {/* Point Buy Base (6 to 18) */}
                    <td className="py-2.5 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        <button
                          onClick={() => updateBase(ab, -1)}
                          disabled={base <= 6}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center disabled:opacity-20"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-slate-100 tabular-nums">
                          {base}
                        </span>
                        <button
                          onClick={() => updateBase(ab, 1)}
                          disabled={base >= 18}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center disabled:opacity-20"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Cost in points */}
                    <td className="py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        {cost > 0 ? `+${cost}` : cost} pts
                      </span>
                    </td>

                    {/* Racial Mod */}
                    <td className="py-2.5 text-center">
                      <span
                        className={`font-semibold ${
                          racial > 0
                            ? 'text-emerald-400'
                            : racial < 0
                            ? 'text-red-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {racial > 0 ? `+${racial}` : racial}
                      </span>
                    </td>

                    {/* Level ASI */}
                    <td className="py-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => updateAsi(ab, -1)}
                          disabled={asi <= 0}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center justify-center disabled:opacity-20"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-cyan-300 font-bold">{asi}</span>
                        <button
                          onClick={() => updateAsi(ab, 1)}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Total ABS */}
                    <td className="py-2.5 text-center">
                      <span className="font-bold text-sm text-slate-100 tabular-nums">
                        {totalAbs}
                      </span>
                    </td>

                    {/* ASB (Ability Score Bonus) */}
                    <td className="py-2.5 text-center">
                      <span className="font-bold text-sm px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums">
                        {asb >= 0 ? `+${asb}` : asb}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Reference Note */}
          <div className="mt-4 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-amber-400">Point Buy Scale:</span> 6 (-5), 7 (-4), 8 (-2), 9 (-1), 10 (0), 11 (1), 12 (2), 13 (3), 14 (5), 15 (7), 16 (10), 17 (13), 18 (17). Racial modifiers and Level ASI bypass the 6–18 limits and do not increase the point cost. ASB is calculated as <code>floor((ABS - 10) / 2)</code>.
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to 10s</span>
          </button>
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="max-w-xs text-[11px] text-red-300 text-right">{saveError}</span>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
