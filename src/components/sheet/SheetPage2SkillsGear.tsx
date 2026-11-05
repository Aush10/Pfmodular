import React, { useState, useMemo } from 'react';
import {
  Dices,
  Plus,
  Trash2,
  Package,
  Coins,
  Languages,
  Search,
  Scale,
  Sparkles,
} from 'lucide-react';
import { PF1Character, SkillItem, InventoryItem, AbilityName, SkillPointsConfig } from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';
import { FieldCallTooltip } from '../common/FieldCallTooltip';

interface SheetPage2SkillsGearProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula: (formula: string, label?: string) => void;
  visibleModules: Record<string, boolean>;
}

export const SheetPage2SkillsGear: React.FC<SheetPage2SkillsGearProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
  visibleModules,
}) => {
  const [skillSearch, setSkillSearch] = useState('');

  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-amber-50/70 border-amber-800/20 text-stone-900 shadow-sm'
    : isBlueprint
    ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-50'
    : isMythWeavers
    ? 'bg-[#15171a] border-[#2d3139] text-slate-100'
    : 'bg-white border-black text-black';

  const headerBg = isParchment
    ? 'bg-amber-900/10 border-amber-900/20 text-amber-950 font-serif'
    : isBlueprint
    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 font-mono'
    : isMythWeavers
    ? 'bg-[#0f1113] border-[#2d3139] text-amber-400 font-serif'
    : 'bg-neutral-100 border-black text-black font-sans';

  const inputStyle = isParchment
    ? 'bg-white/80 border-amber-900/30 text-stone-900 focus:border-amber-700 focus:bg-white'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  const setField = <K extends keyof PF1Character>(key: K, value: PF1Character[K]) => {
    onUpdateCharacter((prev) => ({ ...prev, [key]: value }));
  };

  const updateSkill = (id: string, updates: Partial<SkillItem>) => {
    setField(
      'skills',
      character.skills.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk))
    );
  };

  const addInventoryItem = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: 'New Item',
      quantity: 1,
      weight: 1,
      location: 'Backpack',
    };
    setField('inventory', [...character.inventory, newItem]);
  };

  const removeInventoryItem = (id: string) => {
    setField('inventory', character.inventory.filter((it) => it.id !== id));
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setField(
      'inventory',
      character.inventory.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  // Skill points configuration state helpers (Requirement 10)
  const spConfig: SkillPointsConfig = character.skillPointsConfig || {};
  const [selectedClassId, setSelectedClassId] = useState<string>('class1');

  const updateSpConfig = (updates: Partial<SkillPointsConfig>) => {
    setField('skillPointsConfig', {
      ...spConfig,
      ...updates,
    });
  };

  // Build the list of classes from classes or customClassGrids or default
  const careerClasses = useMemo(() => {
    const list: Array<{ id: string; name: string; level: number; sp: number }> = [];
    if (character.classes && character.classes.length > 0) {
      character.classes.forEach((c, idx) => {
        list.push({
          id: c.id || `class${idx + 1}`,
          name: c.name || `Class ${idx + 1}`,
          level: c.level || 1,
          sp:
            spConfig.classSpOverrides?.[c.id] ??
            c.skillPointsPerLevel ??
            character.classSkillPointsPerLevel ??
            2,
        });
      });
    } else if (character.customClassGrids && Object.keys(character.customClassGrids).length > 0) {
      Object.entries(character.customClassGrids).forEach(([cid, grid], idx) => {
        list.push({
          id: cid,
          name: grid.className || `Class ${idx + 1}`,
          level: grid.level || character.level,
          sp: spConfig.classSpOverrides?.[cid] ?? grid.skillPointsPerLevel ?? 2,
        });
      });
    } else {
      list.push({
        id: 'class1',
        name: character.characterClass || 'Class 1',
        level: character.level,
        sp: character.classSkillPointsPerLevel ?? 2,
      });
    }
    return list;
  }, [
    character.classes,
    character.customClassGrids,
    character.characterClass,
    character.level,
    character.classSkillPointsPerLevel,
    spConfig.classSpOverrides,
  ]);

  const activeCareerClass =
    careerClasses.find((c) => c.id === selectedClassId) ||
    careerClasses[0] || {
      id: 'class1',
      name: 'Class 1',
      level: character.level,
      sp: character.classSkillPointsPerLevel ?? 2,
    };

  // Skill calculations (Requirement 1.3 & 10)
  const spStats = derived.skillPointsStats;
  const filteredSkills = character.skills.filter((sk) =>
    sk.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const handleRankChange = (id: string, requestedVal: number) => {
    const currentSkill = character.skills.find((s) => s.id === id);
    if (!currentSkill) return;

    // Rule 1: Cannot have more skill points in one skill than character level
    const clampedToLevel = Math.max(0, Math.min(character.level, requestedVal));
    const delta = clampedToLevel - (currentSkill.ranks || 0);

    // Rule 2: Cannot invest more total SP than afforded by max
    if (delta > 0 && spStats.remaining < delta) {
      // Allow only up to available remaining points
      const allowedRank = Math.min(clampedToLevel, (currentSkill.ranks || 0) + Math.max(0, spStats.remaining));
      updateSkill(id, { ranks: allowedRank });
      return;
    }

    updateSkill(id, { ranks: clampedToLevel });
  };

  // Wealth conversion to GP
  const totalWealthGP =
    (character.currency.cp || 0) * 0.01 +
    (character.currency.sp || 0) * 0.1 +
    (character.currency.gp || 0) +
    (character.currency.pp || 0) * 10;

  return (
    <div className={`space-y-4 ${fontClass} transition-colors duration-200`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Complete 35-Skill Matrix (7 Cols) */}
        {visibleModules.skills && (
          <div className={`lg:col-span-7 border rounded-lg overflow-hidden ${cardBg}`}>
            {/* Skills Header with SP Budget & Limits */}
            <div className={`px-4 py-2 border-b flex items-center justify-between flex-wrap gap-2 ${headerBg}`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Skills Matrix
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    spStats.isOverspent
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                      : spStats.remaining === 0
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  SP: {spStats.totalSpent} / {spStats.maxAfforded} Max
                  {spStats.remaining > 0 ? ` (${spStats.remaining} left)` : spStats.isOverspent ? ` (Overspent!)` : ''}
                </span>
                <span className="text-[10px] opacity-75 font-mono hidden sm:inline">
                  (Max {character.level}/skill)
                </span>
              </div>
              <div className="relative w-36">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 opacity-50" />
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="Filter skills..."
                  className={`w-full text-xs pl-7 pr-2 py-0.5 rounded border ${inputStyle}`}
                />
              </div>
            </div>

            {/* Skill Points Interactive Calculator Bar (Multistalt System) */}
            <div className="px-4 py-2 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                  {/* INT Mod (Adjustable) */}
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded border border-black/10 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500">INT:</span>
                    <input
                      type="number"
                      value={spConfig.intOverride !== undefined ? spConfig.intOverride : derived.intMod}
                      onChange={(e) => updateSpConfig({ intOverride: parseInt(e.target.value) || 0 })}
                      className={`w-9 text-center py-0.5 rounded border text-xs font-bold ${inputStyle}`}
                      title="INT modifier for skill points (defaults to derived INT mod, adjustable)"
                    />
                    {spConfig.intOverride !== undefined && spConfig.intOverride !== derived.intMod && (
                      <button
                        onClick={() => updateSpConfig({ intOverride: undefined })}
                        className="text-[9px] text-amber-500 hover:underline ml-0.5"
                        title="Reset to derived INT modifier"
                      >
                        reset
                      </button>
                    )}
                  </div>

                  {/* Class Selector Dropdown & Adjustable Base SP & Automatic Level */}
                  <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded border border-black/10 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Class:</span>
                    <select
                      value={activeCareerClass.id}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${inputStyle}`}
                      title="Select class from career to adjust base skill points"
                    >
                      {careerClasses.map((c, i) => (
                        <option key={c.id} value={c.id}>
                          {c.name || `Class ${i + 1}`}
                        </option>
                      ))}
                    </select>

                    <span className="text-[10px] opacity-70">Base SP:</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={activeCareerClass.sp}
                      onChange={(e) => {
                        const newSp = parseInt(e.target.value) || 2;
                        const updatedOverrides = {
                          ...(spConfig.classSpOverrides || {}),
                          [activeCareerClass.id]: newSp,
                        };
                        updateSpConfig({ classSpOverrides: updatedOverrides });
                        if (activeCareerClass.id === 'class1') {
                          setField('classSkillPointsPerLevel', newSp);
                        }
                        if (character.classes) {
                          setField(
                            'classes',
                            character.classes.map((c) =>
                              c.id === activeCareerClass.id ? { ...c, skillPointsPerLevel: newSp } : c
                            )
                          );
                        }
                      }}
                      className={`w-9 text-center py-0.5 rounded border text-xs font-bold ${inputStyle}`}
                      title="Adjustable base skill points per level for this class"
                    />

                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                      Lvl {activeCareerClass.level} <span className="text-[9px] opacity-70 font-normal">(auto)</span>
                    </span>
                  </div>

                  {/* Extra Per Level (Adjustable) x Level (Automatic) */}
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded border border-black/10 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Extra/Lvl:</span>
                    <input
                      type="number"
                      min="0"
                      value={spConfig.extraPerLevel ?? 0}
                      onChange={(e) => updateSpConfig({ extraPerLevel: parseInt(e.target.value) || 0 })}
                      className={`w-8 text-center py-0.5 rounded border text-xs ${inputStyle}`}
                      title="Extra skill points per level (e.g. human bonus, adjustable)"
                    />
                    <span className="text-[10px] opacity-80">× Lvl {character.level} (auto)</span>
                  </div>

                  {/* Bonus (Adjustable flat pool) */}
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded border border-black/10 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Bonus:</span>
                    <input
                      type="number"
                      value={spConfig.bonusFlat ?? (character.favoredClassSkillRanks ?? 0)}
                      onChange={(e) => updateSpConfig({ bonusFlat: parseInt(e.target.value) || 0 })}
                      className={`w-9 text-center py-0.5 rounded border text-xs ${inputStyle}`}
                      title="Adjustable flat bonus skill points (e.g. feats, favored class, background skills)"
                    />
                  </div>
                </div>

                {/* Total Available SP & Manual Override */}
                <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded border border-black/15 dark:border-white/15">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total SP:
                  </span>
                  {spConfig.isManualOverride ? (
                    <input
                      type="number"
                      min="0"
                      value={spConfig.manualOverride ?? spStats.maxAfforded}
                      onChange={(e) => updateSpConfig({ manualOverride: parseInt(e.target.value) || 0 })}
                      className={`w-14 text-center py-0.5 rounded border text-xs font-bold text-amber-500 ${inputStyle}`}
                      title="Manual override for Total Available SP"
                    />
                  ) : (
                    <span className="font-bold text-xs text-amber-500 font-mono">
                      {spStats.maxAfforded}
                    </span>
                  )}

                  <label className="flex items-center gap-1 text-[10px] cursor-pointer ml-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!spConfig.isManualOverride}
                      onChange={(e) =>
                        updateSpConfig({
                          isManualOverride: e.target.checked,
                          manualOverride: e.target.checked ? spStats.maxAfforded : undefined,
                        })
                      }
                      className="rounded text-amber-500"
                    />
                    <span>Override</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-2 overflow-x-auto max-h-[820px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xs text-[10px] uppercase font-mono border-b border-black/10 dark:border-white/10 z-10">
                  <tr>
                    <th className="pb-1 w-7 text-center" title="Class Skill (+3 bonus if trained)">
                      CS
                    </th>
                    <th className="pb-1">Skill Name</th>
                    <th className="pb-1 text-center w-10">Key</th>
                    <th className="pb-1 text-center w-10">Mod</th>
                    <th className="pb-1 text-center w-12" title="Max ranks = Character Level">Rank</th>
                    <th className="pb-1 text-center w-10">Misc</th>
                    <th className="pb-1 text-center w-8" title="Armor Check Penalty applies">
                      ACP
                    </th>
                    <th className="pb-1 text-center font-bold w-12">Total</th>
                    <th className="pb-1 text-center w-8">Roll</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredSkills.map((sk) => {
                    const abMod = (derived as any)[`${sk.keyAbility.toLowerCase()}Mod`] || 0;
                    const isTrained = sk.ranks > 0;
                    const classSkillBonus = sk.isClassSkill && isTrained ? 3 : 0;
                    const acpPenalty = sk.hasArmorCheckPenalty ? derived.armorCheckPenaltyTotal : 0;
                    const totalSkillMod = abMod + sk.ranks + classSkillBonus + sk.miscMod + acpPenalty;

                    return (
                      <tr key={sk.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-1 text-center">
                          <input
                            type="checkbox"
                            checked={sk.isClassSkill}
                            onChange={(e) => updateSkill(sk.id, { isClassSkill: e.target.checked })}
                            className="rounded text-amber-500"
                            title="Class Skill"
                          />
                        </td>
                        <td className="py-1 font-medium">
                          <FieldCallTooltip
                            callName={`#${sk.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                            description={`${sk.name} total bonus (hover 3s to copy)`}
                          >
                            <span className="cursor-help hover:text-amber-500 transition-colors">{sk.name}</span>
                          </FieldCallTooltip>
                          {sk.isTrainedOnly && (
                            <span className="ml-1 text-[9px] opacity-60 font-mono">⚑</span>
                          )}
                        </td>
                        <td className="py-1 text-center">
                          <select
                            value={sk.keyAbility}
                            onChange={(e) =>
                              updateSkill(sk.id, { keyAbility: e.target.value as AbilityName })
                            }
                            className={`text-[10px] font-mono px-1 py-0.5 rounded border ${inputStyle} font-bold`}
                            title="Change Key Ability score for this skill"
                          >
                            {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ab) => (
                              <option key={ab} value={ab}>
                                {ab}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 text-center font-mono text-[11px] tabular-nums">
                          {abMod >= 0 ? `+${abMod}` : abMod}
                        </td>
                        {/* Clamped to level & max afforded budget */}
                        <td className="py-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max={character.level}
                            value={sk.ranks}
                            onChange={(e) =>
                              handleRankChange(sk.id, parseInt(e.target.value) || 0)
                            }
                            className={`w-11 text-center py-0.5 font-mono text-xs rounded border tabular-nums ${inputStyle} ${
                              sk.ranks >= character.level ? 'font-bold text-amber-600 dark:text-amber-400' : ''
                            }`}
                            title={`Max ${character.level} ranks`}
                          />
                        </td>
                        <td className="py-1 text-center">
                          <input
                            type="number"
                            value={sk.miscMod}
                            onChange={(e) =>
                              updateSkill(sk.id, { miscMod: parseInt(e.target.value) || 0 })
                            }
                            className={`w-10 text-center py-0.5 font-mono text-xs rounded border tabular-nums ${inputStyle}`}
                          />
                        </td>
                        <td className="py-1 text-center font-mono text-[10px]">
                          {sk.hasArmorCheckPenalty ? (
                            <span className="text-amber-500 font-bold">
                              {derived.armorCheckPenaltyTotal}
                            </span>
                          ) : (
                            <span className="opacity-30">-</span>
                          )}
                        </td>
                        <td className="py-1 text-center">
                          <span
                            className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded tabular-nums ${
                              totalSkillMod >= 10
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black'
                                : 'bg-black/5 dark:bg-white/10'
                            }`}
                          >
                            {totalSkillMod >= 0 ? `+${totalSkillMod}` : totalSkillMod}
                          </span>
                        </td>
                        <td className="py-1 text-center">
                          <button
                            onClick={() => onRollFormula(`1d20+${totalSkillMod}`, `${sk.name} Check`)}
                            className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                            title={`Roll 1d20+${totalSkillMod}`}
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Right Column: Inventory, Encumbrance, Currency & Languages (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Inventory & Possessions Table */}
          {visibleModules.inventory && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs uppercase tracking-wider">Other Possessions</span>
                </div>
                <button
                  onClick={addInventoryItem}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="p-3">
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {character.inventory.map((it) => (
                    <div
                      key={it.id}
                      className="grid grid-cols-12 gap-1.5 items-center p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateInventoryItem(it.id, { name: e.target.value })}
                          placeholder="Item Name"
                          className={`w-full font-medium text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={it.location}
                          onChange={(e) => updateInventoryItem(it.id, { location: e.target.value })}
                          placeholder="Loc"
                          className={`w-full text-center text-[11px] py-0.5 rounded border ${inputStyle}`}
                          title="Location"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          value={it.weight}
                          onChange={(e) =>
                            updateInventoryItem(it.id, { weight: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="lbs"
                          className={`w-12 text-center text-[11px] py-0.5 rounded border ${inputStyle}`}
                          title="Weight (lbs)"
                        />
                        <span className="text-[10px] opacity-70">lbs</span>
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeInventoryItem(it.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carrying Capacity & Encumbrance Breakdown */}
                <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Scale className="w-4 h-4 text-amber-500" />
                      <span>Total Carried:</span>
                    </span>
                    <span className="font-bold">
                      {derived.carryingCapacity.currentWeight} lbs{' '}
                      <span
                        className={`ml-1 text-[11px] px-2 py-0.5 rounded ${
                          derived.carryingCapacity.loadStatus === 'Light'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : derived.carryingCapacity.loadStatus === 'Medium'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                        }`}
                      >
                        {derived.carryingCapacity.loadStatus} Load
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                    <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="opacity-70 text-[10px]">Light Load</div>
                      <div className="font-bold">0 – {derived.carryingCapacity.light} lbs</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="opacity-70 text-[10px]">Medium Load</div>
                      <div className="font-bold">
                        {derived.carryingCapacity.light + 1} – {derived.carryingCapacity.medium} lbs
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="opacity-70 text-[10px]">Heavy Load</div>
                      <div className="font-bold">
                        {derived.carryingCapacity.medium + 1} – {derived.carryingCapacity.heavy} lbs
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono opacity-80">
                    <div>Overhead: {derived.carryingCapacity.overhead} lbs</div>
                    <div>Off Ground: {derived.carryingCapacity.offGround} lbs</div>
                    <div>Push/Drag: {derived.carryingCapacity.drag} lbs</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Currency & Wealth */}
          {visibleModules.currency && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">Currency & Wealth</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">
                  Total: {totalWealthGP.toLocaleString()} GP
                </span>
              </div>
              <div className="p-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="block text-[10px] opacity-75 font-mono">CP (Copper)</span>
                  <input
                    type="number"
                    value={character.currency.cp}
                    onChange={(e) =>
                      onUpdateCharacter((prev) => ({
                        ...prev,
                        currency: { ...prev.currency, cp: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className={`w-full text-center py-1 rounded border font-mono font-bold ${inputStyle}`}
                  />
                </div>
                <div>
                  <span className="block text-[10px] opacity-75 font-mono">SP (Silver)</span>
                  <input
                    type="number"
                    value={character.currency.sp}
                    onChange={(e) =>
                      onUpdateCharacter((prev) => ({
                        ...prev,
                        currency: { ...prev.currency, sp: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className={`w-full text-center py-1 rounded border font-mono font-bold ${inputStyle}`}
                  />
                </div>
                <div>
                  <span className="block text-[10px] opacity-75 font-mono text-amber-500 font-bold">
                    GP (Gold)
                  </span>
                  <input
                    type="number"
                    value={character.currency.gp}
                    onChange={(e) =>
                      onUpdateCharacter((prev) => ({
                        ...prev,
                        currency: { ...prev.currency, gp: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className={`w-full text-center py-1 rounded border font-mono font-bold text-amber-500 ${inputStyle}`}
                  />
                </div>
                <div>
                  <span className="block text-[10px] opacity-75 font-mono text-cyan-400 font-bold">
                    PP (Platinum)
                  </span>
                  <input
                    type="number"
                    value={character.currency.pp}
                    onChange={(e) =>
                      onUpdateCharacter((prev) => ({
                        ...prev,
                        currency: { ...prev.currency, pp: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className={`w-full text-center py-1 rounded border font-mono font-bold text-cyan-400 ${inputStyle}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Languages */}
          {visibleModules.languages && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">Languages Known</span>
                </div>
                <button
                  onClick={() => {
                    const lang = prompt('Enter new language:');
                    if (lang?.trim()) setField('languages', [...character.languages, lang.trim()]);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {character.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/10 text-xs font-serif flex items-center gap-1.5 border border-black/10 dark:border-white/10"
                    >
                      <span>{lang}</span>
                      <button
                        onClick={() =>
                          setField(
                            'languages',
                            character.languages.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
