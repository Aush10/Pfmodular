import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Swords,
  RotateCcw,
  Play,
  Dices,
  Shield,
  Heart,
  Zap,
} from 'lucide-react';
import { PF1Character, CharacterClassEntry } from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';
import { evaluateFormula, buildFormulaContext } from '../../engine/formula';
import { applySheetLevel } from '../../engine/companionSheet';

interface QuickModularToolsProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula: (formula: string, label?: string) => void;
  visibleModules: Record<string, boolean>;
}

export const QuickModularTools: React.FC<QuickModularToolsProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
  visibleModules,
}) => {
  const [newClassName, setNewClassName] = useState('');
  const [newClassHitDie, setNewClassHitDie] = useState(10);
  const [newClassSkillPoints, setNewClassSkillPoints] = useState(2);
  const [newClassBab, setNewClassBab] = useState<'full' | 'threeQuarter' | 'half'>('full');

  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-amber-50/75 border-amber-800/20 text-stone-900 shadow-sm'
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

  // 1. Level Stepper (+ / - Level with automatic scaling of HP, BAB, and Saves)
  const handleStepLevel = (delta: number) => {
    const nextLevel = Math.max(1, Math.min(20, character.level + delta));
    if (nextLevel === character.level) return;

    onUpdateCharacter((prev) => {
      const leveled = applySheetLevel(prev, nextLevel);
      if (!leveled.changed) return prev;
      const babRatio = prev.level > 0 ? prev.baseAttackBonus / prev.level : 1;
      const nextBab = Math.max(1, Math.round(nextLevel * babRatio));
      return { ...leveled.character, baseAttackBonus: nextBab };
    });
  };

  // 2. Turn Stepper (Combat initiative tracker)
  const handleNextTurn = () => {
    const current = character.combatTracker || { round: 1, turn: 1, isInCombat: true };
    const nextTurn = current.turn + 1;
    setField('combatTracker', {
      ...current,
      turn: nextTurn,
      isInCombat: true,
    });
  };

  const handleNextRound = () => {
    const current = character.combatTracker || { round: 1, turn: 1, isInCombat: true };
    setField('combatTracker', {
      round: current.round + 1,
      turn: 1,
      isInCombat: true,
    });
  };

  const handleResetCombat = () => {
    setField('combatTracker', {
      round: 1,
      turn: 1,
      isInCombat: false,
    });
  };

  // 3. Add a Class
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const newEntry: CharacterClassEntry = {
      id: `cls-${Date.now()}`,
      name: newClassName.trim(),
      level: 1,
      hitDie: newClassHitDie,
      skillPointsPerLevel: newClassSkillPoints,
      babProgression: newClassBab,
      isFavoredClass: false,
    };
    const currentList = character.classes || [];
    const nextClasses = [...currentList, newEntry];
    onUpdateCharacter((prev) => ({
      ...prev,
      classes: nextClasses,
      level: nextClasses.reduce((sum, entry) => sum + (entry.level || 0), 0),
      characterClass: nextClasses.map((entry) => `${entry.name} ${entry.level}`).join(' / '),
    }));
    setNewClassName('');
  };

  const handleRemoveClass = (id: string) => {
    const nextClasses = (character.classes || []).filter((entry) => entry.id !== id);
    onUpdateCharacter((prev) => ({
      ...prev,
      classes: nextClasses,
      level: Math.max(1, nextClasses.reduce((sum, entry) => sum + (entry.level || 0), 0)),
      characterClass: nextClasses.map((entry) => `${entry.name} ${entry.level}`).join(' / ') || prev.characterClass,
    }));
  };

  // 4. Quickmacros evaluation
  const context = buildFormulaContext(character, { strPenalty: 0, dexPenalty: 0, attackPenalty: 0 }, derived);

  const quickMacroItems = [
    { label: '#hp', formula: '#hp', desc: 'Current HP' },
    { label: '#str', formula: '#str', desc: 'STR Bonus (+7)' },
    { label: '#strength', formula: '#strength', desc: 'STR Score (24)' },
    { label: '#ac', formula: '#ac', desc: 'Total AC' },
    { label: '#mattack', formula: '#mattack', desc: 'Melee Attack' },
    { label: '#rattack', formula: '#rattack', desc: 'Ranged Attack' },
    { label: '#fort', formula: '#fort', desc: 'Fortitude Save' },
    { label: '#ref', formula: '#ref', desc: 'Reflex Save' },
    { label: '#will', formula: '#will', desc: 'Will Save' },
    { label: '#init', formula: '#init', desc: 'Initiative' },
    { label: '#firebreath', formula: 'firebreath', desc: 'Fire Breath' },
    { label: '#mainattack', formula: 'mainattack', desc: 'Main Melee Attack' },
  ];

  return (
    <div className={`space-y-4 ${fontClass}`}>
      {/* LEVEL STEPPER & TURN STEPPER ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEVEL STEPPER */}
        {visibleModules.levelStepper && (
          <div className={`border rounded-lg p-3 ${cardBg}`}>
            <div className={`px-2 py-1 border-b mb-2 flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs uppercase tracking-wider">Level Stepper</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">Auto-scales HP & BAB</span>
            </div>

            <div className="flex items-center justify-between gap-3 font-mono">
              <button
                onClick={() => handleStepLevel(-1)}
                disabled={character.level <= 1}
                className="px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/15 text-sm font-black rounded border border-black/10 dark:border-white/10 disabled:opacity-30 transition-colors"
                title="Level down"
              >
                - Level
              </button>

              <div className="text-center">
                <span className="text-xs text-slate-400 block uppercase">Current Level</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  Level {character.level}
                </span>
                <span className="text-[10px] opacity-70 block">
                  BAB +{character.baseAttackBonus} · ASI Points: {Math.floor(character.level / 4)}
                </span>
              </div>

              <button
                onClick={() => handleStepLevel(1)}
                disabled={character.level >= 20}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-sm font-black rounded shadow-xs disabled:opacity-30 transition-colors"
                title="Level up"
              >
                + Level Up
              </button>
            </div>
          </div>
        )}

        {/* TURN STEPPER */}
        {visibleModules.turnStepper && (
          <div className={`border rounded-lg p-3 ${cardBg}`}>
            <div className={`px-2 py-1 border-b mb-2 flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-rose-500" />
                <span className="font-bold text-xs uppercase tracking-wider">Turn & Round Stepper</span>
              </div>
              <button
                onClick={handleResetCombat}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Reset initiative"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 font-mono">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Combat Round</span>
                <span className="text-2xl font-black text-rose-500 tabular-nums">
                  Round {character.combatTracker?.round || 1}
                </span>
                <span className="text-[10px] opacity-70 block">
                  Turn {character.combatTracker?.turn || 1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextTurn}
                  className="px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/15 text-xs font-bold rounded border border-black/10 dark:border-white/10 flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Next Turn</span>
                </button>
                <button
                  onClick={handleNextRound}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow-xs flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Next Round</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICKMACROS MODULE (Requirement 3: #hp, #str, #strength, etc.) */}
      {visibleModules.quickMacros && (
        <div className={`border rounded-lg p-3 ${cardBg}`}>
          <div className={`px-2 py-1 border-b mb-2 flex items-center justify-between ${headerBg}`}>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Quickmacros & Dynamic Core Calls
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-80">
              #macro tokens live-resolve character data
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 font-mono text-xs">
            {quickMacroItems.map((item) => {
              const res = evaluateFormula(item.formula, context);
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (res.rollable) {
                      onRollFormula(res.evaluated, item.label);
                    }
                  }}
                  className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-amber-500/50 text-left transition-all group"
                  title={`Call ${item.label} -> ${res.evaluated}`}
                >
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                    <span>{item.label}</span>
                    {res.rollable && <Dices className="w-3 h-3 opacity-60 group-hover:opacity-100" />}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200 truncate mt-0.5">
                    = {res.evaluated}
                  </div>
                  <div className="text-[9px] opacity-60 truncate">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD A CLASS MODULE */}
      {visibleModules.addClass && (
        <div className={`border rounded-lg p-3 ${cardBg}`}>
          <div className={`px-2 py-1 border-b mb-2 flex items-center justify-between ${headerBg}`}>
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs uppercase tracking-wider">Add a Class (Multi-Class Builder)</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">
              Configures Hit Die & Skill Points per Class
            </span>
          </div>

          {/* Form to add a class */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs mb-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono opacity-75 mb-0.5">Class Name:</label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Rogue, Wizard, Paladin"
                className={`w-full px-2 py-1 rounded border ${inputStyle}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono opacity-75 mb-0.5">Hit Die:</label>
              <select
                value={newClassHitDie}
                onChange={(e) => setNewClassHitDie(parseInt(e.target.value) || 10)}
                className={`w-full px-2 py-1 rounded border ${inputStyle}`}
              >
                <option value={6}>d6 (Wizard, Sorcerer)</option>
                <option value={8}>d8 (Rogue, Cleric, Bard)</option>
                <option value={10}>d10 (Fighter, Paladin)</option>
                <option value={12}>d12 (Barbarian)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono opacity-75 mb-0.5">Base SP/lvl:</label>
              <select
                value={newClassSkillPoints}
                onChange={(e) => setNewClassSkillPoints(parseInt(e.target.value) || 2)}
                className={`w-full px-2 py-1 rounded border ${inputStyle}`}
              >
                <option value={2}>2 + INT</option>
                <option value={4}>4 + INT</option>
                <option value={6}>6 + INT</option>
                <option value={8}>8 + INT</option>
              </select>
            </div>
            <div>
              <button
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
                className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded shadow-xs flex items-center justify-center gap-1 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class</span>
              </button>
            </div>
          </div>

          {/* List of active classes */}
          {(character.classes || []).length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-black/10 dark:border-white/10">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Configured Classes:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {character.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-amber-500">{cls.name}</span>
                      <span className="text-[11px] opacity-75 ml-1">
                        (Lvl {cls.level} · d{cls.hitDie} · {cls.skillPointsPerLevel}+INT SP)
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveClass(cls.id)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
