import React, { useState } from 'react';
import {
  Dices,
  Plus,
  Trash2,
  Shield,
  Swords,
  Heart,
  Sparkles,
  Zap,
  Minus,
  HelpCircle,
  Hand,
  FilePlus,
  User,
  Image as ImageIcon,
  Camera,
} from 'lucide-react';
import {
  PF1Character,
  AbilityName,
  WeaponAttack,
  ArmorItem,
  AdditionalHpBonus,
} from '../../types/character';
import { DerivedCombatStats, getPointBuyCost } from '../../engine/pf1eMath';
import { applyHitDieSize, applySheetLevel } from '../../engine/companionSheet';
import { evaluateFormula } from '../../engine/formula';
import { BuffBoxModule } from './BuffBoxModule';
import { QuickModularTools } from '../workspace/QuickModularTools';
import { FieldCallTooltip } from '../common/FieldCallTooltip';

interface SheetPage1CoreProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula: (formula: string, label?: string) => void;
  visibleModules: Record<string, boolean>;
  onOpenCMBt?: () => void;
  onOpenNewSheet?: () => void;
  onOpenImageBrowser?: (config?: {
    targetType: 'profile' | 'portrait' | 'item';
    itemName?: string;
    currentUrl?: string;
  }) => void;
}

export const SheetPage1Core: React.FC<SheetPage1CoreProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
  visibleModules,
  onOpenCMBt,
  onOpenNewSheet,
  onOpenImageBrowser,
}) => {
  const abilitiesList: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const [damageInput, setDamageInput] = useState<number>(5);
  const [healInput, setHealInput] = useState<number>(5);

  // Handle direct field updates
  const setField = <K extends keyof PF1Character>(key: K, value: PF1Character[K]) => {
    onUpdateCharacter((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetToMax = () => {
    const maxHp = derived.hpBreakdownDetails.calculatedTotalMaxHP;
    onUpdateCharacter((prev) => ({
      ...prev,
      hpCurrent: maxHp,
      hpTotalMax: maxHp,
      hpNonlethal: 0,
      deathSaves: [false, false, false],
    }));
  };

  const toggleDeathSave = (index: number) => {
    onUpdateCharacter((prev) => {
      const current = prev.deathSaves || [false, false, false];
      const next: [boolean, boolean, boolean] = [current[0], current[1], current[2]];
      next[index] = !next[index];
      return { ...prev, deathSaves: next };
    });
  };

  const rollHitDice = () => {
    const count = character.hpBreakdown?.hitDiceCount || character.level;
    const size = character.hpBreakdown?.hitDiceSize || 10;
    let totalBase = size;
    if (count > 1) {
      for (let i = 2; i <= count; i++) {
        totalBase += Math.floor(Math.random() * size) + 1;
      }
    }
    setField('hpBreakdown', {
      ...character.hpBreakdown,
      calcMethod: 'rolled',
      hitDiceRolledBase: totalBase,
    });
    onRollFormula(`${count}d${size}`, `Rolled Hit Dice Base HP: ${totalBase}`);
  };

  const updateAbility = (
    name: AbilityName,
    field: 'base' | 'raceMod' | 'levelAsiMod' | 'enhMod' | 'miscMod' | 'tempMod' | 'directMod',
    val: number
  ) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      abilities: {
        ...prev.abilities,
        [name]: {
          ...prev.abilities[name],
          [field]: val,
        },
      },
    }));
  };

  // HP Calculator Logic per user specification #3:
  // Damage first dissolves THP (temp HP), then current HP
  const applyDamage = (amount: number) => {
    let remaining = amount;
    let newTemp = character.hpTemp;
    let newCurrent = character.hpCurrent;

    if (newTemp > 0) {
      if (newTemp >= remaining) {
        newTemp -= remaining;
        remaining = 0;
      } else {
        remaining -= newTemp;
        newTemp = 0;
      }
    }
    newCurrent -= remaining;
    onUpdateCharacter((prev) => ({ ...prev, hpCurrent: newCurrent, hpTemp: newTemp }));
  };

  const applyHealing = (amount: number) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      hpCurrent: Math.min(derived.hpBreakdownDetails.calculatedTotalMaxHP, prev.hpCurrent + amount),
      hpNonlethal: Math.max(0, prev.hpNonlethal - amount),
    }));
  };

  // Add an additional HP bonus (e.g. +6 "Toughness", +12 "Favored Class")
  const addAdditionalHpBonus = () => {
    const src = prompt('Bonus source (e.g. "Toughness" or "Favored Class"):', 'Toughness');
    if (!src) return;
    const amtStr = prompt('HP amount granted:', '6');
    const amt = parseInt(amtStr || '0') || 0;
    const newBonus: AdditionalHpBonus = {
      id: `hpb-${Date.now()}`,
      amount: amt,
      source: src,
    };
    const currentList = character.hpBreakdown?.additionalBonuses || [];
    setField('hpBreakdown', {
      ...character.hpBreakdown,
      additionalBonuses: [...currentList, newBonus],
    });
  };

  const removeAdditionalHpBonus = (id: string) => {
    const currentList = character.hpBreakdown?.additionalBonuses || [];
    setField('hpBreakdown', {
      ...character.hpBreakdown,
      additionalBonuses: currentList.filter((b) => b.id !== id),
    });
  };

  const addWeapon = () => {
    const newWeapon: WeaponAttack = {
      id: `wp-${Date.now()}`,
      name: 'New Weapon',
      category: 'Melee',
      damageFormula: '1d8 + str_mod',
      critical: '20/x2',
      range: 'Melee',
      damageType: 'Slashing',
      weight: 4,
      isEquipped: true,
    };
    setField('weapons', [...character.weapons, newWeapon]);
  };

  const removeWeapon = (id: string) => {
    setField('weapons', character.weapons.filter((w) => w.id !== id));
  };

  const updateWeapon = (id: string, updates: Partial<WeaponAttack>) => {
    setField(
      'weapons',
      character.weapons.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const addArmor = () => {
    const newArmor: ArmorItem = {
      id: `ar-${Date.now()}`,
      name: 'New Armor',
      type: 'Light',
      acBonus: 3,
      maxDex: 4,
      checkPenalty: -1,
      spellFailure: 10,
      speed30: 30,
      weight: 15,
      isEquipped: true,
    };
    setField('armor', [...character.armor, newArmor]);
  };

  const removeArmor = (id: string) => {
    setField('armor', character.armor.filter((a) => a.id !== id));
  };

  const updateArmor = (id: string, updates: Partial<ArmorItem>) => {
    setField(
      'armor',
      character.armor.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

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

  return (
    <div className={`space-y-4 ${fontClass} transition-colors duration-200`}>
      {/* 1. Header Information Block */}
      <div className={`border rounded-lg p-4 ${cardBg}`}>
        {/* Header Bar with New Sheet and Picture Browser */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Identity &amp; Lineage
            </span>
            <span className="text-[10px] opacity-60 font-mono hidden sm:inline">Core Attributes &amp; Character Info</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenImageBrowser && (
              <button
                onClick={() =>
                  onOpenImageBrowser({
                    targetType: 'profile',
                    currentUrl: character.profileData?.avatarUrl || character.characterBio?.portraits?.[0],
                  })
                }
                className="text-[11px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 flex items-center gap-1 transition-colors"
                title="Open image file browser to set character portrait"
              >
                <ImageIcon className="w-3 h-3 text-cyan-400" />
                <span>Profile Pic</span>
              </button>
            )}

            {onOpenNewSheet && (
              <button
                onClick={onOpenNewSheet}
                className="text-[11px] font-mono px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 flex items-center gap-1 transition-colors"
                title="Start a fresh blank sheet or reset character"
              >
                <FilePlus className="w-3 h-3 text-rose-400" />
                <span>New Sheet / Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Character Name
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                onClick={() =>
                  onOpenImageBrowser?.({
                    targetType: 'profile',
                    currentUrl: character.profileData?.avatarUrl || character.characterBio?.portraits?.[0],
                  })
                }
                className="w-8 h-8 rounded-lg overflow-hidden border border-black/20 dark:border-white/20 bg-black/40 flex items-center justify-center shrink-0 cursor-pointer relative group"
                title="Click to browse profile picture"
              >
                {character.profileData?.avatarUrl || character.characterBio?.portraits?.[0] ? (
                  <img
                    src={character.profileData?.avatarUrl || character.characterBio?.portraits?.[0]}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-amber-500/70" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-300 transition-opacity">
                  <Camera className="w-3 h-3" />
                </div>
              </div>
              <input
                type="text"
                value={character.name}
                onChange={(e) => setField('name', e.target.value)}
                className={`flex-1 font-bold text-base px-2 py-1 rounded border ${inputStyle}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Player
            </label>
            <input
              type="text"
              value={character.player}
              onChange={(e) => setField('player', e.target.value)}
              className={`w-full text-xs px-2 py-1 rounded border ${inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Alignment
            </label>
            <input
              type="text"
              value={character.alignment}
              onChange={(e) => setField('alignment', e.target.value)}
              className={`w-full text-xs px-2 py-1 rounded border ${inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Current XP
            </label>
            <input
              type="number"
              value={character.currentXP}
              onChange={(e) => setField('currentXP', parseInt(e.target.value) || 0)}
              className={`w-full text-xs px-2 py-1 rounded border font-mono tabular-nums ${inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Next Level XP
            </label>
            <input
              type="number"
              value={character.nextLevelXP}
              onChange={(e) => setField('nextLevelXP', parseInt(e.target.value) || 0)}
              className={`w-full text-xs px-2 py-1 rounded border font-mono tabular-nums ${inputStyle}`}
            />
          </div>

          {/* Row 2 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Class & Archetype
            </label>
            <input
              type="text"
              value={character.characterClass}
              onChange={(e) => setField('characterClass', e.target.value)}
              className={`w-full text-xs font-semibold px-2 py-1 rounded border ${inputStyle}`}
            />
          </div>

          <FieldCallTooltip callName="#LEVEL" description="Character Level" className="block">
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75 cursor-help">
              Level
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={character.level}
              onChange={(e) => {
                const nextLevel = parseInt(e.target.value, 10);
                if (!nextLevel) return;
                onUpdateCharacter((prev) => applySheetLevel(prev, nextLevel).character);
              }}
              className={`w-full text-xs font-bold font-mono px-2 py-1 rounded border ${inputStyle}`}
            />
          </FieldCallTooltip>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Race
            </label>
            <input
              type="text"
              value={character.race}
              onChange={(e) => setField('race', e.target.value)}
              className={`w-full text-xs px-2 py-1 rounded border ${inputStyle}`}
            />
          </div>

          <FieldCallTooltip callName="#SIZE" description="Size Modifier" className="block">
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75 cursor-help">
              Size
            </label>
            <select
              value={character.size}
              onChange={(e) => setField('size', e.target.value as any)}
              className={`w-full text-xs px-2 py-1 rounded border ${inputStyle}`}
            >
              <option value="Fine">Fine</option>
              <option value="Diminutive">Diminutive</option>
              <option value="Tiny">Tiny</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Huge">Huge</option>
              <option value="Gargantuan">Gargantuan</option>
              <option value="Colossal">Colossal</option>
            </select>
          </FieldCallTooltip>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Deity
            </label>
            <input
              type="text"
              value={character.deity}
              onChange={(e) => setField('deity', e.target.value)}
              className={`w-full text-xs px-2 py-1 rounded border ${inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* BUFF BOX MODULE (In-Sheet Window with Roll-Up and |<^>| Icon) */}
      {visibleModules.buffBox && (
        <BuffBoxModule
          buffBox={character.buffBox}
          customBuffs={character.customBuffs}
          onUpdateBuffBox={(newBox) => setField('buffBox', newBox)}
          onUpdateCustomBuffs={(newBuffs) => {
            onUpdateCharacter((prev) => {
              const itemActiveMap = new Map<string, boolean>();
              newBuffs.forEach((b) => {
                if (b.itemId) itemActiveMap.set(b.itemId, b.isActive);
              });
              const updatedInventory = (prev.inventory || []).map((item) => {
                if (itemActiveMap.has(item.id)) {
                  return { ...item, buffActive: itemActiveMap.get(item.id), hasBuff: true };
                }
                return item;
              });
              return { ...prev, customBuffs: newBuffs, inventory: updatedInventory };
            });
          }}
          theme={theme}
          fontClass={fontClass}
        />
      )}

      {/* QUICK MODULAR TOOLS (Add Class, Level Stepper, Turn Stepper, Quickmacros) */}
      {(visibleModules.addClass ||
        visibleModules.levelStepper ||
        visibleModules.turnStepper ||
        visibleModules.quickMacros) && (
        <QuickModularTools
          character={character}
          derived={derived}
          theme={theme}
          fontClass={fontClass}
          onUpdateCharacter={onUpdateCharacter}
          onRollFormula={onRollFormula}
          visibleModules={visibleModules}
        />
      )}

      {/* 2. Top Combat Row: Left Column (Abilities, BAB Module, Attacks) | Right Column (HP & Vitals, AC & Defenses, Saves) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (lg:col-span-6): Abilities, BAB Module, Attacks & Weapons */}
        <div className="lg:col-span-6 space-y-4">
          {/* Ability Scores Table (Always Included) */}
          <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
            <div className={`px-3 py-2 border-b flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs uppercase tracking-wider">Ability Scores</span>
                <span className="text-[10px] opacity-75 font-mono">
                  (Point Buy: {derived.pointBuySpent}p)
                </span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                ASI: +1/4 lvls
              </span>
            </div>
            <div className="p-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[10px] uppercase opacity-75">
                    <th className="pb-1">Ability</th>
                    <th className="pb-1 text-center" title="Base Point Buy 6 to 18">Base</th>
                    <th className="pb-1 text-center" title="Racial Modifier (+2 or +4)">Race</th>
                    <th className="pb-1 text-center" title="Level ASI (+1 per 4 lvls)">ASI</th>
                    <th className="pb-1 text-center font-bold">Total ABS</th>
                    <th className="pb-1 text-center font-bold text-amber-600 dark:text-amber-400">Mod</th>
                    <th className="pb-1 text-center font-bold text-cyan-600 dark:text-cyan-400" title="Direct modifier bonus not calculated with total score">Mod Adj</th>
                    <th className="pb-1 text-center">Roll</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {abilitiesList.map((ab) => {
                    const scoreObj = character.abilities[ab];
                    const totalScore = (derived as any)[`${ab.toLowerCase()}Total`] || 10;
                    const baseMod = (derived as any)[`base${ab.charAt(0) + ab.slice(1).toLowerCase()}Mod`] ?? Math.floor((totalScore - 10) / 2);
                    const directMod = scoreObj.directMod || 0;
                    const effectiveMod = baseMod + directMod;
                    const cost = getPointBuyCost(scoreObj.base);

                    return (
                      <tr key={ab} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2 font-bold font-serif text-sm">
                          <FieldCallTooltip callName={`#${ab}`} description={`${ab} modifier (hover 3s to copy)`}>
                            <span className="cursor-help hover:text-amber-500 transition-colors">{ab}</span>
                          </FieldCallTooltip>
                        </td>

                        {/* Base Point Buy (6 to 18) */}
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            min="6"
                            max="18"
                            value={scoreObj.base}
                            onChange={(e) =>
                              updateAbility(
                                ab,
                                'base',
                                Math.max(6, Math.min(18, parseInt(e.target.value) || 10))
                              )
                            }
                            className={`w-11 text-center py-0.5 text-xs rounded border tabular-nums ${inputStyle}`}
                            title={`Point buy cost: ${cost} pts`}
                          />
                        </td>

                        {/* Race (+2/+4) */}
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            value={scoreObj.raceMod}
                            onChange={(e) =>
                              updateAbility(ab, 'raceMod', parseInt(e.target.value) || 0)
                            }
                            className={`w-10 text-center py-0.5 text-xs rounded border tabular-nums ${inputStyle}`}
                          />
                        </td>

                        {/* Level ASI (+1 per 4 levels) */}
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={scoreObj.levelAsiMod || 0}
                            onChange={(e) =>
                              updateAbility(ab, 'levelAsiMod', Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className={`w-9 text-center py-0.5 text-xs rounded border tabular-nums text-cyan-600 dark:text-cyan-400 ${inputStyle}`}
                          />
                        </td>

                        {/* Total ABS */}
                        <td className="py-2 text-center font-bold text-sm tabular-nums">
                          <FieldCallTooltip callName={`#${ab}_SCORE`} description={`${ab} Total Score`}>
                            <span className="cursor-help px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5">{totalScore}</span>
                          </FieldCallTooltip>
                        </td>

                        {/* Mod (Calculated from Total ABS) */}
                        <td className="py-2 text-center">
                          <FieldCallTooltip callName={`#${ab}`} description={`${ab} Modifier`}>
                            <span className="font-bold text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 tabular-nums cursor-help">
                              {baseMod >= 0 ? `+${baseMod}` : baseMod}
                            </span>
                          </FieldCallTooltip>
                        </td>

                        {/* Mod Adj (Direct modifier bonus not calculated with total score - User Specification) */}
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            value={scoreObj.directMod || 0}
                            onChange={(e) =>
                              updateAbility(ab, 'directMod', parseInt(e.target.value) || 0)
                            }
                            className={`w-10 text-center py-0.5 text-xs rounded border tabular-nums ${
                              directMod !== 0 ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : ''
                            } ${inputStyle}`}
                            title="Direct modifier bonus not calculated with total score"
                            placeholder="0"
                          />
                        </td>

                        {/* Dice Roll with Effective Mod */}
                        <td className="py-2 text-center">
                          <FieldCallTooltip callName={`#${ab}`} description={`${ab} Check / Modifier`}>
                            <button
                              onClick={() =>
                                onRollFormula(
                                  `1d20+${effectiveMod}`,
                                  `${ab} Check (Mod ${effectiveMod >= 0 ? `+${effectiveMod}` : effectiveMod}${
                                    directMod !== 0 ? ` [Score Mod ${baseMod >= 0 ? `+${baseMod}` : baseMod}, Adj ${directMod >= 0 ? `+${directMod}` : directMod}]` : ''
                                  })`
                                )
                              }
                              className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                            >
                              <span>{effectiveMod >= 0 ? `+${effectiveMod}` : effectiveMod}</span>
                              <Dices className="w-3.5 h-3.5" />
                            </button>
                          </FieldCallTooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 text-[10px] text-slate-500 flex justify-between font-mono">
                <span>Point scale: 6(-5) to 18(17)</span>
                <span>ASB = floor((ABS-10)/2)</span>
              </div>
            </div>
          </div>

        {/* BAB & COMBAT MANEUVERS KIT MODULE (User Specification #2 & CMBt) */}
        <div className={`border rounded-lg p-3.5 ${cardBg} space-y-3`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b pb-1.5 ${headerBg} px-2 py-1 -mx-3.5 -mt-3.5 rounded-t-lg mb-2 flex-wrap gap-2`}>
            <div className="flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs uppercase tracking-wider">Base Attack & Maneuvers (BAB)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono opacity-80 hidden sm:inline">
                Iteratives: {derived.iterativeAttacks.map((it) => (it >= 0 ? `+${it}` : it)).join(' / ')}
              </span>
              {onOpenCMBt && (
                <button
                  type="button"
                  onClick={onOpenCMBt}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                  title="Open CMBt: Combat Maneuvers & Interactive Grapple Track"
                >
                  <Hand className="w-3 h-3 text-amber-500" />
                  <span>CMBt / Grapple Track</span>
                </button>
              )}
            </div>
          </div>

          {/* Initiative Bonus (Top of Base Attack & Maneuvers per User Specification) */}
          <FieldCallTooltip
            callName="#INIT"
            description="Initiative Bonus"
            className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 font-mono text-xs w-full"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 cursor-help">
                  Initiative Bonus
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRollFormula(`1d20+${derived.initiativeTotal}`, 'Initiative Check')}
                className="font-mono font-black text-xl text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{derived.initiativeTotal >= 0 ? `+${derived.initiativeTotal}` : derived.initiativeTotal}</span>
                <Dices className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[10px] uppercase font-bold text-slate-500">DEX ASB:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  {derived.dexMod >= 0 ? `+${derived.dexMod}` : derived.dexMod}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[10px] uppercase font-bold text-slate-500">Misc:</span>
                <input
                  type="number"
                  value={character.initMiscMod || 0}
                  onChange={(e) => setField('initMiscMod', parseInt(e.target.value) || 0)}
                  className={`w-12 text-center py-0.5 text-xs rounded border tabular-nums ${inputStyle}`}
                />
              </div>

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-75 font-mono">
                Macro: #INIT
              </span>
            </div>
          </FieldCallTooltip>

          {/* BAB Input Row & Iteratives */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center font-mono text-xs">
            {/* BAB Input: Provided by the Player */}
            <FieldCallTooltip
              callName="#BAB"
              description="Base Attack Bonus"
              className="sm:col-span-5 p-2 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-between w-full"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block cursor-help">
                  Base Attack (BAB)
                </span>
                <span className="text-[9px] opacity-70">Player Provided</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold opacity-60">+</span>
                <input
                  type="number"
                  value={character.baseAttackBonus}
                  onChange={(e) => setField('baseAttackBonus', parseInt(e.target.value) || 0)}
                  className={`w-14 text-center font-mono font-black text-xl py-0.5 rounded border tabular-nums ${inputStyle}`}
                />
              </div>
            </FieldCallTooltip>

            {/* Iterative Attacks Chain */}
            <FieldCallTooltip
              callName="#BAB"
              description="Base Attack Bonus"
              className="sm:col-span-7 p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 block w-full"
            >
              <div className="text-[10px] font-semibold uppercase opacity-75 mb-0.5">
                Iterative Attack Chain
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {derived.iterativeAttacks.map((it, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold text-xs text-amber-600 dark:text-amber-400"
                  >
                    {it >= 0 ? `+${it}` : it}
                  </span>
                ))}
                <span className="text-[10px] opacity-60 ml-auto">Macro: #BAB</span>
              </div>
            </FieldCallTooltip>
          </div>

          {/* CMB & CMD Maneuvers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
            {/* CMB Box: STR + BAB + SIZE + Misc */}
            <FieldCallTooltip
              callName="#CMB"
              description="Combat Maneuver Bonus"
              className="p-2.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col justify-between w-full"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 cursor-help">
                  CMB (Maneuver Bonus)
                </span>
                <button
                  onClick={() => onRollFormula(`1d20+${derived.cmbTotal}`, 'Combat Maneuver Bonus (CMB)')}
                  className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                >
                  <Dices className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-baseline justify-between my-1">
                <button
                  onClick={() => onRollFormula(`1d20+${derived.cmbTotal}`, 'CMB Check')}
                  className="font-mono font-black text-2xl text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {derived.cmbTotal >= 0 ? `+${derived.cmbTotal}` : derived.cmbTotal}
                </button>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-75">
                  #CMB
                </span>
              </div>

              <div className="text-[10px] opacity-80 pt-1 border-t border-black/10 dark:border-white/10 space-y-0.5">
                <div>
                  STR ({derived.strMod >= 0 ? `+${derived.strMod}` : derived.strMod}) + BAB (+{character.baseAttackBonus}) + SIZE (+0)
                </div>
                <div className="flex items-center justify-between">
                  <span>CMB Misc:</span>
                  <input
                    type="number"
                    value={character.cmbMiscMod || 0}
                    onChange={(e) => setField('cmbMiscMod', parseInt(e.target.value) || 0)}
                    className={`w-12 text-center py-0.5 text-xs rounded border ${inputStyle}`}
                  />
                </div>
              </div>
            </FieldCallTooltip>

            {/* CMD Box: STR or DEX + BAB + 10 + SIZE + Misc */}
            <FieldCallTooltip
              callName="#CMD"
              description="Combat Maneuver Defense"
              className="p-2.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col justify-between w-full"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 cursor-help">
                  CMD (Defense)
                </span>
                {/* Ability Selector: STR or DEX */}
                <div className="inline-flex rounded border border-black/15 dark:border-white/15 overflow-hidden text-[9px]">
                  {(['STR', 'DEX', 'BOTH'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setField('cmdAbilityChoice', mode)}
                      className={`px-1.5 py-0.5 transition-colors ${
                        (character.cmdAbilityChoice || 'STR') === mode
                          ? 'bg-amber-600 text-slate-950 font-bold'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {mode === 'BOTH' ? 'STR+DEX' : mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-baseline justify-between my-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-black text-2xl text-amber-600 dark:text-amber-400">
                    {derived.cmdTotal}
                  </span>
                  <span className="text-[10px] opacity-70">
                    (Flat: {derived.cmdFlatFooted})
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-75">
                  #CMD
                </span>
              </div>

              <div className="text-[10px] opacity-80 pt-1 border-t border-black/10 dark:border-white/10 space-y-0.5">
                <div>
                  10 + BAB (+{character.baseAttackBonus}) + {(character.cmdAbilityChoice === 'DEX') ? `DEX (+${derived.dexMod})` : (character.cmdAbilityChoice === 'BOTH') ? `STR(+${derived.strMod})+DEX(+${derived.dexMod})` : `STR (+${derived.strMod})`} + SIZE (+0)
                </div>
                <div className="flex items-center justify-between">
                  <span>CMD Misc:</span>
                  <input
                    type="number"
                    value={character.cmdMiscMod ?? character.acMiscMod}
                    onChange={(e) => setField('cmdMiscMod', parseInt(e.target.value) || 0)}
                    className={`w-12 text-center py-0.5 text-xs rounded border ${inputStyle}`}
                  />
                </div>
              </div>
            </FieldCallTooltip>
          </div>
        </div>

        {/* SPACE TO ADD ATTACKS & WEAPONS (Under BAB Module per User Specification #2) */}
        {visibleModules.weapons && (
          <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
            <div className={`px-3 py-2 border-b flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs uppercase tracking-wider">Attacks & Weapons List</span>
              </div>
              <button
                onClick={addWeapon}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Attack / Weapon</span>
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              {character.weapons.length === 0 ? (
                <div className="p-4 text-center text-xs opacity-60">
                  No attacks added. Click "Add Attack / Weapon" to add an attack roll.
                </div>
              ) : (
                character.weapons.map((wp) => {
                  const abMod = wp.category === 'Ranged' ? derived.dexMod : derived.strMod;
                  const totalAtk = character.baseAttackBonus + abMod;
                  const attackChain = derived.iterativeAttacks
                    .map((it) => {
                      const bonus = it + abMod;
                      return bonus >= 0 ? `+${bonus}` : String(bonus);
                    })
                    .join(' / ');

                  const formulaEval = evaluateFormula(wp.damageFormula, {
                    level: character.level,
                    bab: character.baseAttackBonus,
                    str_mod: derived.strMod,
                    dex_mod: derived.dexMod,
                    size: 0,
                  });

                  return (
                    <div
                      key={wp.id}
                      className="p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1.5"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-5 flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={wp.isEquipped}
                            onChange={(e) => updateWeapon(wp.id, { isEquipped: e.target.checked })}
                            className="rounded text-amber-500"
                            title="Equipped"
                          />
                          <input
                            type="text"
                            value={wp.name}
                            onChange={(e) => updateWeapon(wp.id, { name: e.target.value })}
                            placeholder="Attack / Weapon Name"
                            className={`w-full font-bold text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                          />
                        </div>

                        <div className="md:col-span-3 flex items-center gap-1">
                          <span className="text-[10px] font-mono opacity-75">Atk:</span>
                          <button
                            onClick={() => onRollFormula(`1d20+${totalAtk}`, `${wp.name} Attack`)}
                            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1"
                            title="Roll primary attack"
                          >
                            <span>{attackChain}</span>
                            <Dices className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="md:col-span-3 flex items-center gap-1">
                          <span className="text-[10px] font-mono opacity-75">Dmg:</span>
                          <input
                            type="text"
                            value={wp.damageFormula}
                            onChange={(e) => updateWeapon(wp.id, { damageFormula: e.target.value })}
                            placeholder="1d8+str_mod"
                            className={`w-full font-mono text-xs px-1.5 py-0.5 rounded border ${inputStyle}`}
                          />
                          <button
                            onClick={() => onRollFormula(formulaEval.evaluated, `${wp.name} Damage`)}
                            className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            title="Roll Damage"
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="md:col-span-1 flex items-center justify-end">
                          <button
                            onClick={() => removeWeapon(wp.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Delete Attack"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Weapon Details */}
                      <div className="grid grid-cols-4 gap-1.5 text-[10px] opacity-80 font-mono">
                        <div>
                          <span className="opacity-70">Crit:</span>
                          <input
                            type="text"
                            value={wp.critical}
                            onChange={(e) => updateWeapon(wp.id, { critical: e.target.value })}
                            className={`w-full text-center py-0.5 rounded border ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <span className="opacity-70">Range:</span>
                          <input
                            type="text"
                            value={wp.range}
                            onChange={(e) => updateWeapon(wp.id, { range: e.target.value })}
                            className={`w-full text-center py-0.5 rounded border ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <span className="opacity-70">Type:</span>
                          <input
                            type="text"
                            value={wp.damageType}
                            onChange={(e) => updateWeapon(wp.id, { damageType: e.target.value })}
                            className={`w-full text-center py-0.5 rounded border ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <span className="opacity-70">Category:</span>
                          <select
                            value={wp.category}
                            onChange={(e) => updateWeapon(wp.id, { category: e.target.value as any })}
                            className={`w-full py-0.5 rounded border text-[10px] ${inputStyle}`}
                          >
                            <option value="Melee">Melee</option>
                            <option value="Ranged">Ranged</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column (lg:col-span-6): HP & Vitals, AC & Defenses, Saves (Always Included) */}
      <div className="lg:col-span-6 space-y-4">
        {/* 3. HP CALCULATOR & VITALS - Clean Spacing & Math Modes */}
        <div className={`border rounded-lg p-3.5 ${cardBg}`}>
          {/* Header */}
              <div className="flex items-center justify-between border-b pb-2 mb-3 border-black/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Hit Points & Vitals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${derived.hpStatus.color}`}>
                    {derived.hpStatus.label}
                  </span>
                </div>
              </div>

              {/* Primary HP Box: Current HP / Total Max HP + Death Saves + Clean THP Box */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
                {/* [Current / Max HP] - 7 cols */}
                <FieldCallTooltip
                  callName="#HP"
                  description="Current Hit Points"
                  className="sm:col-span-7 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col justify-between w-full"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="font-bold opacity-75 uppercase cursor-help hover:text-amber-500 transition-colors">
                      Current / Max HP
                    </span>
                    <FieldCallTooltip callName="#MAXHP" description="Maximum Hit Points">
                      <span className="text-amber-600 dark:text-amber-400 font-bold cursor-help">
                        Calculated Max: {derived.hpBreakdownDetails.calculatedTotalMaxHP}
                      </span>
                    </FieldCallTooltip>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={character.hpCurrent}
                      onChange={(e) => setField('hpCurrent', parseInt(e.target.value) || 0)}
                      className={`w-20 text-center font-mono font-black text-2xl py-1 rounded border tabular-nums ${inputStyle} ${
                        character.hpCurrent < 0 ? 'text-rose-600 font-black' : ''
                      }`}
                    />
                    <span className="text-2xl font-bold opacity-40">/</span>
                    <span className="font-mono font-black text-2xl tabular-nums text-amber-600 dark:text-amber-400">
                      {derived.hpBreakdownDetails.calculatedTotalMaxHP}
                    </span>
                    <span className="text-xs font-mono opacity-60">HP</span>

                    {/* Visual Health Gauge */}
                    <div className="flex-1 ml-2">
                      <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            character.hpCurrent <= 0
                              ? 'bg-rose-600'
                              : character.hpCurrent <= (derived.hpBreakdownDetails.calculatedTotalMaxHP * 0.3)
                              ? 'bg-orange-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  (character.hpCurrent / Math.max(1, derived.hpBreakdownDetails.calculatedTotalMaxHP)) * 100
                                )
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-right mt-0.5 opacity-70">
                        {Math.round((character.hpCurrent / Math.max(1, derived.hpBreakdownDetails.calculatedTotalMaxHP)) * 100)}%
                      </div>
                    </div>
                  </div>
                </FieldCallTooltip>

                {/* ["THP" Temp HP] - 5 cols cleanly separated */}
                <FieldCallTooltip
                  callName="#THP"
                  description="Temporary Hit Points"
                  className="sm:col-span-5 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex flex-col justify-between w-full"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 uppercase cursor-help hover:underline">
                      THP (Temp HP)
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      value={character.hpTemp}
                      onChange={(e) => setField('hpTemp', Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-full text-center font-mono font-black text-2xl py-1 rounded border tabular-nums text-cyan-600 dark:text-cyan-400 ${inputStyle}`}
                    />
                  </div>
                  <div className="text-[10px] text-cyan-600/90 dark:text-cyan-400/90 mt-1 text-center font-mono font-medium">
                    Absorbs damage first
                  </div>
                </FieldCallTooltip>
              </div>

              {/* Death Saving Throws + Calculation Mode Selector */}
              <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs">
                {/* 3 Death Saves Checkboxes */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] uppercase opacity-75">Death Saves:</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((idx) => {
                      const isChecked = Boolean(character.deathSaves?.[idx]);
                      return (
                        <label
                          key={idx}
                          className="inline-flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDeathSave(idx)}
                            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-black/30 dark:border-white/30"
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              isChecked ? 'text-rose-600 dark:text-rose-400' : 'opacity-40'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* HP Calculation Method Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase opacity-75">Calc Mode:</span>
                  <div className="inline-flex rounded border border-black/15 dark:border-white/15 overflow-hidden text-[10px]">
                    {(['average', 'max', 'rolled'] as const).map((method) => {
                      const isActive = (character.hpBreakdown?.calcMethod || 'average') === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() =>
                            setField('hpBreakdown', {
                              ...character.hpBreakdown,
                              calcMethod: method,
                            })
                          }
                          className={`px-2 py-0.5 capitalize transition-colors ${
                            isActive
                              ? 'bg-amber-600 text-slate-950 font-bold'
                              : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75'
                          }`}
                        >
                          {method === 'average' ? 'Average' : method === 'max' ? 'Max' : 'Rolled'}
                        </button>
                      );
                    })}
                  </div>

                  {character.hpBreakdown?.calcMethod === 'rolled' && (
                    <button
                      type="button"
                      onClick={rollHitDice}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Roll hit dice for base HP"
                    >
                      <Dices className="w-3 h-3" />
                      <span>Roll HD</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hit Dice & Formula String Breakdown */}
              <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold opacity-80">
                  <span>HP Formula String & Breakdown:</span>
                  <button
                    onClick={addAdditionalHpBonus}
                    className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Bonus Source</span>
                  </button>
                </div>

                {/* Formatted formula bar */}
                <div className="p-2 rounded bg-black/10 dark:bg-black/40 border border-black/10 dark:border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    ({character.hpBreakdown?.hitDiceCount || character.level}d{character.hpBreakdown?.hitDiceSize || 10}{' '}
                    [Base: {derived.hpBreakdownDetails.baseHitDiceHP}])
                  </span>
                  <span>+</span>
                  <span className="text-cyan-700 dark:text-cyan-300 font-semibold" title="CON ASB * Level">
                    {derived.hpBreakdownDetails.conHpBonus} [CON ASB {derived.conMod >= 0 ? `+${derived.conMod}` : derived.conMod} × {character.level}]
                  </span>

                  {/* Additional Bonuses with source tag e.g. +6 "Toughness" */}
                  {(character.hpBreakdown?.additionalBonuses || []).map((bonus) => (
                    <span
                      key={bonus.id}
                      className="inline-flex items-center gap-1 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px]"
                    >
                      <span>
                        +{bonus.amount} "{bonus.source}"
                      </span>
                      <button
                        onClick={() => removeAdditionalHpBonus(bonus.id)}
                        className="text-red-400 hover:text-red-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {derived.hpBreakdownDetails.buffHpBonus !== 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      +{derived.hpBreakdownDetails.buffHpBonus} [BuffBox HP]
                    </span>
                  )}

                  <span className="font-bold ml-auto text-amber-600 dark:text-amber-400">
                    = {derived.hpBreakdownDetails.formulaNotation}
                  </span>
                </div>

                {/* Hit Dice settings inputs */}
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-[11px]">
                  <div>
                    <span className="opacity-75">HD Count:</span>
                    <input
                      type="number"
                      value={character.hpBreakdown?.hitDiceCount || character.level}
                      onChange={(e) =>
                        setField('hpBreakdown', {
                          ...character.hpBreakdown,
                          hitDiceCount: parseInt(e.target.value) || character.level,
                        })
                      }
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <span className="opacity-75">HD Size (d6-d12):</span>
                    <input
                      type="number"
                      value={character.hpBreakdown?.hitDiceSize || 10}
                      onChange={(e) => {
                        const nextDie = parseInt(e.target.value, 10);
                        if (!nextDie) return;
                        onUpdateCharacter((prev) => applyHitDieSize(prev, nextDie).character);
                      }}
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <span className="opacity-75">Rolled Base HP:</span>
                    <input
                      type="number"
                      value={character.hpBreakdown?.hitDiceRolledBase || 72}
                      onChange={(e) =>
                        setField('hpBreakdown', {
                          ...character.hpBreakdown,
                          hitDiceRolledBase: parseInt(e.target.value) || 72,
                        })
                      }
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

              {/* Dedicated Damage, Healing, and Rest to Max Controls (Per User Request 2.1) */}
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                {/* Damage Input & Trigger */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold opacity-75 uppercase">Damage:</span>
                  <input
                    type="number"
                    min="1"
                    value={damageInput}
                    onChange={(e) => setDamageInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-14 text-center py-1 text-xs rounded border tabular-nums ${inputStyle}`}
                  />
                  <button
                    type="button"
                    onClick={() => applyDamage(damageInput)}
                    className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded font-semibold flex items-center gap-1 transition-colors text-xs"
                    title="Damage dissolves THP first before reducing Current HP"
                  >
                    <Minus className="w-3 h-3" />
                    <span>Apply Damage</span>
                  </button>
                </div>

                {/* Healing Input & Trigger */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold opacity-75 uppercase">Heal:</span>
                  <input
                    type="number"
                    min="1"
                    value={healInput}
                    onChange={(e) => setHealInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-14 text-center py-1 text-xs rounded border tabular-nums ${inputStyle}`}
                  />
                  <button
                    type="button"
                    onClick={() => applyHealing(healInput)}
                    className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 rounded font-semibold flex items-center gap-1 transition-colors text-xs"
                    title="Heals Current HP up to Calculated Max and reduces nonlethal damage"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Apply Heal</span>
                  </button>
                </div>

                {/* Rest to Max Trigger & Nonlethal */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToMax}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                    title="Restores HP to maximum, resets nonlethal and clears death saves"
                  >
                    <span>Rest to Max HP</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="opacity-70">Nonlethal:</span>
                    <input
                      type="number"
                      min="0"
                      value={character.hpNonlethal}
                      onChange={(e) => setField('hpNonlethal', Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-12 text-center py-0.5 rounded border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            </div>

          {/* Armor Class & Defenses Block (Always Included) */}
          <div className={`border rounded-lg p-3.5 ${cardBg}`}>
                <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Armor Class & Defenses
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span>
                      Initiative:{' '}
                      <button
                        onClick={() => onRollFormula(`1d20+${derived.initiativeTotal}`, 'Initiative')}
                        className="font-bold underline text-amber-600 dark:text-amber-400"
                      >
                        {derived.initiativeTotal >= 0 ? `+${derived.initiativeTotal}` : derived.initiativeTotal}
                      </button>
                    </span>
                    <span>·</span>
                    <FieldCallTooltip callName="#SPEED" description="Base Speed">
                      <span className="cursor-help">Speed: {character.speedBase} ft</span>
                    </FieldCallTooltip>
                  </div>
                </div>

                {/* Big 3 AC metrics */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <FieldCallTooltip
                    callName="#AC"
                    description="Total Armor Class"
                    className="p-2 rounded bg-amber-500/10 border border-amber-500/30 block w-full"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 cursor-help block">
                      Total AC
                    </span>
                    <div className="text-2xl font-mono font-black tabular-nums cursor-help">{derived.acTotal}</div>
                  </FieldCallTooltip>
                  <FieldCallTooltip
                    callName="#TOUCH"
                    description="Touch Armor Class"
                    className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 block w-full"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 cursor-help block">
                      Touch AC
                    </span>
                    <div className="text-2xl font-mono font-black tabular-nums cursor-help">{derived.touchAC}</div>
                  </FieldCallTooltip>
                  <FieldCallTooltip
                    callName="#FF"
                    description="Flat-Footed Armor Class"
                    className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 block w-full"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 cursor-help block">
                      Flat-Footed
                    </span>
                    <div className="text-2xl font-mono font-black tabular-nums cursor-help">
                      {derived.flatFootedAC}
                    </div>
                  </FieldCallTooltip>
                </div>

                {/* Mathematical Breakdown Row: BAB replaced with ARMOR BONUS per user spec #1 */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <div className="p-1 rounded bg-black/10 dark:bg-white/10">
                    <span className="text-[9px] uppercase opacity-75 block">Base</span>
                    <div className="font-bold text-sm">10</div>
                  </div>

                  {/* Armor Bonus (Replaced BAB per user instruction #1) */}
                  <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                    <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
                      Armor Bonus
                    </span>
                    <div className="font-bold text-sm text-amber-700 dark:text-amber-300">
                      +{derived.totalArmorBonus}
                    </div>
                  </div>

                  <div className="p-1 rounded bg-black/10 dark:bg-white/10">
                    <span className="text-[9px] uppercase opacity-75 block">Dex ASB</span>
                    <div className="font-bold text-sm">
                      {derived.effectiveDexModForAC >= 0 ? `+${derived.effectiveDexModForAC}` : derived.effectiveDexModForAC}
                    </div>
                  </div>

                  <div className="p-1 rounded bg-black/10 dark:bg-white/10">
                    <span className="text-[9px] uppercase opacity-75 block">Misc / Other</span>
                    <div className="font-bold text-sm">
                      {derived.totalAcMiscBonus >= 0 ? `+${derived.totalAcMiscBonus}` : derived.totalAcMiscBonus}
                    </div>
                  </div>
                </div>

                {/* Formula String Explaining Exact Calculation */}
                <div className="p-1.5 rounded bg-black/10 dark:bg-black/30 text-[10px] font-mono text-center opacity-85 mt-2">
                  Total AC: 10 + Armor (+{derived.totalArmorBonus}) + DEX (+{derived.effectiveDexModForAC}) + Misc (+{derived.totalAcMiscBonus}) = <strong className="text-amber-600 dark:text-amber-400">{derived.acTotal}</strong>
                </div>

                {/* Sub-inputs for custom AC adjustments */}
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono pt-1">
                  <div>
                    <span className="opacity-70">Natural Armor:</span>
                    <input
                      type="number"
                      value={character.naturalArmorMod}
                      onChange={(e) => setField('naturalArmorMod', parseInt(e.target.value) || 0)}
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <span className="opacity-70">Deflection:</span>
                    <input
                      type="number"
                      value={character.deflectionMod}
                      onChange={(e) => setField('deflectionMod', parseInt(e.target.value) || 0)}
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <span className="opacity-70">Dodge:</span>
                    <input
                      type="number"
                      value={character.dodgeMod}
                      onChange={(e) => setField('dodgeMod', parseInt(e.target.value) || 0)}
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <span className="opacity-70">AC Misc:</span>
                    <input
                      type="number"
                      value={character.acMiscMod}
                      onChange={(e) => setField('acMiscMod', parseInt(e.target.value) || 0)}
                      className={`w-full text-center py-0.5 rounded border mt-0.5 ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

            {/* Saving Throws (Always Included) */}
            <div className={`border rounded-lg p-3.5 ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between border-b pb-1.5 border-black/10 dark:border-white/10">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Saving Throws
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    Macros: #FORT, #REF, #WILL
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      key: 'fortitude' as const,
                      name: 'Fortitude',
                      abName: 'CON',
                      asb: derived.conMod,
                      macroCall: '#FORT',
                      total: derived.fortitudeTotal,
                      saveObj: character.saves.fortitude,
                    },
                    {
                      key: 'reflex' as const,
                      name: 'Reflex',
                      abName: 'DEX',
                      asb: derived.dexMod,
                      macroCall: '#REF',
                      total: derived.reflexTotal,
                      saveObj: character.saves.reflex,
                    },
                    {
                      key: 'will' as const,
                      name: 'Will',
                      abName: 'WIS',
                      asb: derived.wisMod,
                      macroCall: '#WILL',
                      total: derived.willTotal,
                      saveObj: character.saves.will,
                    },
                  ].map((save) => (
                    <FieldCallTooltip
                      key={save.key}
                      callName={save.macroCall}
                      description={`${save.name} Saving Throw`}
                      className="p-2.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col justify-between text-center font-mono w-full"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-wider opacity-80 cursor-help">
                          {save.name}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold cursor-help hover:underline">
                          {save.macroCall}
                        </span>
                      </div>

                      <button
                        onClick={() => onRollFormula(`1d20+${save.total}`, `${save.name} Save (${save.abName} ASB ${save.asb >= 0 ? `+${save.asb}` : save.asb})`)}
                        className="my-1.5 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded font-black text-xl tabular-nums transition-colors inline-flex items-center justify-center gap-1 group"
                      >
                        <span>{save.total >= 0 ? `+${save.total}` : save.total}</span>
                        <Dices className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </button>

                      {/* Formula & Player Input Base */}
                      <div className="text-[10px] space-y-1 pt-1 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="opacity-75">Base:</span>
                          <input
                            type="number"
                            value={save.saveObj.base}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              onUpdateCharacter((prev) => ({
                                ...prev,
                                saves: {
                                  ...prev.saves,
                                  [save.key]: {
                                    ...prev.saves[save.key],
                                    base: val,
                                  },
                                },
                              }));
                            }}
                            className={`w-11 text-center py-0.5 rounded border font-bold ${inputStyle}`}
                          />
                        </div>

                        <div className="text-[9px] opacity-75 text-left">
                          + {save.abName} ({save.asb >= 0 ? `+${save.asb}` : save.asb})
                          {save.saveObj.magicMod !== 0 && ` + Magic (${save.saveObj.magicMod})`}
                        </div>
                      </div>
                    </FieldCallTooltip>
                  ))}
                </div>
              </div>
        </div>
      </div>

      {/* 5. Armor & Protective Items */}
      {visibleModules.armor && (
        <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
          <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
            <span className="font-bold text-xs uppercase tracking-wider">Armor & Protective Items</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono opacity-75">
                Total Check Penalty: {derived.armorCheckPenaltyTotal} | Max Dex: {derived.maxDexAllowance}
              </span>
              <button
                onClick={addArmor}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Armor</span>
              </button>
            </div>
          </div>

          <div className="p-3">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-[10px] uppercase opacity-75">
                  <th className="pb-1 w-8 text-center">Worn</th>
                  <th className="pb-1">Item Name</th>
                  <th className="pb-1 text-center">Type</th>
                  <th className="pb-1 text-center font-bold">AC Bonus</th>
                  <th className="pb-1 text-center">Max Dex</th>
                  <th className="pb-1 text-center">ACP</th>
                  <th className="pb-1 text-center">Spell Fail</th>
                  <th className="pb-1 text-center">Weight</th>
                  <th className="pb-1 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {character.armor.map((ar) => (
                  <tr key={ar.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={ar.isEquipped}
                        onChange={(e) => updateArmor(ar.id, { isEquipped: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        value={ar.name}
                        onChange={(e) => updateArmor(ar.id, { name: e.target.value })}
                        className={`w-full font-semibold text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <select
                        value={ar.type}
                        onChange={(e) => updateArmor(ar.id, { type: e.target.value as any })}
                        className={`text-xs px-1 py-0.5 rounded border ${inputStyle}`}
                      >
                        <option value="Light">Light</option>
                        <option value="Medium">Medium</option>
                        <option value="Heavy">Heavy</option>
                        <option value="Shield">Shield</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={ar.acBonus}
                        onChange={(e) => updateArmor(ar.id, { acBonus: parseInt(e.target.value) || 0 })}
                        className={`w-12 text-center font-bold py-0.5 rounded border ${inputStyle}`}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={ar.maxDex}
                        onChange={(e) => updateArmor(ar.id, { maxDex: parseInt(e.target.value) || 0 })}
                        className={`w-12 text-center py-0.5 rounded border ${inputStyle}`}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={ar.checkPenalty}
                        onChange={(e) => updateArmor(ar.id, { checkPenalty: parseInt(e.target.value) || 0 })}
                        className={`w-12 text-center py-0.5 rounded border ${inputStyle}`}
                      />
                    </td>
                    <td className="py-1.5 text-center text-xs">{ar.spellFailure}%</td>
                    <td className="py-1.5 text-center text-xs">{ar.weight} lbs</td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => removeArmor(ar.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Feats & Special Abilities */}
      {visibleModules.feats && (
        <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
          <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
            <span className="font-bold text-xs uppercase tracking-wider">Feats & Special Abilities</span>
            <button
              onClick={() => {
                const item = prompt('Enter new feat or special ability:');
                if (item?.trim()) setField('featsAndAbilities', [...character.featsAndAbilities, item.trim()]);
              }}
              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Feat</span>
            </button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {character.featsAndAbilities.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between group"
                >
                  <span className="font-medium">• {feat}</span>
                  <button
                    onClick={() =>
                      setField(
                        'featsAndAbilities',
                        character.featsAndAbilities.filter((_, i) => i !== idx)
                      )
                    }
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:bg-red-500/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
