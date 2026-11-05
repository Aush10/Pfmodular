import React, { useState } from 'react';
import {
  Wand2,
  Plus,
  Trash2,
  BookOpen,
  User,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { PF1Character, SpellItem, SpellSlotLevel, ConditionState } from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';
import { ConditionDebuffBar } from '../tools/ConditionDebuffBar';
import { ProfileModule } from './ProfileModule';
import { NotesModule } from './NotesModule';

interface SheetPage3SpellsBioProps {
  character: PF1Character;
  derived: DerivedCombatStats;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  visibleModules: Record<string, boolean>;
}

export const SheetPage3SpellsBio: React.FC<SheetPage3SpellsBioProps> = ({
  character,
  derived,
  theme,
  fontClass,
  onUpdateCharacter,
  visibleModules,
}) => {
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<number | 'all'>('all');
  const [statblockCopied, setStatblockCopied] = useState(false);

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

  const updateSpellSlot = (level: number, updates: Partial<SpellSlotLevel>) => {
    setField(
      'spellSlots',
      character.spellSlots.map((slot) => (slot.level === level ? { ...slot, ...updates } : slot))
    );
  };

  const addSpell = () => {
    const newSpell: SpellItem = {
      id: `sp-${Date.now()}`,
      level: selectedSpellLevel === 'all' ? 1 : selectedSpellLevel,
      name: 'New Spell',
      school: 'Evocation',
      castTime: '1 standard action',
      range: 'Close (25 ft + 5 ft/2 levels)',
      duration: 'Instantaneous',
      save: 'Reflex half',
      spellResistance: 'Yes',
      preparedCount: 1,
      isCast: false,
      description: 'Spell description and effects...',
    };
    setField('spells', [...character.spells, newSpell]);
  };

  const removeSpell = (id: string) => {
    setField('spells', character.spells.filter((s) => s.id !== id));
  };

  const updateSpell = (id: string, updates: Partial<SpellItem>) => {
    setField(
      'spells',
      character.spells.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const toggleCastSpell = (spell: SpellItem) => {
    const nextCast = !spell.isCast;
    updateSpell(spell.id, { isCast: nextCast });

    // Update used slot count for this level
    const slot = character.spellSlots.find((s) => s.level === spell.level);
    if (slot) {
      const delta = nextCast ? 1 : -1;
      updateSpellSlot(spell.level, {
        usedSlots: Math.max(0, Math.min(slot.spellsPerDay, slot.usedSlots + delta)),
      });
    }
  };

  const updateBio = (field: keyof PF1Character['biography'], val: string) => {
    setField('biography', { ...character.biography, [field]: val });
  };

  // Generate Paizo standard statblock
  const generateStatblock = () => {
    return `${character.name.toUpperCase()} CR ${character.level}
XP ${character.currentXP.toLocaleString()}
${character.gender} ${character.race} ${character.characterClass} ${character.level}
${character.alignment} ${character.size} humanoid (${character.race})
Init ${derived.initiativeTotal >= 0 ? `+${derived.initiativeTotal}` : derived.initiativeTotal}; Senses Perception +${
      character.skills.find((s) => s.name === 'Perception')?.ranks || 0
    }
--------------------------------------------------------------------------------
DEFENSE
--------------------------------------------------------------------------------
AC ${derived.acTotal}, touch ${derived.touchAC}, flat-footed ${derived.flatFootedAC}
hp ${character.hpCurrent} (${character.hitDice})
Fort ${derived.fortitudeTotal >= 0 ? `+${derived.fortitudeTotal}` : derived.fortitudeTotal}, Ref ${
      derived.reflexTotal >= 0 ? `+${derived.reflexTotal}` : derived.reflexTotal
    }, Will ${derived.willTotal >= 0 ? `+${derived.willTotal}` : derived.willTotal}
DR ${character.damageReduction || 'none'}; Resist ${character.resistances || 'none'}; Immune ${character.immunities || 'none'}
--------------------------------------------------------------------------------
OFFENSE
--------------------------------------------------------------------------------
Speed ${character.speedBase} ft., fly ${character.speedFly} ft. (${character.flyManeuverability})
Melee ${character.weapons
      .map(
        (w) =>
          `${w.name} +${character.baseAttackBonus + derived.strMod} (${w.damageFormula} / ${w.critical})`
      )
      .join(', ')}
Base Atk +${character.baseAttackBonus}; CMB +${derived.cmbTotal}; CMD ${derived.cmdTotal}
--------------------------------------------------------------------------------
STATISTICS
--------------------------------------------------------------------------------
Str ${derived.strTotal}, Dex ${derived.dexTotal}, Con ${derived.conTotal}, Int ${derived.intTotal}, Wis ${
      derived.wisTotal
    }, Cha ${derived.chaTotal}
Feats ${character.featsAndAbilities.join(', ')}
Skills ${character.skills
      .filter((s) => s.ranks > 0)
      .map((s) => `${s.name} +${s.ranks + 3}`)
      .join(', ')}
Languages ${character.languages.join(', ')}`;
  };

  const handleCopyStatblock = () => {
    navigator.clipboard.writeText(generateStatblock());
    setStatblockCopied(true);
    setTimeout(() => setStatblockCopied(false), 2000);
  };

  const filteredSpells =
    selectedSpellLevel === 'all'
      ? character.spells
      : character.spells.filter((s) => s.level === selectedSpellLevel);

  return (
    <div className={`space-y-4 ${fontClass} transition-colors duration-200`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Magic, Spell Slots & Spellbook (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Spell Slots & Saves Matrix (0 to 9th) */}
          {visibleModules.spellMatrix && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Spell Saves & Slots (0–9th)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span>CL: {character.casterLevel}</span>
                  <span>·</span>
                  <span>Key: {character.spellKeyAbility}</span>
                </div>
              </div>

              <div className="p-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-[10px] uppercase font-mono opacity-75">
                      <th className="pb-1 text-center">Level</th>
                      <th className="pb-1 text-center font-bold">DC</th>
                      <th className="pb-1 text-center">Per Day</th>
                      <th className="pb-1 text-center">Bonus</th>
                      <th className="pb-1 text-center">Known</th>
                      <th className="pb-1 text-center">Slots Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {character.spellSlots.map((slot) => {
                      const keyMod = (derived as any)[
                        `${character.spellKeyAbility.toLowerCase()}Mod`
                      ] || 0;
                      const calculatedDC = 10 + slot.level + keyMod;

                      return (
                        <tr
                          key={slot.level}
                          onClick={() => setSelectedSpellLevel(slot.level)}
                          className={`hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                            selectedSpellLevel === slot.level
                              ? 'bg-purple-500/10 dark:bg-purple-500/20 font-semibold'
                              : ''
                          }`}
                        >
                          <td className="py-1 text-center font-mono font-bold">
                            {slot.level === 0 ? 'Cantrips (0)' : `${slot.level}th`}
                          </td>
                          <td className="py-1 text-center font-mono font-bold text-purple-600 dark:text-purple-300">
                            {calculatedDC}
                          </td>
                          <td className="py-1 text-center">
                            <input
                              type="number"
                              value={slot.spellsPerDay}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateSpellSlot(slot.level, {
                                  spellsPerDay: parseInt(e.target.value) || 0,
                                })
                              }
                              className={`w-11 text-center py-0.5 font-mono text-xs rounded border ${inputStyle}`}
                            />
                          </td>
                          <td className="py-1 text-center">
                            <input
                              type="number"
                              value={slot.bonusSpells}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateSpellSlot(slot.level, {
                                  bonusSpells: parseInt(e.target.value) || 0,
                                })
                              }
                              className={`w-10 text-center py-0.5 font-mono text-xs rounded border ${inputStyle}`}
                            />
                          </td>
                          <td className="py-1 text-center">
                            <input
                              type="number"
                              value={slot.spellsKnown}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateSpellSlot(slot.level, {
                                  spellsKnown: parseInt(e.target.value) || 0,
                                })
                              }
                              className={`w-10 text-center py-0.5 font-mono text-xs rounded border ${inputStyle}`}
                            />
                          </td>
                          <td className="py-1 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 font-mono text-xs">
                              <span className="font-bold text-amber-500">{slot.usedSlots}</span>
                              <span className="opacity-50">/</span>
                              <span>{slot.spellsPerDay}</span>
                              <button
                                onClick={() =>
                                  updateSpellSlot(slot.level, {
                                    usedSlots: Math.min(slot.spellsPerDay, slot.usedSlots + 1),
                                  })
                                }
                                disabled={slot.usedSlots >= slot.spellsPerDay}
                                className="ml-1 px-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 text-[10px] disabled:opacity-30"
                              >
                                +
                              </button>
                              <button
                                onClick={() =>
                                  updateSpellSlot(slot.level, {
                                    usedSlots: Math.max(0, slot.usedSlots - 1),
                                  })
                                }
                                disabled={slot.usedSlots <= 0}
                                className="px-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 text-[10px] disabled:opacity-30"
                              >
                                -
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Spellbook & Prepared Spells */}
          {visibleModules.spellbook && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Spells Known & Prepared
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSpellLevel('all')}
                    className={`px-2 py-0.5 text-xs rounded font-mono ${
                      selectedSpellLevel === 'all'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={addSpell}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Spell</span>
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2.5 max-h-[500px] overflow-y-auto">
                {filteredSpells.length === 0 ? (
                  <div className="p-6 text-center text-xs opacity-60">
                    No spells at this level. Click "Add Spell" to log one.
                  </div>
                ) : (
                  filteredSpells.map((sp) => (
                    <div
                      key={sp.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        sp.isCast
                          ? 'opacity-50 line-through bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            onClick={() => toggleCastSpell(sp)}
                            className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                              sp.isCast
                                ? 'bg-black/10 dark:bg-white/10 text-slate-500'
                                : 'bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white'
                            }`}
                            title="Click to toggle Cast / Spent"
                          >
                            {sp.isCast ? 'Cast' : 'Cast?'}
                          </button>
                          <input
                            type="text"
                            value={sp.name}
                            onChange={(e) => updateSpell(sp.id, { name: e.target.value })}
                            className={`font-bold text-xs px-2 py-0.5 rounded border flex-1 ${inputStyle}`}
                          />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px]">
                            Lvl {sp.level}
                          </span>
                          <span className="opacity-70 text-[11px]">{sp.school}</span>
                          <button
                            onClick={() => removeSpell(sp.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono opacity-80 mb-1">
                        <div>Time: {sp.castTime}</div>
                        <div>Range: {sp.range}</div>
                        <div>Save: {sp.save}</div>
                      </div>

                      <input
                        type="text"
                        value={sp.description}
                        onChange={(e) => updateSpell(sp.id, { description: e.target.value })}
                        placeholder="Spell effect description..."
                        className={`w-full text-[11px] px-2 py-1 rounded border opacity-90 ${inputStyle}`}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Conditions, Bio & Statblock Generator (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Conditions & Debuffs Bar */}
          {visibleModules.conditions && (
            <ConditionDebuffBar
              conditions={character.conditions}
              onToggleCondition={(key) =>
                setField('conditions', {
                  ...character.conditions,
                  [key]: !character.conditions[key],
                })
              }
              onClearAll={() => {
                const cleared: ConditionState = { ...character.conditions };
                for (const k of Object.keys(cleared) as Array<keyof ConditionState>) {
                  cleared[k] = false;
                }
                setField('conditions', cleared);
              }}
            />
          )}

          {/* Character Bio, Traits & Flaws */}
          {visibleModules.biography && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Character Traits & Background
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold opacity-75 uppercase mb-1">
                    Description & Visuals
                  </label>
                  <textarea
                    rows={2}
                    value={character.biography.description}
                    onChange={(e) => updateBio('description', e.target.value)}
                    className={`w-full px-2 py-1 rounded border ${inputStyle}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold opacity-75 uppercase mb-1">
                      Personality
                    </label>
                    <textarea
                      rows={2}
                      value={character.biography.personality}
                      onChange={(e) => updateBio('personality', e.target.value)}
                      className={`w-full px-2 py-1 rounded border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold opacity-75 uppercase mb-1">
                      Character Traits
                    </label>
                    <textarea
                      rows={2}
                      value={character.biography.traits}
                      onChange={(e) => updateBio('traits', e.target.value)}
                      className={`w-full px-2 py-1 rounded border ${inputStyle}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold opacity-75 uppercase mb-1">
                      Contacts & Allies
                    </label>
                    <textarea
                      rows={2}
                      value={character.biography.allies}
                      onChange={(e) => updateBio('allies', e.target.value)}
                      className={`w-full px-2 py-1 rounded border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold opacity-75 uppercase mb-1">
                      Enemies & Nemeses
                    </label>
                    <textarea
                      rows={2}
                      value={character.biography.enemies}
                      onChange={(e) => updateBio('enemies', e.target.value)}
                      className={`w-full px-2 py-1 rounded border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Module with Picture & Titled Blocks */}
          {visibleModules.profile && (
            <ProfileModule
              character={character}
              theme={theme}
              fontClass={fontClass}
              onUpdateCharacter={onUpdateCharacter}
            />
          )}

          {/* Roll-up Notes & Scratchpad */}
          {visibleModules.notes && (
            <NotesModule
              character={character}
              theme={theme}
              fontClass={fontClass}
              onUpdateCharacter={onUpdateCharacter}
            />
          )}

          {/* Paizo Standard Statblock Generator */}
          {visibleModules.statblock && (
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Statistic Block (Paizo Standard)
                  </span>
                </div>
                <button
                  onClick={handleCopyStatblock}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
                >
                  {statblockCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{statblockCopied ? 'Copied!' : 'Copy Statblock'}</span>
                </button>
              </div>
              <div className="p-3">
                <pre className="p-3 rounded bg-black/10 dark:bg-black/50 border border-black/10 dark:border-white/10 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-64 select-text">
                  {generateStatblock()}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
