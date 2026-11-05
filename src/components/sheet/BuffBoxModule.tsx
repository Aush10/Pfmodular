import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Zap,
  CheckSquare,
  Square,
  Play,
  Terminal,
} from 'lucide-react';
import {
  BuffBonusType,
  BuffStatTarget,
  BuffBoxData,
  CustomBuffEffect,
  PF1Character,
} from '../../types/character';
import { computeBuffBoxTotals } from '../../engine/pf1eMath';
import { executeMacaroni, pickQuirkyMessage } from '../../engine/macaroni';

export const BUFF_BONUS_TYPES: BuffBonusType[] = [
  'Untyped',        // Row 1
  'Enhancement',    // Row 2
  'Circumstance',   // Row 3
  'Competence',     // Row 4
  'Deflection',     // Row 5
  'Dodge',          // Row 6
  'Insight',        // Row 7
  'Item',           // Row 8
  'Inherent',       // Row 9
  'Luck',           // Row 10
  'Morale',         // Row 11
  'Pro/Sac',        // Row 12
  'Race',           // Row 13
  'NAT armor',      // Row 14
  'Armor',          // Row 15
  'Level advance',  // Row 16
  'Shield',         // Row 17
  'Size',           // Row 18
  'Alt size',       // Row 19
];

export const BUFF_STAT_TARGETS: Array<{ key: BuffStatTarget; label: string; shortLabel: string }> = [
  { key: 'hp', label: 'HP', shortLabel: 'HP' },                 // Col 1
  { key: 'mattack', label: 'Mattack', shortLabel: 'MATTACK' },  // Col 2
  { key: 'rattack', label: 'Rattack', shortLabel: 'RATTACK' },  // Col 3
  { key: 'fort', label: 'Fort', shortLabel: 'FORT' },           // Col 4
  { key: 'ref', label: 'Ref', shortLabel: 'REF' },              // Col 5
  { key: 'will', label: 'Will', shortLabel: 'WILL' },           // Col 6
  { key: 'ac', label: 'AC', shortLabel: 'AC' },                 // Col 7
  { key: 'str', label: 'STR', shortLabel: 'STR' },              // Col 8
  { key: 'dex', label: 'DEX', shortLabel: 'DEX' },              // Col 9
  { key: 'con', label: 'CON', shortLabel: 'CON' },              // Col 10
  { key: 'int', label: 'INT', shortLabel: 'INT' },              // Col 11
  { key: 'wis', label: 'WIS', shortLabel: 'WIS' },              // Col 12
  { key: 'cha', label: 'CHA', shortLabel: 'CHA' },              // Col 13
  { key: 'str_mod', label: 'STR Mod', shortLabel: 'STR MOD' },  // Col 14
  { key: 'dex_mod', label: 'DEX Mod', shortLabel: 'DEX MOD' },  // Col 15
  { key: 'con_mod', label: 'CON Mod', shortLabel: 'CON MOD' },  // Col 16
  { key: 'int_mod', label: 'INT Mod', shortLabel: 'INT MOD' },  // Col 17
  { key: 'wis_mod', label: 'WIS Mod', shortLabel: 'WIS MOD' },  // Col 18
  { key: 'cha_mod', label: 'CHA Mod', shortLabel: 'CHA MOD' },  // Col 19
];

export function createEmptyBuffBox(): BuffBoxData {
  const box = {} as BuffBoxData;
  for (const bType of BUFF_BONUS_TYPES) {
    box[bType] = {
      hp: 0,
      mattack: 0,
      rattack: 0,
      fort: 0,
      ref: 0,
      will: 0,
      ac: 0,
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
      str_mod: 0,
      dex_mod: 0,
      con_mod: 0,
      int_mod: 0,
      wis_mod: 0,
      cha_mod: 0,
    };
  }
  return box;
}

