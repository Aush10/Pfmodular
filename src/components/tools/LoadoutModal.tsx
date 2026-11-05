import React, { useState } from 'react';
import {
  X,
  Package,
  Download,
  Upload,
  Copy,
  Check,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Layers,
  Shield,
  Swords,
  Wand2,
  BookOpen,
  User,
  Calculator,
  RotateCcw,
  Plus,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { PF1Character, LoadoutSectionKey } from '../../types/character';

interface LoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onExportCSV: () => void;
  onPrint: () => void;
  theme: string;
}

interface SectionMeta {
  key: LoadoutSectionKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionMeta[] = [
  { key: 'abilities', label: 'Ability Scores', description: 'Base scores, race, ASI, mods & bonuses', icon: <Calculator className="w-4 h-4 text-amber-400" /> },
  { key: 'combatStats', label: 'Combat & Defenses', description: 'BAB, AC mods, Saves, Speeds, Initiative', icon: <Shield className="w-4 h-4 text-cyan-400" /> },
  { key: 'weapons', label: 'Weapons & Attacks', description: 'Equipped weapons, attack formulas, criticals', icon: <Swords className="w-4 h-4 text-rose-400" /> },
  { key: 'armor', label: 'Armor & Defensive Gear', description: 'Armor, shields, AC bonus, max dex, ACP', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
  { key: 'inventory', label: 'Inventory & Wealth', description: 'Possessions, gear quantities, weights & currency', icon: <Package className="w-4 h-4 text-amber-300" /> },
  { key: 'featsAndAbilities', label: 'Feats & Abilities', description: 'Class features, combat feats, special traits', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
  { key: 'skills', label: 'Skills Allocation', description: '35 PF1e skills, ranks, class skill flags, mods', icon: <BookOpen className="w-4 h-4 text-sky-400" /> },
  { key: 'magic', label: 'Spells & Magic Slots', description: 'Spells known, prepared slots, caster level & DCs', icon: <Wand2 className="w-4 h-4 text-indigo-400" /> },
  { key: 'formulasAndMacros', label: 'Formulas, Macros & Stepper', description: 'Custom DSL objects, XDX macros, turn stepper rules', icon: <Layers className="w-4 h-4 text-amber-500" /> },
  { key: 'buffBox', label: 'Buff Box Matrix', description: 'Typed bonuses (Enh, Morale, Luck, etc.)', icon: <Sparkles className="w-4 h-4 text-yellow-400" /> },
  { key: 'profileAndBio', label: 'Profile, Picture & Bio', description: 'Portrait, description, traits, custom titled fields', icon: <User className="w-4 h-4 text-teal-400" /> },
  { key: 'rollupNotes', label: 'Roll-Up Notes', description: 'Campaign scratchpad & session notes', icon: <BookOpen className="w-4 h-4 text-stone-400" /> },
  { key: 'customClasses', label: 'Custom Class Grids', description: 'Pasted class progression tables & kits', icon: <Layers className="w-4 h-4 text-cyan-300" /> },
];

export const LoadoutModal: React.FC<LoadoutModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  onExportCSV,
  onPrint,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'presets'>('export');

  // Export selection state
  const [selectedExportSections, setSelectedExportSections] = useState<Record<LoadoutSectionKey, boolean>>({
    abilities: true,
    combatStats: true,
    weapons: true,
    armor: true,
    inventory: true,
    featsAndAbilities: true,
    skills: true,
    magic: true,
    formulasAndMacros: true,
    buffBox: true,
    profileAndBio: true,
    rollupNotes: true,
    customClasses: true,
  });

  // Import state
  const [importJsonText, setImportJsonText] = useState('');
  const [parsedImportData, setParsedImportData] = useState<Record<string, unknown> | null>(null);
  const [detectedImportSections, setDetectedImportSections] = useState<LoadoutSectionKey[]>([]);
  const [selectedImportSections, setSelectedImportSections] = useState<Record<string, boolean>>({});
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // User custom presets stored in localStorage
  const [savedPresetName, setSavedPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Array<{ id: string; name: string; date: string; data: Record<string, unknown> }>>(() => {
    try {
      const saved = localStorage.getItem('pf1e_user_loadouts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const isBlueprint = theme === 'blueprint';
  const isParchment = theme === 'parchment';
  const isMythWeavers = theme === 'mythweavers';

  // Helper to extract a sectional slice from a character object
  const extractSectionSlice = (char: PF1Character, key: LoadoutSectionKey): unknown => {
    switch (key) {
      case 'abilities':
        return char.abilities;
      case 'combatStats':
        return {
          baseAttackBonus: char.baseAttackBonus,
          naturalArmorMod: char.naturalArmorMod,
          deflectionMod: char.deflectionMod,
          dodgeMod: char.dodgeMod,
          acMiscMod: char.acMiscMod,
          cmbMiscMod: char.cmbMiscMod,
          cmdMiscMod: char.cmdMiscMod,
          cmdAbilityChoice: char.cmdAbilityChoice,
          saves: char.saves,
          initMiscMod: char.initMiscMod,
          speedBase: char.speedBase,
          speedClimb: char.speedClimb,
          speedSwim: char.speedSwim,
          speedFly: char.speedFly,
          flyManeuverability: char.flyManeuverability,
        };
      case 'weapons':
        return char.weapons;
      case 'armor':
        return char.armor;
      case 'inventory':
        return { inventory: char.inventory, currency: char.currency, languages: char.languages };
      case 'featsAndAbilities':
        return char.featsAndAbilities;
      case 'skills':
        return { skills: char.skills, classSkillPointsPerLevel: char.classSkillPointsPerLevel, favoredClassSkillRanks: char.favoredClassSkillRanks };
      case 'magic':
        return {
          casterLevel: char.casterLevel,
          spellKeyAbility: char.spellKeyAbility,
          spellSlots: char.spellSlots,
          spells: char.spells,
        };
      case 'formulasAndMacros':
        return {
          customObjects: char.customObjects,
          xdxMacros: char.xdxMacros || [],
          stepperRules: char.stepperRules || [],
        };
      case 'buffBox':
        return {
          buffBox: char.buffBox,
          customBuffs: char.customBuffs || [],
        };
      case 'profileAndBio':
        return { biography: char.biography, profileData: char.profileData };
      case 'rollupNotes':
        return char.rollupNotes;
      case 'customClasses':
        return {
          customClassGrids: char.customClassGrids,
          careerData: char.careerData,
        };
      default:
        return null;
    }
  };

  // Build the export payload according to selected sections
  const buildExportPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      _format: 'PF1e-Modular-Loadout-v1',
      characterName: character.name,
      exportDate: new Date().toISOString(),
      sections: {},
    };

    const sectionsObj: Record<string, unknown> = {};
    SECTIONS.forEach((s) => {
      if (selectedExportSections[s.key]) {
        sectionsObj[s.key] = extractSectionSlice(character, s.key);
      }
    });

    payload.sections = sectionsObj;
    return payload;
  };

  const exportJsonString = JSON.stringify(buildExportPayload(), null, 2);

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const activeSecNames = SECTIONS.filter((s) => selectedExportSections[s.key]).map((s) => s.key).join('_');
    a.download = `${character.name.toLowerCase().replace(/\s+/g, '_')}_loadout_${activeSecNames.substring(0, 25) || 'all'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAsPreset = () => {
    if (!savedPresetName.trim()) return;
    const newPreset = {
      id: `preset-${Date.now()}`,
      name: savedPresetName.trim(),
      date: new Date().toLocaleDateString(),
      data: buildExportPayload(),
    };
    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem('pf1e_user_loadouts', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSavedPresetName('');
  };

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    try {
      localStorage.setItem('pf1e_user_loadouts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Parse import text
  const handleParseImportJson = (text: string) => {
    setImportJsonText(text);
    setImportStatusMessage(null);
    try {
      const parsed = JSON.parse(text);
      setParsedImportData(parsed);

      // Check if it's a modular loadout (has .sections) or a direct full PF1Character export
      const detected: LoadoutSectionKey[] = [];
      const sectionsMap = (parsed.sections as Record<string, unknown>) || parsed;

      SECTIONS.forEach((s) => {
        if (s.key === 'combatStats' && (sectionsMap.combatStats || sectionsMap.baseAttackBonus !== undefined)) {
          detected.push(s.key);
        } else if (s.key === 'inventory' && (sectionsMap.inventory || sectionsMap.currency)) {
          detected.push(s.key);
        } else if (s.key === 'skills' && (sectionsMap.skills || Array.isArray(sectionsMap.skills))) {
          detected.push(s.key);
        } else if (s.key === 'magic' && (sectionsMap.magic || sectionsMap.spellSlots || sectionsMap.spells)) {
          detected.push(s.key);
        } else if (s.key === 'formulasAndMacros' && (sectionsMap.formulasAndMacros || sectionsMap.customObjects || sectionsMap.xdxMacros)) {
          detected.push(s.key);
        } else if (s.key === 'profileAndBio' && (sectionsMap.profileAndBio || sectionsMap.biography || sectionsMap.profileData)) {
          detected.push(s.key);
        } else if (s.key === 'rollupNotes' && (sectionsMap.rollupNotes !== undefined)) {
          detected.push(s.key);
        } else if (s.key === 'customClasses' && (sectionsMap.customClasses || sectionsMap.customClassGrids)) {
          detected.push(s.key);
        } else if (sectionsMap[s.key] !== undefined) {
          detected.push(s.key);
        }
      });

      setDetectedImportSections(detected);
      const initialSelected: Record<string, boolean> = {};
      detected.forEach((k) => {
        initialSelected[k] = true;
      });
      setSelectedImportSections(initialSelected);
    } catch (e: unknown) {
      setParsedImportData(null);
      setDetectedImportSections([]);
      setSelectedImportSections({});
      if (text.trim()) {
        setImportStatusMessage('Invalid JSON format. Please paste valid character or loadout JSON.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      handleParseImportJson(content);
    };
    reader.readAsText(file);
  };

  // Apply selected imported sections to character
  const handleApplyImport = () => {
    if (!parsedImportData) return;

    const sectionsMap = (parsedImportData.sections as Record<string, any>) || parsedImportData;
    let appliedCount = 0;

    onUpdateCharacter((prev) => {
      let updated = { ...prev };

      if (selectedImportSections.abilities && sectionsMap.abilities) {
        updated.abilities = { ...prev.abilities, ...sectionsMap.abilities };
        appliedCount++;
      }

      if (selectedImportSections.combatStats) {
        const cs = sectionsMap.combatStats || sectionsMap;
        if (cs.baseAttackBonus !== undefined) updated.baseAttackBonus = cs.baseAttackBonus;
        if (cs.naturalArmorMod !== undefined) updated.naturalArmorMod = cs.naturalArmorMod;
        if (cs.deflectionMod !== undefined) updated.deflectionMod = cs.deflectionMod;
        if (cs.dodgeMod !== undefined) updated.dodgeMod = cs.dodgeMod;
        if (cs.acMiscMod !== undefined) updated.acMiscMod = cs.acMiscMod;
        if (cs.cmbMiscMod !== undefined) updated.cmbMiscMod = cs.cmbMiscMod;
        if (cs.cmdMiscMod !== undefined) updated.cmdMiscMod = cs.cmdMiscMod;
        if (cs.cmdAbilityChoice !== undefined) updated.cmdAbilityChoice = cs.cmdAbilityChoice;
        if (cs.saves) updated.saves = { ...prev.saves, ...cs.saves };
        if (cs.initMiscMod !== undefined) updated.initMiscMod = cs.initMiscMod;
        if (cs.speedBase !== undefined) updated.speedBase = cs.speedBase;
        appliedCount++;
      }

      if (selectedImportSections.weapons) {
        const wp = sectionsMap.weapons;
        if (Array.isArray(wp)) {
          updated.weapons = wp;
          appliedCount++;
        }
      }

      if (selectedImportSections.armor) {
        const ar = sectionsMap.armor;
        if (Array.isArray(ar)) {
          updated.armor = ar;
          appliedCount++;
        }
      }

      if (selectedImportSections.inventory) {
        const invData = sectionsMap.inventory;
        if (invData && Array.isArray(invData.inventory)) {
          updated.inventory = invData.inventory;
          if (invData.currency) updated.currency = invData.currency;
          if (invData.languages) updated.languages = invData.languages;
        } else if (Array.isArray(sectionsMap.inventory)) {
          updated.inventory = sectionsMap.inventory;
        }
        if (sectionsMap.currency) updated.currency = sectionsMap.currency;
        appliedCount++;
      }

      if (selectedImportSections.featsAndAbilities) {
        const feats = sectionsMap.featsAndAbilities;
        if (Array.isArray(feats)) {
          updated.featsAndAbilities = feats;
          appliedCount++;
        }
      }

      if (selectedImportSections.skills) {
        const skData = sectionsMap.skills;
        if (skData && Array.isArray(skData.skills)) {
          updated.skills = skData.skills;
          if (skData.classSkillPointsPerLevel !== undefined) updated.classSkillPointsPerLevel = skData.classSkillPointsPerLevel;
        } else if (Array.isArray(sectionsMap.skills)) {
          updated.skills = sectionsMap.skills;
        }
        appliedCount++;
      }

      if (selectedImportSections.magic) {
        const mgData = sectionsMap.magic || sectionsMap;
        if (mgData.spells && Array.isArray(mgData.spells)) updated.spells = mgData.spells;
        if (mgData.spellSlots && Array.isArray(mgData.spellSlots)) updated.spellSlots = mgData.spellSlots;
        if (mgData.casterLevel !== undefined) updated.casterLevel = mgData.casterLevel;
        if (mgData.spellKeyAbility) updated.spellKeyAbility = mgData.spellKeyAbility;
        appliedCount++;
      }

      if (selectedImportSections.formulasAndMacros) {
        const fmData = sectionsMap.formulasAndMacros || sectionsMap;
        if (fmData.customObjects && Array.isArray(fmData.customObjects)) updated.customObjects = fmData.customObjects;
        if (fmData.xdxMacros && Array.isArray(fmData.xdxMacros)) updated.xdxMacros = fmData.xdxMacros;
        if (fmData.stepperRules && Array.isArray(fmData.stepperRules)) updated.stepperRules = fmData.stepperRules;
        appliedCount++;
      }

      if (selectedImportSections.buffBox && sectionsMap.buffBox) {
        const bbData = sectionsMap.buffBox;
        if (bbData.buffBox) {
          updated.buffBox = bbData.buffBox;
          if (bbData.customBuffs) updated.customBuffs = bbData.customBuffs;
        } else {
          updated.buffBox = bbData;
        }
        if (sectionsMap.customBuffs) {
          updated.customBuffs = sectionsMap.customBuffs;
        }
        appliedCount++;
      }

      if (selectedImportSections.profileAndBio) {
        const pData = sectionsMap.profileAndBio || sectionsMap;
        if (pData.biography) updated.biography = pData.biography;
        if (pData.profileData) updated.profileData = pData.profileData;
        appliedCount++;
      }

      if (selectedImportSections.rollupNotes) {
        const rNotes = sectionsMap.rollupNotes;
        if (rNotes) {
          updated.rollupNotes = typeof rNotes === 'string' ? { content: rNotes, isRolledUp: false } : rNotes;
          appliedCount++;
        }
      }

      if (selectedImportSections.customClasses) {
        const cc = sectionsMap.customClasses || sectionsMap.customClassGrids;
        if (cc) {
          if (cc.customClassGrids) {
            updated.customClassGrids = cc.customClassGrids;
            if (cc.careerData) updated.careerData = cc.careerData;
          } else {
            updated.customClassGrids = cc;
          }
          if (sectionsMap.careerData) {
            updated.careerData = sectionsMap.careerData;
          }
          appliedCount++;
        }
      }

      return updated;
    });

    setImportStatusMessage(`Successfully merged ${appliedCount} section(s) into your character!`);
  };

  // Built-in starter loadouts
  const BUILTIN_LOADOUTS: Array<{ name: string; tag: string; desc: string; apply: () => void }> = [
    {
      name: 'Knight Cavalier Arms & Armor',
      tag: 'Gear Set',
      desc: 'Masterwork Lance, Longsword, Heavy Steel Shield, Full Plate (+9 AC), Heavy Warhorse gear.',
      apply: () => {
        onUpdateCharacter((prev) => ({
          ...prev,
          weapons: [
            { id: 'w-lance', name: 'Masterwork Lance', category: 'Melee', damageFormula: '1d8+str_mod', critical: 'x3', range: 'Reach 10ft', damageType: 'Piercing', weight: 10, isEquipped: true, specialProperties: 'Double damage from back of charging mount' },
            { id: 'w-sword', name: '+1 Longsword', category: 'Melee', damageFormula: '1d8+str_mod+1', critical: '19-20/x2', range: 'Melee', damageType: 'Slashing', weight: 4, isEquipped: true },
            { id: 'w-cb', name: 'Heavy Crossbow', category: 'Ranged', damageFormula: '1d10', critical: '19-20/x2', range: '120 ft', damageType: 'Piercing', weight: 8, isEquipped: false },
          ],
          armor: [
            { id: 'a-fp', name: '+1 Full Plate', type: 'Heavy', acBonus: 10, maxDex: 1, checkPenalty: -5, spellFailure: 35, speed30: 20, weight: 50, isEquipped: true },
            { id: 'a-sh', name: 'Heavy Steel Shield', type: 'Shield', acBonus: 2, maxDex: 99, checkPenalty: -2, spellFailure: 15, speed30: 30, weight: 15, isEquipped: true },
          ],
        }));
        setImportStatusMessage('Loaded Knight Cavalier Arms & Armor gear set!');
      },
    },
    {
      name: 'Arcane Evoker DSL Macros & Spells',
      tag: 'Macros & Spells',
      desc: 'Fireball, Lightning Bolt, Scorching Ray, Shield, plus scaled formulas like firebreath and empowered_ray.',
      apply: () => {
        onUpdateCharacter((prev) => ({
          ...prev,
          customObjects: [
            ...prev.customObjects,
            { id: 'dsl-fb', name: 'fireball_damage', description: 'Fireball damage capped at 10d6', formula: 'min(caster_level, 10) + "d6 fire"', category: 'Damage' },
            { id: 'dsl-ray', name: 'scorching_ray', description: 'Scorching ray damage rays', formula: 'min(floor((caster_level + 3) / 4), 3) + " rays (4d6 fire each)"', category: 'Attack' },
          ],
        }));
        setImportStatusMessage('Loaded Arcane Evoker DSL Macros!');
      },
    },
    {
      name: 'Standard Pathfinder Adventuring Kit',
      tag: 'Inventory',
      desc: 'Backpack, Bedroll, Flint & Steel, 10 Torches, 50ft Silk Rope, Waterskin, 5 days Trail Rations, 100 GP.',
      apply: () => {
        onUpdateCharacter((prev) => ({
          ...prev,
          inventory: [
            ...prev.inventory,
            { id: `kit-${Date.now()}-1`, name: "Adventurer's Backpack", quantity: 1, weight: 2, location: 'Back' },
            { id: `kit-${Date.now()}-2`, name: 'Bedroll', quantity: 1, weight: 5, location: 'Backpack' },
            { id: `kit-${Date.now()}-3`, name: 'Flint and Steel', quantity: 1, weight: 0, location: 'Pouch' },
            { id: `kit-${Date.now()}-4`, name: 'Torches', quantity: 10, weight: 10, location: 'Backpack' },
            { id: `kit-${Date.now()}-5`, name: 'Silk Rope (50 ft)', quantity: 1, weight: 5, location: 'Backpack' },
            { id: `kit-${Date.now()}-6`, name: 'Trail Rations', quantity: 5, weight: 5, location: 'Backpack' },
            { id: `kit-${Date.now()}-7`, name: 'Waterskin', quantity: 1, weight: 4, location: 'Belt' },
          ],
          currency: {
            ...prev.currency,
            gp: prev.currency.gp + 100,
          },
        }));
        setImportStatusMessage('Added Standard Adventuring Kit to inventory and +100 GP!');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-slate-900 border border-cyan-500/40 text-slate-100 shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950/90 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-cyan-200">Loadout & Sectional JSON Tool</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono">
                  Frankenstein Kits
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Save, load, and frankenstein discrete parts of your character (gear sets, macros, abilities) without overwriting the rest.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Fast Utilities */}
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>1. Sectional Export</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>2. Sectional Import / Merge</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>3. Loadout Presets</span>
            </button>
          </div>

          {/* Quick print & CSV export buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExportCSV}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-mono flex items-center gap-1 transition-colors"
              title="Download character spreadsheet index CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Index</span>
            </button>
            <button
              onClick={onPrint}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-xs font-mono flex items-center gap-1 transition-colors"
              title="Print table sheet or save to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {importStatusMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
              <span>{importStatusMessage}</span>
              <button
                onClick={() => setImportStatusMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: SECTIONAL EXPORT */}
          {activeTab === 'export' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Section Selector */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-cyan-300">
                    Select Sections to Save
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const allOn: Record<LoadoutSectionKey, boolean> = {} as any;
                        SECTIONS.forEach((s) => (allOn[s.key] = true));
                        setSelectedExportSections(allOn);
                      }}
                      className="text-[10px] text-cyan-400 hover:underline font-mono"
                    >
                      All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={() => {
                        const noneOn: Record<LoadoutSectionKey, boolean> = {} as any;
                        SECTIONS.forEach((s) => (noneOn[s.key] = false));
                        setSelectedExportSections(noneOn);
                      }}
                      className="text-[10px] text-slate-400 hover:underline font-mono"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {SECTIONS.map((s) => {
                    const isChecked = selectedExportSections[s.key];
                    return (
                      <label
                        key={s.key}
                        className={`p-2 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-slate-950/80 border-cyan-500/50 text-slate-100'
                            : 'bg-slate-950/30 border-slate-800/80 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedExportSections((prev) => ({
                              ...prev,
                              [s.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                            {s.icon}
                            <span>{s.label}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{s.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Save Preset Section */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    Save as In-App Preset Slot:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={savedPresetName}
                      onChange={(e) => setSavedPresetName(e.target.value)}
                      placeholder="e.g. Heavy Armor Melee Kit"
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-400"
                    />
                    <button
                      onClick={handleSaveAsPreset}
                      disabled={!savedPresetName.trim()}
                      className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: JSON Preview & Export Actions */}
              <div className="md:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-cyan-300">
                    JSON Payload Preview
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {Object.values(selectedExportSections).filter(Boolean).length} sections selected
                  </span>
                </div>

                <div className="relative flex-1 min-h-[280px]">
                  <textarea
                    readOnly
                    value={exportJsonString}
                    className="w-full h-full p-2.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-300/90 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={handleCopyExport}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadExport}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .JSON File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECTIONAL IMPORT & MERGE */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-300">
                    Paste Section or Full Character JSON:
                  </div>
                  <label className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .JSON File</span>
                    <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => handleParseImportJson(e.target.value)}
                  placeholder={`Paste full character JSON or a sectional fragment here...\nExample:\n{\n  "weapons": [ ... ],\n  "customObjects": [ ... ]\n}`}
                  rows={6}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-200 font-mono text-xs focus:border-cyan-400 resize-y"
                />
              </div>

              {detectedImportSections.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {detectedImportSections.length} Section(s) Detected in JSON
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Select which sections you want to merge into your current character. Other stats will remain untouched!
                      </p>
                    </div>
                    <button
                      onClick={handleApplyImport}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Merge Selected Sections</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {detectedImportSections.map((secKey) => {
                      const meta = SECTIONS.find((s) => s.key === secKey);
                      const isSelected = !!selectedImportSections[secKey];
                      return (
                        <label
                          key={secKey}
                          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-900 border-emerald-500/50 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelectedImportSections((prev) => ({
                                ...prev,
                                [secKey]: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200 truncate">{meta?.label || secKey}</div>
                            <div className="text-[10px] text-slate-400 truncate">{meta?.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESETS LIBRARY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Built-in loadouts */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase font-bold text-cyan-300">
                  Curated Equipment & Macro Packs
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {BUILTIN_LOADOUTS.map((p) => (
                    <div
                      key={p.name}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-200">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                            {p.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{p.desc}</p>
                      </div>
                      <button
                        onClick={p.apply}
                        className="w-full py-1.5 rounded bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Apply Pack</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* User saved presets */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs font-mono uppercase font-bold text-amber-300">
                  Your Custom Saved Presets ({savedPresets.length})
                </span>
                {savedPresets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                    No custom presets saved yet. Use the "Sectional Export" tab to save named presets like "Heavy Melee Kit" or "Buff Set".
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {savedPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-200 truncate">{preset.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">Saved: {preset.date}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              handleParseImportJson(JSON.stringify(preset.data));
                              setActiveTab('import');
                            }}
                            className="px-2.5 py-1 rounded bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 text-cyan-200 text-xs font-mono transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Active Character: {character.name} (Level {character.level})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