const PRESET_TEMPLATES: Array<{
  name: string;
  category: 'activatable' | 'permanent' | 'debuff';
  bonusType: BuffBonusType;
  values: Partial<Record<BuffStatTarget, number>>;
  macro?: string;
  notes?: string;
}> = [
  {
    name: 'Mage Armor',
    category: 'activatable',
    bonusType: 'Enhancement',
    values: { ac: 4 },
    macro: 'MageArmor:|<^{7:2}+4>|$',
    notes: '+4 armor/enhancement bonus to AC (1 hour/level)',
  },
  {
    name: 'Sustained +10 AC',
    category: 'activatable',
    bonusType: 'Untyped',
    values: { ac: 10 },
    macro: 'SustainedWard:|<^{7:1}+10>|$',
    notes: 'Sustained +10 untyped bonus to AC',
  },
  {
    name: 'Bardic Inspiration +2',
    category: 'activatable',
    bonusType: 'Competence',
    values: { mattack: 2, rattack: 2, will: 2 },
    macro: 'BardicInspiration: <^MATTACK.Competence+2, RATTACK.Competence+2, WILL.Morale+2>',
    notes: 'Inspire Courage +2 competence on attacks/damage, +2 morale vs fear',
  },
  {
    name: 'Barbarian Rage',
    category: 'activatable',
    bonusType: 'Morale',
    values: { str: 4, con: 4, will: 2, ac: -2 },
    macro: 'BarbarianRage: <^STR.Morale+4, CON.Morale+4, WILL.Morale+2, AC-2>',
    notes: '+4 Morale STR & CON, +2 Morale Will, -2 AC penalty',
  },
  {
    name: 'Dodge Feat',
    category: 'permanent',
    bonusType: 'Dodge',
    values: { ac: 2 },
    macro: 'DodgeFeat:|<^AC.Dodge+2>|$',
    notes: 'Permanent +2 Dodge bonus to AC',
  },
  {
    name: 'Grappled',
    category: 'debuff',
    bonusType: 'Untyped',
    values: { dex: -4, mattack: -2, rattack: -2 },
    macro: 'Grappled: <^DEX-4, MATTACK-2, RATTACK-2>',
    notes: '-4 penalty to Dexterity, -2 penalty on all attack rolls & CMB',
  },
  {
    name: 'Sickened',
    category: 'debuff',
    bonusType: 'Untyped',
    values: { mattack: -2, rattack: -2, fort: -2, ref: -2, will: -2 },
    macro: 'Sickened: <^MATTACK-2, RATTACK-2, FORT-2, REF-2, WILL-2>',
    notes: '-2 untyped penalty on all attack rolls, weapon damage, saves, and skill checks',
  },
  {
    name: 'Shaken',
    category: 'debuff',
    bonusType: 'Untyped',
    values: { mattack: -2, rattack: -2, fort: -2, ref: -2, will: -2 },
    macro: 'Shaken: <^MATTACK-2, RATTACK-2, FORT-2, REF-2, WILL-2>',
    notes: '-2 untyped penalty on attack rolls, saving throws, skill checks, and ability checks',
  },
  {
    name: 'Haste',
    category: 'activatable',
    bonusType: 'Dodge',
    values: { mattack: 1, rattack: 1, ac: 1, ref: 1 },
    macro: 'Haste: <^MATTACK+1, RATTACK+1, AC.Dodge+1, REF.Dodge+1>',
    notes: '+1 attack, +1 dodge AC, +1 Reflex, +30ft speed',
  },
  {
    name: 'Heroism',
    category: 'activatable',
    bonusType: 'Morale',
    values: { mattack: 2, rattack: 2, fort: 2, ref: 2, will: 2 },
    macro: 'Heroism: <^MATTACK.Morale+2, RATTACK.Morale+2, FORT.Morale+2, REF.Morale+2, WILL.Morale+2>',
    notes: '+2 morale bonus to attack rolls, saves, and skill checks',
  },
  {
    name: "Bull's Strength",
    category: 'activatable',
    bonusType: 'Enhancement',
    values: { str: 4 },
    macro: 'BullsStrength: <^STR.Enhancement+4>',
    notes: '+4 enhancement to Strength',
  },
  {
    name: 'Shield of Faith',
    category: 'activatable',
    bonusType: 'Deflection',
    values: { ac: 2 },
    macro: 'ShieldOfFaith: <^AC.Deflection+2>',
    notes: '+2 deflection bonus to AC',
  },
];

interface BuffBoxModuleProps {
  buffBox?: BuffBoxData;
  customBuffs?: CustomBuffEffect[];
  onUpdateBuffBox: (newBox: BuffBoxData) => void;
  onUpdateCustomBuffs?: (newBuffs: CustomBuffEffect[]) => void;
  abilities?: PF1Character['abilities'];
  onUpdateCharacter?: (updater: (prev: PF1Character) => PF1Character) => void;
  theme?: string;
  fontClass?: string;
  isToolModal?: boolean;
  onCloseModal?: () => void;
}

export const BuffBoxModule: React.FC<BuffBoxModuleProps> = ({
  buffBox,
  customBuffs = [],
  onUpdateBuffBox,
  onUpdateCustomBuffs,
  onUpdateCharacter,
  theme = 'parchment',
  fontClass = '',
  isToolModal = false,
  onCloseModal,
}) => {
  const [viewMode, setViewMode] = useState<'expanded' | 'rollup' | 'icon'>(
    isToolModal ? 'expanded' : 'rollup'
  );
  const [showFullMatrixTable, setShowFullMatrixTable] = useState(true);

  // New Buff / Debuff Creator Form State (Simplified single-row header!)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'activatable' | 'permanent' | 'debuff'>('activatable');
  const [newBonusType, setNewBonusType] = useState<BuffBonusType>('Untyped');
  const [quickStatKey, setQuickStatKey] = useState<BuffStatTarget>('ac');
  const [quickStatVal, setQuickStatVal] = useState<number>(4);
  const [newValues, setNewValues] = useState<Partial<Record<BuffStatTarget, number>>>({});
  const [editingBuffId, setEditingBuffId] = useState<string | null>(null);

  // Inline Macro Sensitive Area State
  const [macroInput, setMacroInput] = useState('MageArmor:|<^{7:2}+4>|$');
  const [liveMacroResult, setLiveMacroResult] = useState<string>('Ready — type or run a <^...> buff macro');
  const [quirkySubtext, setQuirkySubtext] = useState<string>('');

  const safeBox: BuffBoxData = buffBox || createEmptyBuffBox();
  const totals = computeBuffBoxTotals(safeBox, customBuffs);

  const activeCount = customBuffs.filter((b) => b.isActive).length;

  const activeAlteredStats = BUFF_STAT_TARGETS.filter((t) => totals[t.key] !== 0).map((t) => ({
    label: t.label,
    value: totals[t.key],
    key: t.key,
  }));

  const updateCellInMatrix = (bonusType: BuffBonusType, stat: BuffStatTarget, value: number) => {
    const updated: BuffBoxData = {
      ...safeBox,
      [bonusType]: {
        ...(safeBox[bonusType] || {}),
        [stat]: value,
      },
    };
    onUpdateBuffBox(updated);
  };

  const handleToggleBuff = (id: string) => {
    if (!onUpdateCustomBuffs) return;
    const target = customBuffs.find((b) => b.id === id);
    const updated = customBuffs.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
    onUpdateCustomBuffs(updated);
    if (target) {
      const nextState = !target.isActive;
      setLiveMacroResult(`${target.name}: ${nextState ? 'ACTIVE' : 'INACTIVE'}`);
      setQuirkySubtext(pickQuirkyMessage(nextState ? (target.category === 'debuff' ? 'debuff' : 'buff') : 'toggled_off'));
    }
  };

  const handleDeleteBuff = (id: string) => {
    if (!onUpdateCustomBuffs) return;
    onUpdateCustomBuffs(customBuffs.filter((b) => b.id !== id));
  };

  const handleAddQuickStatToDraft = () => {
    if (quickStatVal === 0) return;
    setNewValues((prev) => ({
      ...prev,
      [quickStatKey]: quickStatVal,
    }));
  };

  const handleSaveBuff = () => {
    if (!newName.trim() || !onUpdateCustomBuffs) return;

    // If user didn't click "+ Stat" yet, include the currently selected quickStatKey/quickStatVal if non-zero
    const effectiveValues: Partial<Record<BuffStatTarget, number>> =
      Object.keys(newValues).length > 0
        ? { ...newValues }
        : quickStatVal !== 0
        ? { [quickStatKey]: quickStatVal }
        : { ac: 2 };

    if (editingBuffId) {
      const updated = customBuffs.map((b) =>
        b.id === editingBuffId
          ? {
              ...b,
              name: newName.trim(),
              category: newCategory,
              bonusType: newBonusType,
              values: effectiveValues,
            }
          : b
      );
      onUpdateCustomBuffs(updated);
      setLiveMacroResult(`Updated "${newName.trim()}" (${newBonusType})`);
      setQuirkySubtext(pickQuirkyMessage(newCategory === 'debuff' ? 'debuff' : 'buff'));
      setEditingBuffId(null);
    } else {
      const newBuff: CustomBuffEffect = {
        id: `buff-${Date.now()}`,
        name: newName.trim(),
        category: newCategory,
        bonusType: newBonusType,
        isActive: true,
        values: effectiveValues,
      };
      onUpdateCustomBuffs([newBuff, ...customBuffs]);
      setLiveMacroResult(`Added & Activated "${newBuff.name}"`);
      setQuirkySubtext(pickQuirkyMessage(newCategory === 'debuff' ? 'debuff' : 'buff'));
    }

    setNewName('');
    setNewValues({});
  };

  const handleEditBuff = (b: CustomBuffEffect) => {
    setEditingBuffId(b.id);
    setNewName(b.name);
    setNewCategory(b.category);
    setNewBonusType(b.bonusType);
    setNewValues({ ...(b.values || {}) });
    const firstKey = (Object.keys(b.values || {})[0] as BuffStatTarget) || 'ac';
    setQuickStatKey(firstKey);
    setQuickStatVal(b.values?.[firstKey] || 2);
    if (viewMode !== 'expanded') {
      setViewMode('expanded');
    }
  };

  const handleLoadTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    if (onUpdateCustomBuffs) {
      // Immediately add or update the preset so the user gets 1-click gratification, AND populate the form + macro box!
      const existingIdx = customBuffs.findIndex(
        (b) => b.name.toLowerCase() === tpl.name.toLowerCase()
      );
      if (existingIdx >= 0) {
        const nextBuffs = [...customBuffs];
        nextBuffs[existingIdx] = {
          ...nextBuffs[existingIdx],
          isActive: true,
          category: tpl.category,
          bonusType: tpl.bonusType,
          values: { ...tpl.values },
        };
        onUpdateCustomBuffs(nextBuffs);
      } else {
        const newBuff: CustomBuffEffect = {
          id: `preset-${Date.now()}`,
          name: tpl.name,
          category: tpl.category,
          bonusType: tpl.bonusType,
          isActive: true,
          values: { ...tpl.values },
          notes: tpl.notes,
        };
        onUpdateCustomBuffs([newBuff, ...customBuffs]);
      }
    }
    setNewName(tpl.name);
    setNewCategory(tpl.category);
    setNewBonusType(tpl.bonusType);
    setNewValues({ ...tpl.values });
    if (tpl.macro) {
      setMacroInput(tpl.macro);
    }
    setLiveMacroResult(`Loaded Preset: ${tpl.name} (${tpl.bonusType})`);
    setQuirkySubtext(pickQuirkyMessage(tpl.category === 'debuff' ? 'debuff' : 'buff'));
  };

  /**
   * Executes a Macaroni macro directly inside the Buff Box's Macro Sensitive Area!
   * Supports <^{col:row}+N>, <^Stat.Type+N>, <^ALLCAPS+N>, named MageArmor:|<^{7:2}+4>|$, or unnamed <^AC+10>.
   */
  const handleRunInlineMacro = () => {
    const expr = macroInput.trim();
    if (!expr) return;

    const dummyCharacter = {
      level: 1,
      baseAttackBonus: 1,
      casterLevel: 1,
      hpCurrent: 20,
      hpTotalMax: 20,
      hpTemp: 0,
      abilities: {
        STR: { name: 'STR', base: 14, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
        DEX: { name: 'DEX', base: 14, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
        CON: { name: 'CON', base: 14, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
        INT: { name: 'INT', base: 12, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
        WIS: { name: 'WIS', base: 12, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
        CHA: { name: 'CHA', base: 12, raceMod: 0, levelAsiMod: 0, enhMod: 0, miscMod: 0, tempMod: 0 },
      },
      buffBox: safeBox,
      customBuffs,
    } as unknown as PF1Character;

    const macRes = executeMacaroni(expr, {
      character: dummyCharacter,
      formulaContext: {},
    });

    if (macRes.buffMakeEvents && macRes.buffMakeEvents.length > 0) {
      let nextBox = { ...safeBox };
      let nextCustomBuffs = [...customBuffs];
      const summaries: string[] = [];
      let qKind: 'buff' | 'debuff' | 'locked' | 'toggled_off' = 'buff';

      for (const spec of macRes.buffMakeEvents) {
        if (spec.isDirectMatrix || !spec.name) {
          // Unnamed macro -> populate 19-row base matrix directly!
          for (const entry of spec.matrixEntries) {
            nextBox = {
              ...nextBox,
              [entry.bonusType]: {
                ...(nextBox[entry.bonusType] || {}),
                [entry.stat]: entry.value,
              },
            };
          }
          onUpdateBuffBox(nextBox);
          qKind = spec.category === 'debuff' ? 'debuff' : 'buff';
          summaries.push(`Matrix Cell Set: ${spec.summaryText}`);
        } else {
          // Named macro -> create, lock ($), or toggle in Saved Status Effects
          const existingIdx = nextCustomBuffs.findIndex(
            (b) => b.name.toLowerCase() === spec.name!.toLowerCase()
          );
          if (existingIdx >= 0) {
            const existing = nextCustomBuffs[existingIdx];
            if (spec.isLockedOnce && existing.isActive) {
              qKind = 'locked';
              summaries.push(`${existing.name} is ACTIVE & Locked ($)`);
            } else {
              const nextActive = spec.isLockedOnce ? true : !existing.isActive;
              nextCustomBuffs[existingIdx] = {
                ...existing,
                isActive: nextActive,
                bonusType: spec.bonusType,
                category: spec.category,
                values: spec.values,
              };
              if (onUpdateCustomBuffs) onUpdateCustomBuffs(nextCustomBuffs);
              qKind = nextActive ? (spec.category === 'debuff' ? 'debuff' : 'buff') : 'toggled_off';
              summaries.push(`${existing.name} ➜ ${nextActive ? 'ON' : 'OFF'}`);
            }
          } else {
            const created: CustomBuffEffect = {
              id: `mac-buff-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              name: spec.name,
              category: spec.category,
              bonusType: spec.bonusType,
              isActive: true,
              values: spec.values,
              notes: `Macro: ${expr}`,
            };
            nextCustomBuffs = [created, ...nextCustomBuffs];
            if (onUpdateCustomBuffs) onUpdateCustomBuffs(nextCustomBuffs);
            qKind = spec.category === 'debuff' ? 'debuff' : 'buff';
            summaries.push(spec.summaryText);
          }
        }
      }

      setLiveMacroResult(summaries.join(' • '));
      setQuirkySubtext(pickQuirkyMessage(qKind));
    } else {
      setLiveMacroResult(macRes.fullOutput || 'Executed macro');
      setQuirkySubtext(macRes.quirkyMessage || pickQuirkyMessage('roll'));
    }

    // If macro also triggered a UI Make alert <"">, dispatch it
    if (macRes.alertEvents && macRes.alertEvents.length > 0) {
      macRes.alertEvents.forEach((alert) => {
        window.dispatchEvent(
          new CustomEvent('macaroni:alert', {
            detail: {
              id: `alert-${Date.now()}-${Math.random()}`,
              message: alert.message,
              tag: alert.tag,
              preset: alert.preset,
              timestamp: Date.now(),
            },
          })
        );
      });
    }
  };

  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-slate-950 border-cyan-500/40 text-slate-100 shadow-lg'
    : isBlueprint
    ? 'bg-slate-950 border-cyan-500/50 text-cyan-50 shadow-cyan-950/50'
    : isMythWeavers
    ? 'bg-[#0f1217] border-[#2d3139] text-slate-100'
    : 'bg-slate-950 border-slate-700 text-slate-100';

  const headerBg = 'bg-slate-900/95 border-cyan-500/30 text-cyan-300 font-mono';
  const inputStyle =
    'bg-slate-900/90 border-slate-700/80 text-cyan-100 focus:border-cyan-400 focus:outline-none';

  // Compact Icon Mode |<^>|
  if (viewMode === 'icon') {
    return (
      <div className="inline-flex items-center">
        <button
          onClick={() => setViewMode('rollup')}
          className="px-2.5 py-1 rounded-md font-mono text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md border border-amber-400 flex items-center gap-1.5 transition-all"
          title="Expand Buff Box (|<^>|)"
        >
          <span>|&lt;^&gt;|</span>
          <span>Buff Box</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 text-[10px]">
            {activeCount} active
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${cardBg} ${fontClass} transition-all duration-200`}>
      {/* Header Bar */}
      <div className={`px-3 py-2 border-b flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-cyan-300">
            Buff Box: Status Effects &amp; Bonus Matrix
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            {activeCount} Active / {customBuffs.length} Total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('icon')}
            className="px-2 py-0.5 text-xs font-mono font-bold rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
            title="Roll into compact icon |<^>|"
          >
            |&lt;^&gt;|
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'expanded' ? 'rollup' : 'expanded')}
            className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded border border-cyan-500/30 bg-slate-900 hover:bg-slate-800 text-cyan-200 flex items-center gap-1 transition-colors"
          >
            {viewMode === 'expanded' ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Roll Up</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand Matrix</span>
              </>
            )}
          </button>

          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ROLLED UP VIEW */}
      {viewMode === 'rollup' && (
        <div className="p-3 space-y-2 bg-slate-950">
          {activeAlteredStats.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>No active buffs or debuffs. Check an effect below or expand to use the Macaroni Buff Maker.</span>
              <button
                onClick={() => setViewMode('expanded')}
                className="text-xs font-bold text-cyan-400 hover:underline ml-2 font-mono"
              >
                Open Buff Box
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-amber-300 mr-1 font-mono">Active Sum Matrix:</span>
              {activeAlteredStats.map((stat) => (
                <span
                  key={stat.key}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                    stat.value > 0
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {stat.label}: {stat.value > 0 ? `+${stat.value}` : stat.value}
                </span>
              ))}
              <button
                onClick={() => setViewMode('expanded')}
                className="text-[11px] underline text-cyan-400 hover:text-cyan-300 ml-auto font-mono"
              >
                Manage Effects
              </button>
            </div>
          )}

          {customBuffs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-800/80">
              {customBuffs.slice(0, 10).map((buff) => (
                <button
                  key={buff.id}
                  onClick={() => handleToggleBuff(buff.id)}
                  className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border transition-all ${
                    buff.isActive
                      ? buff.category === 'debuff'
                        ? 'bg-rose-950/80 border-rose-500/50 text-rose-200 font-bold'
                        : 'bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {buff.isActive ? (
                    <CheckSquare className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Square className="w-3 h-3 text-slate-600" />
                  )}
                  <span>{buff.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXPANDED VIEW — Matches Simplified Blueprint Reference Layout */}
      {viewMode === 'expanded' && (
        <div className="p-3 space-y-3 bg-[#090d14]">
          {/* 1. STREAMLINED SINGLE-ROW CREATOR BAR */}
          <div className="p-3 rounded-lg border border-cyan-500/30 bg-[#0d131d] space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-200 uppercase tracking-wide">
                  {editingBuffId ? 'Edit Status Effect / Buff' : 'Create New Buff or Debuff'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  (Supports negative penalties &amp; Untyped debuffs)
                </span>
              </div>

              <select
                onChange={(e) => {
                  const tpl = PRESET_TEMPLATES.find((p) => p.name === e.target.value);
                  if (tpl) handleLoadTemplate(tpl);
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="" disabled>
                  Load Standard Preset...
                </option>
                {PRESET_TEMPLATES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.category} • {p.bonusType})
                  </option>
                ))}
              </select>
            </div>

            {/* Single Streamlined Row: Name + Category + Bonus Type + Quick Stat Adder */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end text-xs">
              <div className="md:col-span-4">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Name of Buff / Debuff
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Haste, Sickened, Bull's Strength, Shaken"
                  className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono ${inputStyle}`}
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Status Effect Category
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setNewCategory('activatable')}
                    className={`py-1.5 rounded text-[11px] font-mono text-center border transition-all ${
                      newCategory === 'activatable'
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Activatable
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('permanent')}
                    className={`py-1.5 rounded text-[11px] font-mono text-center border transition-all ${
                      newCategory === 'permanent'
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Permanent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory('debuff');
                      setNewBonusType('Untyped');
                    }}
                    className={`py-1.5 rounded text-[11px] font-mono text-center border transition-all ${
                      newCategory === 'debuff'
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Debuff
                  </button>
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Bonus Type
                </label>
                <select
                  value={newBonusType}
                  onChange={(e) => setNewBonusType(e.target.value as BuffBonusType)}
                  className={`w-full px-2.5 py-1.5 rounded border font-mono text-xs ${inputStyle}`}
                >
                  {BUFF_BONUS_TYPES.map((bt, idx) => (
                    <option key={bt} value={bt}>
                      {idx + 1}. {bt} {bt === 'Untyped' ? '(Debuff default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compact Stat Modifier Bar (Replaces the 19-box wall!) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-[10px] text-slate-400 uppercase">Target Stat:</span>
                <select
                  value={quickStatKey}
                  onChange={(e) => setQuickStatKey(e.target.value as BuffStatTarget)}
                  className={`px-2 py-1 rounded border text-xs font-mono ${inputStyle}`}
                >
                  {BUFF_STAT_TARGETS.map((t, idx) => (
                    <option key={t.key} value={t.key}>
                      Col {idx + 1}: {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={quickStatVal}
                  onChange={(e) => setQuickStatVal(parseInt(e.target.value, 10) || 0)}
                  className={`w-16 text-center py-1 rounded border text-xs font-mono font-bold tabular-nums ${inputStyle}`}
                  title="Modifier Value (e.g. +4 or -2)"
                />
                <button
                  type="button"
                  onClick={handleAddQuickStatToDraft}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono"
                >
                  + Stat
                </button>

                {/* Show any queued stat chips */}
                {Object.entries(newValues)
                  .filter(([, v]) => (v || 0) !== 0)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      onClick={() =>
                        setNewValues((prev) => {
                          const copy = { ...prev };
                          delete copy[k as BuffStatTarget];
                          return copy;
                        })
                      }
                      className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold cursor-pointer hover:border-rose-400"
                      title="Click to remove stat"
                    >
                      {k.toUpperCase()}: {(v || 0) >= 0 ? `+${v}` : v} ×
                    </span>
                  ))}
              </div>

              <div className="flex items-center gap-2">
                {editingBuffId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBuffId(null);
                      setNewName('');
                      setNewValues({});
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveBuff}
                  disabled={!newName.trim()}
                  className="px-3.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingBuffId ? 'Update Buff' : 'Save Buff'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. SUM MATRIX OF ALL ACTIVE BUFFS & DEBUFFS (Directly below Creator!) */}
          <div className="p-3 rounded-lg border border-amber-500/40 bg-[#0b1018] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                  Sum Matrix of All Active Buffs &amp; Debuffs ({activeCount} Active)
                </span>
              </div>
              <button
                onClick={() => setShowFullMatrixTable(!showFullMatrixTable)}
                className="text-[11px] font-mono text-cyan-400 hover:underline"
              >
                {showFullMatrixTable ? 'Hide 19-Row Typed Matrix' : 'Show Full 19-Row Typed Matrix'}
              </button>
            </div>

            {/* Condensed 19-Column Sum Table — Fits without horizontal scrolling */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-center border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-400">
                    <th className="py-1.5 px-1 text-left w-[96px]">Category</th>
                    {BUFF_STAT_TARGETS.map((t) => (
                      <th key={t.key} className="py-1 px-0.5 text-center leading-tight truncate">
                        {t.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-900/60 font-bold border-b border-slate-800/80">
                    <td className="py-2 px-1 text-left text-amber-400 font-bold text-[10px] uppercase leading-tight">
                      Total Active Sum
                    </td>
                    {BUFF_STAT_TARGETS.map((t) => {
                      const totalVal = totals[t.key];
                      return (
                        <td key={t.key} className="py-2 px-0.5 text-[11px] tabular-nums">
                          <span
                            className={`inline-block w-full rounded py-0.5 ${
                              totalVal > 0
                                ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 font-black'
                                : totalVal < 0
                                ? 'bg-rose-950/90 text-rose-400 border border-rose-500/40 font-black'
                                : 'text-slate-600'
                            }`}
                          >
                            {totalVal > 0 ? `+${totalVal}` : totalVal}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. SAVED STATUS EFFECTS + INLINE MACRO SENSITIVE AREA */}
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  Saved Status Effects ({customBuffs.length})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (Click checkbox to activate or deactivate)
                </span>
              </div>

              {/* Inline Macro Sensitive Area + Run + Live Result of Buff in Effect */}
              <div className="flex flex-wrap items-center gap-1.5 flex-1 lg:justify-end">
                <div className="relative flex items-center min-w-[230px] sm:min-w-[270px]">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={macroInput}
                    onChange={(e) => setMacroInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunInlineMacro();
                    }}
                    placeholder="Macro sensitive area: MageArmor:|<^{7:2}+4>|$"
                    className="w-full pl-7 pr-2 py-1 rounded bg-indigo-950/60 border border-indigo-400/50 text-indigo-100 placeholder-indigo-300/50 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                    title="Type any Macaroni buff macro: <^{col:row}+N>, <^Stat.Type+N>, or <^ENHANCEMENTBONUSTOAC+4>"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunInlineMacro}
                  className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>run</span>
                </button>

                <div
                  className="px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-100 text-[11px] font-mono min-w-[200px] max-w-md truncate"
                  title={`${liveMacroResult}${quirkySubtext ? ` — ${quirkySubtext}` : ''}`}
                >
                  <span className="text-cyan-300 font-bold">{liveMacroResult}</span>
                  {quirkySubtext && (
                    <span className="ml-2 text-[10px] text-amber-300/90 italic">• {quirkySubtext}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2-Column Saved Buffs Grid */}
            {customBuffs.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-center text-xs text-slate-400 font-mono">
                No saved status effects yet. Run <code>MageArmor:|&lt;^&#123;7:2&#125;+4&gt;|$</code> above or load a standard preset!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                {customBuffs.map((buff) => {
                  const nonZeroVals = BUFF_STAT_TARGETS.filter((t) => (buff.values[t.key] || 0) !== 0);
                  const isDebuff =
                    buff.category === 'debuff' || nonZeroVals.some((t) => (buff.values[t.key] || 0) < 0);

                  return (
                    <div
                      key={buff.id}
                      className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-2.5 ${
                        buff.isActive
                          ? isDebuff
                            ? 'bg-[#2a0e1b]/80 border-rose-500/60 text-rose-100 shadow-xs'
                            : 'bg-[#0c2430]/80 border-cyan-500/60 text-cyan-100 shadow-xs'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBuff(buff.id)}
                          className="mt-0.5 shrink-0 focus:outline-none"
                          title={buff.isActive ? 'Deactivate effect' : 'Activate effect'}
                        >
                          {buff.isActive ? (
                            <CheckSquare
                              className={`w-4 h-4 ${isDebuff ? 'text-rose-400' : 'text-cyan-400'}`}
                            />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => handleToggleBuff(buff.id)}
                              className={`font-bold text-xs font-mono cursor-pointer ${
                                buff.isActive ? 'text-white' : 'text-slate-400 line-through'
                              }`}
                            >
                              {buff.name}
                            </span>

                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                buff.category === 'permanent'
                                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                                  : buff.category === 'debuff'
                                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                                  : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
                              }`}
                            >
                              {buff.category}
                            </span>

                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              {buff.bonusType}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {nonZeroVals.length === 0 ? (
                              <span className="text-[10px] text-slate-500 italic">No modifiers</span>
                            ) : (
                              nonZeroVals.map((t) => {
                                const val = buff.values[t.key] || 0;
                                return (
                                  <span
                                    key={t.key}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      val > 0
                                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-rose-950/90 text-rose-300 border border-rose-500/40'
                                    }`}
                                  >
                                    {t.label}: {val > 0 ? `+${val}` : val}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditBuff(buff)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Edit effect"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBuff(buff.id)}
                          className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete effect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. 19-ROW BONUS TYPE DISTRIBUTION (BASE MATRIX) — Condensed, No X-Scroll, Vertical Scroll */}
          {showFullMatrixTable && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  19 Row Bonus Type Distribution (Base Matrix)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Enter manual typed numbers directly into cells or use <code>&lt;^&#123;col:row&#125;+val&gt;</code>
                </span>
              </div>

              {/* Modified vertical scroll container — all 19 columns condensed to fit without horizontal scroll */}
              <div className="max-h-[260px] overflow-y-auto overflow-x-hidden border border-slate-800 rounded-lg bg-[#070a0f]">
                <table className="w-full table-fixed text-left border-collapse font-mono">
                  <thead className="sticky top-0 bg-[#0d131d] text-slate-200 text-[9px] uppercase font-bold border-b border-slate-700 z-10">
                    <tr>
                      <th className="py-1.5 px-2 w-[112px]">Bonus Type</th>
                      {BUFF_STAT_TARGETS.map((t, colIdx) => (
                        <th
                          key={t.key}
                          className="py-1 px-0.5 text-center truncate"
                          title={`Col ${colIdx + 1}: ${t.label} ({${colIdx + 1}:row})`}
                        >
                          <div className="text-[8px] text-cyan-500/70 leading-none">{colIdx + 1}</div>
                          <div className="truncate">{t.shortLabel}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {BUFF_BONUS_TYPES.map((bonusType, rowIdx) => {
                      const rowData = safeBox[bonusType] || {};
                      return (
                        <tr key={bonusType} className="hover:bg-slate-900/60 transition-colors">
                          <td
                            className="py-1 px-2 font-medium text-[11px] whitespace-nowrap text-slate-200 truncate"
                            title={`Row ${rowIdx + 1}: ${bonusType}`}
                          >
                            <span className="text-[9px] text-slate-500 mr-1">{rowIdx + 1}.</span>
                            {bonusType}
                          </td>
                          {BUFF_STAT_TARGETS.map((t, colIdx) => {
                            const cellVal = rowData[t.key] || 0;
                            return (
                              <td key={t.key} className="p-0.5 text-center">
                                <input
                                  type="number"
                                  value={cellVal === 0 ? '' : cellVal}
                                  placeholder="0"
                                  title={`{${colIdx + 1}:${rowIdx + 1}} ${t.label} (${bonusType})`}
                                  onChange={(e) =>
                                    updateCellInMatrix(
                                      bonusType,
                                      t.key,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className={`w-full text-center py-0.5 px-0 text-[10px] font-mono rounded border tabular-nums focus:outline-none focus:border-cyan-400 ${
                                    cellVal > 0
                                      ? 'bg-emerald-950/80 border-emerald-500/50 font-bold text-emerald-300'
                                      : cellVal < 0
                                      ? 'bg-rose-950/80 border-rose-500/50 font-bold text-rose-300'
                                      : 'bg-slate-900/70 border-slate-800 text-slate-500'
                                  }`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
