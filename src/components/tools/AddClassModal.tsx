import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Swords,
  Heart,
  BookOpen,
  Package,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  Split,
  Settings,
  Flame,
  Zap,
  Wand2,
} from 'lucide-react';
import {
  PF1Character,
  CustomClassGrid,
  ClassGridRow,
  InventoryItem,
  CareerProgressionData,
  CareerLevelEntry,
  ArchetypeConfig,
} from '../../types/character';
import {
  calculateCareerProgression,
  VMC_SCHEDULES,
  CalculatedCareerResult,
} from '../../engine/multiclassCalculator';
import { listUnlinkedClassGrids, resolveClassGrids } from '../../engine/companionSheet';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  theme: string;
}

// Built-in starter kit equipment profiles
const CLASS_STARTER_KITS: Record<string, Array<{ name: string; qty: number; weight: number; loc: string }>> = {
  Cavalier: [
    { name: "Cavalier's Pack (Backpack, Bedroll, Flint & Steel)", qty: 1, weight: 8, loc: 'Mount' },
    { name: 'Masterwork Lance', qty: 1, weight: 10, loc: 'Equipped' },
    { name: 'Longsword', qty: 1, weight: 4, loc: 'Belt' },
    { name: 'Heavy Steel Shield', qty: 1, weight: 15, loc: 'Equipped' },
    { name: 'Scale Mail', qty: 1, weight: 30, loc: 'Equipped' },
    { name: 'Bit and Bridle', qty: 1, weight: 1, loc: 'Mount' },
    { name: 'Military Saddle & Saddlebags', qty: 1, weight: 38, loc: 'Mount' },
    { name: 'Feed (5 days)', qty: 5, weight: 50, loc: 'Saddlebags' },
  ],
  Fighter: [
    { name: "Fighter's Kit (Backpack, Bedroll, Flint & Steel, Torches)", qty: 1, weight: 12, loc: 'Backpack' },
    { name: 'Greatsword', qty: 1, weight: 8, loc: 'Equipped' },
    { name: 'Shortbow & 20 Arrows', qty: 1, weight: 5, loc: 'Back' },
    { name: 'Scale Mail', qty: 1, weight: 30, loc: 'Equipped' },
    { name: 'Dagger', qty: 1, weight: 1, loc: 'Belt' },
  ],
  Rogue: [
    { name: "Thief's Kit (Thieves' Tools, Chalk, Grappling Hook, Silk Rope)", qty: 1, weight: 10, loc: 'Backpack' },
    { name: 'Rapier', qty: 1, weight: 2, loc: 'Equipped' },
    { name: 'Shortbow & 20 Arrows', qty: 1, weight: 5, loc: 'Back' },
    { name: 'Leather Armor', qty: 1, weight: 15, loc: 'Equipped' },
    { name: 'Dagger', qty: 2, weight: 2, loc: 'Belt' },
  ],
  Wizard: [
    { name: "Scholar's Kit (Spellbook, Ink & Quill, Parchment, Component Pouch)", qty: 1, weight: 8, loc: 'Satchel' },
    { name: 'Quarterstaff', qty: 1, weight: 4, loc: 'Hands' },
    { name: 'Light Crossbow & 10 Bolts', qty: 1, weight: 5, loc: 'Satchel' },
    { name: 'Dagger', qty: 1, weight: 1, loc: 'Belt' },
  ],
};

const CAVALIER_SAMPLE_RAW = `1\t+1\t+2\t+0\t+0\tChallenge 1/day, mount, order, tactician
5\t+5\t+4\t+1\t+1\tBanner
10\t+10/+5\t+7\t+3\t+3\tChallenge 4/day
15\t+15/+10/+5\t+9\t+5\t+5\tOrder ability
20\t+20/+15/+10/+5\t+12\t+6\t+6\tLast stand, supreme charge`;

const WIZARD_SAMPLE_RAW = `1\t+0\t+0\t+0\t+2\tArcane bond, arcane school, cantrips, Scribe Scroll
5\t+2\t+1\t+1\t+4\tBonus feat
10\t+5\t+3\t+3\t+7\tBonus feat
15\t+7/+2\t+5\t+5\t+9\tBonus feat
20\t+10/+5\t+6\t+6\t+12\tBonus feat`;

// Robust line-by-line parser for PF1e progression grids
export function parseClassProgressionGrid(raw: string): ClassGridRow[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ClassGridRow[] = [];

  for (const line of lines) {
    if (/^(level|lvl|bab|base attack|hd)/i.test(line)) continue;

    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim()).filter((p) => p !== '');
    } else if (line.includes('|')) {
      parts = line.split('|').map((p) => p.trim()).filter((p) => p !== '');
    } else {
      const matched = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$/);
      if (matched) {
        parts = [matched[1], matched[2], matched[3], matched[4], matched[5], matched[6]];
      } else {
        parts = line.split(/\s+/);
      }
    }

    if (parts.length >= 5) {
      const levelMatch = parts[0].match(/\d+/);
      if (!levelMatch) continue;
      const level = parseInt(levelMatch[0], 10);

      const babStr = parts[1];
      const primaryBabMatch = babStr.match(/[+-]?\d+/);
      const bab = primaryBabMatch ? Math.abs(parseInt(primaryBabMatch[0], 10)) : level;

      const parseSave = (s: string) => {
        const m = s.match(/[+-]?\d+/);
        return m ? parseInt(m[0], 10) : 0;
      };

      const fort = parseSave(parts[2]);
      const ref = parseSave(parts[3]);
      const will = parseSave(parts[4]);
      const special = parts.slice(5).join(' ').trim() || '—';

      rows.push({
        level,
        bab,
        babString: babStr,
        fort,
        ref,
        will,
        special,
      });
    }
  }

  return rows.sort((a, b) => a.level - b.level);
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  theme,
}) => {
  const [modalTab, setModalTab] = useState<'grids' | 'career' | 'variants'>('career');

  // Live classes are the editor source. Saved grids that do not match a class stay stored and unlinked.
  const classGrids = resolveClassGrids(character);
  const unlinkedGrids = listUnlinkedClassGrids(character);
  const gridIds = Object.keys(classGrids);

  const [activeClassId, setActiveClassId] = useState<string>(gridIds[0] || 'class1');
  const resolvedActiveClassId = classGrids[activeClassId] ? activeClassId : gridIds[0] || 'class1';
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Career progression state
  const primaryGridId = gridIds[0] || 'class1';
  const secondaryGridId = gridIds[1] || primaryGridId;
  const careerData: CareerProgressionData = character.careerData || {
    mode: 'standard',
    useFractionalBab: false,
    useFractionalSaves: false,
    levels: Array.from({ length: Math.max(1, character.level) }, (_, idx) => {
      const lvl = idx + 1;
      return {
        level: lvl,
        primaryClassId: primaryGridId,
        primaryClassLevel: lvl,
        isGestalt: false,
        gestaltClassId: secondaryGridId,
        gestaltClassLevel: lvl,
        favoredClassBonus: 'hp',
      };
    }),
    archetypes: [],
    variantMulticlassing: {
      enabled: false,
      secondaryClass: 'Wizard',
    },
    thirdPartySupport: {
      pathOfWarEnabled: false,
      spheresEnabled: false,
    },
  };

  // Live Career Calculations
  const careerResult: CalculatedCareerResult = useMemo(() => {
    const careerCharacter = {
      ...character,
      customClassGrids: {
        ...(character.customClassGrids || {}),
        ...resolveClassGrids(character),
      },
    };
    return calculateCareerProgression(careerCharacter, careerData);
  }, [character, careerData]);

  if (!isOpen) return null;

  const currentClass: CustomClassGrid = classGrids[resolvedActiveClassId] || {
    id: resolvedActiveClassId,
    className: 'New Class',
    level: 1,
    hitDie: 10,
    skillPointsPerLevel: 2,
    proficiencies: 'Simple and martial weapons, all armor.',
    rawText: '',
    rows: [],
  };

  const updateCurrentClass = (updates: Partial<CustomClassGrid>) => {
    onUpdateCharacter((prev) => {
      const resolved = resolveClassGrids(prev);
      const activeId = resolved[resolvedActiveClassId] ? resolvedActiveClassId : Object.keys(resolved)[0];
      const current = resolved[activeId] || currentClass;
      const nextGrid = { ...current, ...updates, id: activeId };
      const classes = (prev.classes?.length ? prev.classes : []).map((entry) =>
        entry.id === activeId || entry.name.toLowerCase() === current.className.toLowerCase()
          ? {
              ...entry,
              name: nextGrid.className,
              level: nextGrid.level,
              hitDie: nextGrid.hitDie,
              skillPointsPerLevel: nextGrid.skillPointsPerLevel,
            }
          : entry
      );
      const nextClasses = classes.length ? classes : prev.classes;
      const total = nextClasses.reduce((sum, entry) => sum + (entry.level || 0), 0) || prev.level;
      return {
        ...prev,
        classes: nextClasses,
        level: total,
        characterClass: nextClasses.map((entry) => `${entry.name} ${entry.level}`).join(' / '),
        hpBreakdown: {
          ...prev.hpBreakdown,
          hitDiceCount: total,
          hitDiceSize: nextClasses.length === 1 ? nextGrid.hitDie : prev.hpBreakdown.hitDiceSize,
        },
        customClassGrids: {
          ...(prev.customClassGrids || {}),
          [activeId]: nextGrid,
        },
      };
    });
  };

  const updateCareerData = (updates: Partial<CareerProgressionData>) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      careerData: {
        ...(prev.careerData || careerData),
        ...updates,
      },
    }));
  };

  const handleRawTextChange = (text: string) => {
    const parsedRows = parseClassProgressionGrid(text);
    updateCurrentClass({ rawText: text, rows: parsedRows });
  };

  const handleAddNewClass = () => {
    const nextNum = Object.keys(classGrids).length + 1;
    const newId = `class${nextNum}`;
    const newGrid: CustomClassGrid = {
      id: newId,
      className: `Class ${nextNum}`,
      level: 1,
      hitDie: 8,
      skillPointsPerLevel: 4,
      proficiencies: 'Simple weapons, light armor.',
      rawText: '',
      rows: [],
    };
    onUpdateCharacter((prev) => {
      const classes = [
        ...(prev.classes || []),
        {
          id: newId,
          name: newGrid.className,
          level: newGrid.level,
          hitDie: newGrid.hitDie,
          skillPointsPerLevel: newGrid.skillPointsPerLevel,
          babProgression: 'full' as const,
          isFavoredClass: false,
        },
      ];
      return {
        ...prev,
        classes,
        level: classes.reduce((sum, entry) => sum + (entry.level || 0), 0),
        characterClass: classes.map((entry) => `${entry.name} ${entry.level}`).join(' / '),
        customClassGrids: {
          ...(prev.customClassGrids || {}),
          [newId]: newGrid,
        },
      };
    });
    setActiveClassId(newId);
  };

  // Add a character level entry
  const handleAddCareerLevel = () => {
    const newLvl = careerData.levels.length + 1;
    const newEntry: CareerLevelEntry = {
      level: newLvl,
      primaryClassId: resolvedActiveClassId,
      primaryClassLevel: newLvl,
      isGestalt: careerData.mode === 'gestalt',
      gestaltClassId: 'class2',
      gestaltClassLevel: newLvl,
      favoredClassBonus: 'hp',
    };
    updateCareerData({ levels: [...careerData.levels, newEntry] });
  };

  // Remove the last level entry
  const handleRemoveCareerLevel = () => {
    if (careerData.levels.length <= 1) return;
    updateCareerData({ levels: careerData.levels.slice(0, -1) });
  };

  // Modify a specific level in the timeline
  const handleUpdateCareerLevel = (lvlNum: number, updates: Partial<CareerLevelEntry>) => {
    const updated = careerData.levels.map((entry) => (entry.level === lvlNum ? { ...entry, ...updates } : entry));
    updateCareerData({ levels: updated });
  };

  // Sync Career Calculations directly into character sheet stats
  const handleSyncCareerToSheet = () => {
    onUpdateCharacter((prev) => {
      // Merge unique new abilities
      const combinedAbilities = [...prev.featsAndAbilities];
      careerResult.allFeatures.forEach((feat) => {
        if (!combinedAbilities.some((existing) => existing.toLowerCase() === feat.toLowerCase())) {
          combinedAbilities.push(feat);
        }
      });

      return {
        ...prev,
        level: careerResult.totalLevel,
        characterClass: careerResult.classSummaryTitle,
        baseAttackBonus: careerResult.totalBab,
        saves: {
          ...prev.saves,
          fortitude: { ...prev.saves.fortitude, base: careerResult.fortBase },
          reflex: { ...prev.saves.reflex, base: careerResult.refBase },
          will: { ...prev.saves.will, base: careerResult.willBase },
        },
        hpTotalMax: careerResult.totalHp,
        hitDice: careerResult.hitDiceString,
        hpBreakdown: {
          hitDiceCount: careerResult.totalLevel,
          hitDiceSize: prev.hpBreakdown?.hitDiceSize || 10,
          hitDiceRolledBase: careerResult.totalHp,
          additionalBonuses: prev.hpBreakdown?.additionalBonuses || [],
          calcMethod: prev.hpBreakdown?.calcMethod || 'average',
        },
        favoredClassSkillRanks: careerResult.levelBreakdown.filter((l) => l.hitDie > 0).length,
        featsAndAbilities: combinedAbilities,
        careerData: careerData,
      };
    });

    setSuccessMessage(
      `Synced Career to Sheet! Total Level: ${careerResult.totalLevel} (${careerResult.classSummaryTitle}), BAB: ${careerResult.babString}, Saves: Fort +${careerResult.fortBase}/Ref +${careerResult.refBase}/Will +${careerResult.willBase}, HP: ${careerResult.totalHp} (${careerResult.hitDiceString}).`
    );
  };

  // Add Kit: Apply class stat block, proficiencies, multi-HD expansion, INT into skills, and class skills unlock
  const handleAddKit = () => {
    onUpdateCharacter((prev) => {
      // 1. Proficiencies -> Feats and Abilities
      const updatedFeats = [...prev.featsAndAbilities];
      if (currentClass.proficiencies && currentClass.proficiencies.trim()) {
        const profTitle = `[${currentClass.className} Proficiencies] ${currentClass.proficiencies.trim()}`;
        if (!updatedFeats.some((f) => f.toLowerCase().includes(currentClass.className.toLowerCase() + ' proficiencies'))) {
          updatedFeats.push(profTitle);
        }
      }

      // 2. Class Skills -> Mark isClassSkill = true for all matching skills
      const rawSkills = currentClass.classSkillsText || '';
      const skillTokens = rawSkills
        .split(/[,\n;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      let newlyUnlockedCount = 0;
      const updatedSkills = prev.skills.map((sk) => {
        const sName = sk.name.toLowerCase();
        const matches = skillTokens.some((tok) => {
          if (tok.length <= 2) return sName === tok;
          return sName === tok || sName.startsWith(tok) || sName.includes(tok) || tok.includes(sName);
        });
        if (matches) {
          if (!sk.isClassSkill) newlyUnlockedCount++;
          return { ...sk, isClassSkill: true };
        }
        return sk;
      });

      // 3. Multi-class Hit Dice / HP expansion
      // e.g. 2d10 for 2nd level Fighter becomes 2d10 + 1d6 for 2nd level Fighter / 1st level Wizard
      const existingClasses =
        prev.classes && prev.classes.length > 0
          ? [...prev.classes]
          : [
              {
                id: 'class1',
                name: prev.characterClass || 'Fighter',
                level: prev.level || 1,
                hitDie: prev.hpBreakdown?.hitDiceSize || 10,
                skillPointsPerLevel: prev.classSkillPointsPerLevel || 2,
                babProgression: 'full' as const,
                isFavoredClass: true,
              },
            ];

      const classIdx = existingClasses.findIndex(
        (c) => c.id === currentClass.id || c.name.toLowerCase() === currentClass.className.toLowerCase()
      );
      const classLvl = currentClass.level || 1;
      const classHd = currentClass.hitDie || 10;
      const classSp = currentClass.skillPointsPerLevel || 2;

      if (classIdx >= 0) {
        existingClasses[classIdx] = {
          ...existingClasses[classIdx],
          name: currentClass.className,
          level: classLvl,
          hitDie: classHd,
          skillPointsPerLevel: classSp,
        };
      } else {
        existingClasses.push({
          id: currentClass.id,
          name: currentClass.className,
          level: classLvl,
          hitDie: classHd,
          skillPointsPerLevel: classSp,
          babProgression: 'full',
          isFavoredClass: false,
        });
      }

      // Build expanded Hit Dice string (e.g. "2d10 + 1d6")
      const expandedHitDiceString = existingClasses.map((c) => `${c.level}d${c.hitDie}`).join(' + ');
      const totalCombinedLevel = existingClasses.reduce((sum, c) => sum + (c.level || 1), 0);

      // Expand HP base: first level overall gets max HD, subsequent levels get average (HD/2)+1
      let baseMultiHp = 0;
      let isFirstOverall = true;
      existingClasses.forEach((c) => {
        for (let l = 1; l <= c.level; l++) {
          if (isFirstOverall) {
            baseMultiHp += c.hitDie;
            isFirstOverall = false;
          } else {
            baseMultiHp += Math.floor(c.hitDie / 2) + 1;
          }
        }
      });

      // CON modifier for HP bonus
      const conScore =
        (prev.abilities.CON.base || 10) +
        (prev.abilities.CON.raceMod || 0) +
        (prev.abilities.CON.levelAsiMod || 0) +
        (prev.abilities.CON.miscMod || 0) +
        (prev.abilities.CON.enhMod || 0) +
        (prev.abilities.CON.tempMod || 0);
      const conMod = Math.floor((conScore - 10) / 2);
      const conHp = conMod * totalCombinedLevel;
      const additionalHpSum = (prev.hpBreakdown?.additionalBonuses || []).reduce(
        (acc, b) => acc + (b.amount || 0),
        0
      );
      const newTotalMaxHp = Math.max(1, baseMultiHp + conHp + additionalHpSum);

      // 4. Update customClassGrids
      const updatedGrids = {
        ...(prev.customClassGrids || {}),
        [currentClass.id]: currentClass,
      };

      const classSummaryTitle = existingClasses.map((c) => `${c.name} ${c.level}`).join(' / ');

      return {
        ...prev,
        characterClass: classSummaryTitle,
        level: totalCombinedLevel,
        classes: existingClasses,
        hitDice: expandedHitDiceString,
        hpTotalMax: newTotalMaxHp,
        hpCurrent: Math.min(newTotalMaxHp, prev.hpCurrent + Math.max(0, newTotalMaxHp - prev.hpTotalMax)),
        hpBreakdown: {
          hitDiceCount: totalCombinedLevel,
          hitDiceSize: existingClasses[0]?.hitDie || 10,
          hitDiceRolledBase: baseMultiHp,
          additionalBonuses: prev.hpBreakdown?.additionalBonuses || [],
          calcMethod: prev.hpBreakdown?.calcMethod || 'average',
        },
        featsAndAbilities: updatedFeats,
        skills: updatedSkills,
        customClassGrids: updatedGrids,
      };
    });

    setSuccessMessage(
      `Added Kit for ${currentClass.className}! Proficiencies registered to Feats/Abilities, Hit Dice expanded (${currentClass.className} d${currentClass.hitDie}), and class skills updated.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-6xl max-h-[94vh] flex flex-col rounded-xl bg-slate-900 border border-cyan-500/40 text-slate-100 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-cyan-200">
                  Multiclassing, Gestalt & Archetype Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono">
                  Dominant Kit Resolution
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track dynamic level-by-level progression (HD, Saves, Skill Points, BAB) with true multiclassing and dual Gestalt options.
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

        {/* Tab Navigation & Mode Selector */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalTab('career')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                modalTab === 'career'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>1. Career Timeline (Multiclass & Gestalt)</span>
            </button>

            <button
              onClick={() => setModalTab('grids')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                modalTab === 'grids'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>2. Class Grids & Kits</span>
            </button>

            <button
              onClick={() => setModalTab('variants')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                modalTab === 'variants'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>3. Archetypes, VMC & 3rd Party</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncCareerToSheet}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Career Stats to Sheet</span>
          </button>
        </div>

        {unlinkedGrids.length > 0 && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-100 text-xs">
            Saved class grids kept but not used for this character: {unlinkedGrids.map((grid) => grid.className).join(', ')}.
            The editor follows the classes on the sheet.
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab 1: Career Timeline (Multiclass & Gestalt) */}
        {modalTab === 'career' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Live Calculated Stats Dashboard */}
            <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total Level</div>
                <div className="text-base font-bold font-mono text-cyan-300">{careerResult.totalLevel}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total HP</div>
                <div className="text-base font-bold font-mono text-rose-400">{careerResult.totalHp}</div>
                <div className="text-[9px] font-mono text-slate-500 truncate">{careerResult.hitDiceString}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Base Attack (BAB)</div>
                <div className="text-base font-bold font-mono text-cyan-400">+{careerResult.totalBab}</div>
                <div className="text-[9px] font-mono text-slate-400">{careerResult.babString}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Base Fortitude</div>
                <div className="text-base font-bold font-mono text-emerald-400">+{careerResult.fortBase}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Base Reflex</div>
                <div className="text-base font-bold font-mono text-sky-400">+{careerResult.refBase}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Base Will</div>
                <div className="text-base font-bold font-mono text-purple-400">+{careerResult.willBase}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total Skill Pts</div>
                <div className="text-base font-bold font-mono text-amber-300">{careerResult.totalSkillPoints}</div>
              </div>
            </div>

            {/* Career Control Panel: Mode Toggles */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-300">Progression Mode:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCareerData({ mode: 'standard' })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      careerData.mode === 'standard'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Standard Multiclass
                  </button>
                  <button
                    onClick={() => updateCareerData({ mode: 'gestalt' })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                      careerData.mode === 'gestalt'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Split className="w-3 h-3 text-amber-400" />
                    <span>Gestalt Mode (Class A // Class B)</span>
                  </button>
                </div>
              </div>

              {/* Fractional rules toggles */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={careerData.useFractionalBab}
                    onChange={(e) => updateCareerData({ useFractionalBab: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <span className="text-slate-300">Fractional BAB</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={careerData.useFractionalSaves}
                    onChange={(e) => updateCareerData({ useFractionalSaves: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <span className="text-slate-300">Fractional Saves</span>
                </label>
              </div>

              {/* Add/Remove level controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRemoveCareerLevel}
                  disabled={careerData.levels.length <= 1}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono disabled:opacity-30"
                >
                  - Level
                </button>
                <button
                  onClick={handleAddCareerLevel}
                  disabled={careerData.levels.length >= 20}
                  className="px-2.5 py-1 rounded bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Level Up ({careerData.levels.length + 1})</span>
                </button>
              </div>
            </div>

            {/* Level-by-Level Career Table */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="p-2 text-center">Lvl</th>
                      <th className="p-2">Primary Class</th>
                      {careerData.mode === 'gestalt' && <th className="p-2 text-amber-300">// Gestalt Class</th>}
                      <th className="p-2 text-center">Dominant HD</th>
                      <th className="p-2 text-center">HP Gained</th>
                      <th className="p-2 text-center">Skill Pts</th>
                      <th className="p-2 text-center">Favored Bonus</th>
                      <th className="p-2 text-center">BAB</th>
                      <th className="p-2 text-center">Base Saves</th>
                      <th className="p-2 font-sans">Features Unlocked at this Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {careerData.levels.map((entry, idx) => {
                      const breakdown = careerResult.levelBreakdown[idx];
                      return (
                        <tr key={entry.level} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-2 text-center font-bold text-cyan-300">{entry.level}</td>

                          {/* Primary class selector */}
                          <td className="p-2">
                            <select
                              value={entry.primaryClassId}
                              onChange={(e) => handleUpdateCareerLevel(entry.level, { primaryClassId: e.target.value })}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                            >
                              {Object.keys(classGrids).map((cid) => (
                                <option key={cid} value={cid}>
                                  {classGrids[cid].className || cid}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Gestalt secondary class selector */}
                          {careerData.mode === 'gestalt' && (
                            <td className="p-2">
                              <select
                                value={entry.gestaltClassId || 'class2'}
                                onChange={(e) => handleUpdateCareerLevel(entry.level, { gestaltClassId: e.target.value })}
                                className="px-2 py-1 rounded bg-slate-900 border border-amber-500/50 text-xs text-amber-200"
                              >
                                {Object.keys(classGrids).map((cid) => (
                                  <option key={cid} value={cid}>
                                    // {classGrids[cid].className || cid}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}

                          {/* Dominant HD */}
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold">
                              d{breakdown?.hitDie || 10}
                            </span>
                          </td>

                          {/* HP gained */}
                          <td className="p-2 text-center font-bold text-rose-400">
                            +{breakdown?.hpGained || 0}
                          </td>

                          {/* Skill points gained */}
                          <td className="p-2 text-center font-bold text-amber-300">
                            +{breakdown?.skillPointsGained || 0}
                          </td>

                          {/* Favored class bonus */}
                          <td className="p-2 text-center">
                            <select
                              value={entry.favoredClassBonus}
                              onChange={(e) => handleUpdateCareerLevel(entry.level, { favoredClassBonus: e.target.value as any })}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                            >
                              <option value="hp">+1 HP</option>
                              <option value="skill">+1 Skill</option>
                              <option value="none">None</option>
                            </select>
                          </td>

                          {/* BAB */}
                          <td className="p-2 text-center font-bold text-cyan-400">
                            +{breakdown?.cumulativeBab || 0}
                          </td>

                          {/* Base Saves */}
                          <td className="p-2 text-center text-[11px] text-slate-300 whitespace-nowrap">
                            F+{breakdown?.cumulativeFort || 0} / R+{breakdown?.cumulativeRef || 0} / W+{breakdown?.cumulativeWill || 0}
                          </td>

                          {/* Features Unlocked */}
                          <td className="p-2 font-sans text-xs text-slate-300 max-w-xs truncate" title={breakdown?.features.join(', ')}>
                            {breakdown?.features.length ? breakdown.features.join(', ') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Class Grids & Starter Kits */}
        {modalTab === 'grids' && (
          <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              {Object.keys(classGrids).map((cid) => {
                const c = classGrids[cid];
                const isActive = cid === resolvedActiveClassId;
                return (
                  <button
                    key={cid}
                    onClick={() => setActiveClassId(cid)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Swords className="w-3 h-3" />
                    <span>{c.className || cid}</span>
                  </button>
                );
              })}
              <button
                onClick={handleAddNewClass}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class</span>
              </button>
            </div>

            {/* Left: Class Identity & Grid Paste */}
            <div className="md:col-span-7 space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Class Name</label>
                    <input
                      type="text"
                      value={currentClass.className}
                      onChange={(e) => updateCurrentClass({ className: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:border-cyan-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Starter Template</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRawTextChange(CAVALIER_SAMPLE_RAW)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-300"
                      >
                        Cavalier
                      </button>
                      <button
                        onClick={() => handleRawTextChange(WIZARD_SAMPLE_RAW)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-purple-300"
                      >
                        Wizard
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-cyan-300 uppercase font-bold">
                    Paste Progression Grid (Level | BAB | Fort | Ref | Will | Special):
                  </label>
                  {currentClass.rows.length === 0 && (
                    <p className="text-[11px] text-amber-200/90 pb-1">
                      No progression grid is stored for this class. Career math uses the missing-row fallback, not a published class table.
                    </p>
                  )}
                  <textarea
                    value={currentClass.rawText}
                    onChange={(e) => handleRawTextChange(e.target.value)}
                    rows={8}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-100 font-mono text-xs focus:border-cyan-400 resize-y leading-relaxed"
                  />
                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>{currentClass.rows.length} valid progression rows parsed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Get Kit Section (Class Stat Block) */}
            <div className="md:col-span-5 space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs font-mono text-amber-300">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Class Kit Stat Block</span>
                  </div>
                  <button
                    onClick={handleAddKit}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 shadow-sm"
                    title="Add kit stat block to character: expands multiclass HD/HP, proficiencies, and marks class skills"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Add Kit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">Hit Die</label>
                    <select
                      value={currentClass.hitDie}
                      onChange={(e) => updateCurrentClass({ hitDie: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-200 font-mono"
                    >
                      <option value={6}>d6 (Wizard / Sorcerer)</option>
                      <option value={8}>d8 (Rogue / Cleric / Bard)</option>
                      <option value={10}>d10 (Fighter / Cavalier / Paladin)</option>
                      <option value={12}>d12 (Barbarian / Dragon Disciple)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">Skill Points / Level</label>
                    <select
                      value={currentClass.skillPointsPerLevel}
                      onChange={(e) => updateCurrentClass({ skillPointsPerLevel: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-200 font-mono"
                    >
                      <option value={2}>2 + INT (Fighter, Cleric)</option>
                      <option value={4}>4 + INT (Cavalier, Barbarian)</option>
                      <option value={6}>6 + INT (Bard, Ranger)</option>
                      <option value={8}>8 + INT (Rogue)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400">Proficiencies</label>
                  <textarea
                    rows={2}
                    value={currentClass.proficiencies}
                    onChange={(e) => updateCurrentClass({ proficiencies: e.target.value })}
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:border-cyan-400 font-mono"
                    placeholder="Armor, weapon, and shield proficiencies..."
                  />
                </div>

                {/* Class Skills Copy-Paste Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-mono text-slate-400">Class Skills (copy-paste list)</label>
                    <span className="text-[9px] text-slate-500 font-mono">Comma or newline separated</span>
                  </div>
                  <textarea
                    rows={3}
                    value={currentClass.classSkillsText || ''}
                    onChange={(e) => updateCurrentClass({ classSkillsText: e.target.value })}
                    placeholder="e.g. Climb, Craft, Handle Animal, Intimidate, Ride, Survival, Swim..."
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:border-cyan-400 font-mono"
                  />
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Clicking &ldquo;Add Kit&rdquo; registers proficiencies into feats/abilities, expands Hit Dice/HP, and marks these as class skills.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Archetypes, VMC & 3rd Party Variants */}
        {modalTab === 'variants' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Archetype Shaper & Custom Feature Replacer */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>Archetype Shaper</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Add custom archetypes to any class. Mark features from the class grid as lost, and input archetype abilities gained at levels 1–20. Multiple archetypes can stack on a class.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const targetGrid = classGrids[resolvedActiveClassId] || Object.values(classGrids)[0];
                    const newArch: ArchetypeConfig = {
                      id: `arch-${Date.now()}`,
                      name: 'New Archetype',
                      targetClassId: targetGrid?.id || 'class1',
                      targetClassName: targetGrid?.className || 'Class',
                      lostFeatures: [],
                      levelAbilities: {},
                      isActive: true,
                    };
                    updateCareerData({
                      archetypes: [...(careerData.archetypes || []), newArch],
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Archetype</span>
                </button>
              </div>

              {/* Archetypes List */}
              {careerData.archetypes.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center font-mono text-xs text-slate-500">
                  No archetypes defined yet. Click &ldquo;+ Add Archetype&rdquo; to shape an archetype for your class.
                </div>
              ) : (
                <div className="space-y-4">
                  {careerData.archetypes.map((arch) => {
                    const targetGrid: CustomClassGrid | undefined =
                      (arch.targetClassId ? classGrids[arch.targetClassId] : undefined) ||
                      Object.values(classGrids).find(
                        (g) => g.className.toLowerCase() === arch.targetClassName?.toLowerCase()
                      ) ||
                      classGrids['class1'];

                    // Extract unique features from the target class grid
                    const classFeatures: Array<{ level: number; feature: string }> = [];
                    (targetGrid?.rows || []).forEach((r: ClassGridRow) => {
                      if (r.special && r.special !== '—') {
                        const parts = r.special.split(/,\s*(?![^()]*\))/).map((s: string) => s.trim()).filter(Boolean);
                        parts.forEach((p: string) => {
                          if (!classFeatures.some((cf) => cf.level === r.level && cf.feature === p)) {
                            classFeatures.push({ level: r.level, feature: p });
                          }
                        });
                      }
                    });

                    const updateArchetype = (updates: Partial<ArchetypeConfig>) => {
                      updateCareerData({
                        archetypes: careerData.archetypes.map((a) =>
                          a.id === arch.id ? { ...a, ...updates } : a
                        ),
                      });
                    };

                    const removeArchetype = () => {
                      updateCareerData({
                        archetypes: careerData.archetypes.filter((a) => a.id !== arch.id),
                      });
                    };

                    const toggleLostFeature = (feat: string) => {
                      const current = arch.lostFeatures || [];
                      const exists = current.includes(feat);
                      const updated = exists ? current.filter((f) => f !== feat) : [...current, feat];
                      updateArchetype({ lostFeatures: updated });
                    };

                    const updateLevelAbility = (lvl: number, val: string) => {
                      const updated = { ...(arch.levelAbilities || {}) };
                      if (!val || val.trim() === '') {
                        delete updated[lvl];
                      } else {
                        updated[lvl] = val;
                      }
                      updateArchetype({ levelAbilities: updated });
                    };

                    return (
                      <div
                        key={arch.id}
                        className="p-3.5 rounded-lg bg-slate-900 border border-cyan-500/30 space-y-3 shadow-sm"
                      >
                        {/* Archetype Header Bar */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                              Name:
                            </span>
                            <input
                              type="text"
                              value={arch.name}
                              onChange={(e) => updateArchetype({ name: e.target.value })}
                              className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-cyan-400 font-mono"
                              placeholder="e.g. Gendarme, Two-Handed Fighter"
                            />

                            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold ml-2">
                              Class:
                            </span>
                            <select
                              value={arch.targetClassId || 'class1'}
                              onChange={(e) => {
                                const selectedGrid = classGrids[e.target.value];
                                updateArchetype({
                                  targetClassId: e.target.value,
                                  targetClassName: selectedGrid?.className || 'Class',
                                });
                              }}
                              className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono"
                            >
                              {Object.keys(classGrids).map((cid) => (
                                <option key={cid} value={cid}>
                                  {classGrids[cid].className || cid}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-slate-300">
                              <input
                                type="checkbox"
                                checked={arch.isActive !== false}
                                onChange={(e) => updateArchetype({ isActive: e.target.checked })}
                                className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                              />
                              <span>Active</span>
                            </label>

                            <button
                              onClick={removeArchetype}
                              className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300"
                              title="Delete this archetype"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Section 1: Features Lost in this Archetype */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                              1. Features Lost / Replaced from {targetGrid?.className || 'Class'} Grid:
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {(arch.lostFeatures || []).length} features marked lost
                            </span>
                          </div>

                          {classFeatures.length === 0 ? (
                            <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-500">
                              No features detected in the progression grid for this class yet.
                            </div>
                          ) : (
                            <div className="max-h-44 overflow-y-auto p-2 rounded bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-xs font-mono">
                              {classFeatures.map((cf) => {
                                const isLost = (arch.lostFeatures || []).includes(cf.feature);
                                return (
                                  <label
                                    key={`${cf.level}-${cf.feature}`}
                                    className={`flex items-start gap-1.5 p-1 rounded cursor-pointer transition-colors ${
                                      isLost
                                        ? 'bg-rose-950/40 text-rose-200 border border-rose-900/50'
                                        : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isLost}
                                      onChange={() => toggleLostFeature(cf.feature)}
                                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-500"
                                    />
                                    <span className="text-[11px] leading-tight">
                                      <span className="text-slate-500">Lvl {cf.level}:</span> {cf.feature}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Section 2: Abilities Gained by Level (1 to 20) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase">
                              2. Archetype Abilities Gained by Level (1–20):
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Input gained powers; empty levels remain standard
                            </span>
                          </div>

                          <div className="max-h-56 overflow-y-auto p-2 rounded bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
                              const abilityText = arch.levelAbilities?.[lvl] || '';
                              const hasAbility = Boolean(abilityText.trim());
                              return (
                                <div
                                  key={lvl}
                                  className={`p-1.5 rounded border flex flex-col gap-1 transition-colors ${
                                    hasAbility
                                      ? 'bg-cyan-950/40 border-cyan-500/50'
                                      : 'bg-slate-900/50 border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`text-[10px] font-bold px-1 rounded ${
                                        hasAbility
                                          ? 'bg-cyan-500 text-slate-950'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      Level {lvl}
                                    </span>
                                    {hasAbility && (
                                      <span className="text-[9px] text-cyan-400 font-bold">Gained</span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={abilityText}
                                    onChange={(e) => updateLevelAbility(lvl, e.target.value)}
                                    placeholder="Granted ability..."
                                    className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-white focus:border-cyan-400"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Variant Multiclassing (VMC) */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Variant Multiclassing (VMC)</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Sacrifice general feats at levels 3, 7, 11, 15, and 19 to gain secondary class powers without taking multiclass levels.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                  <input
                    type="checkbox"
                    checked={careerData.variantMulticlassing?.enabled || false}
                    onChange={(e) =>
                      updateCareerData({
                        variantMulticlassing: {
                          enabled: e.target.checked,
                          secondaryClass: careerData.variantMulticlassing?.secondaryClass || 'Wizard',
                        },
                      })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-amber-500"
                  />
                  <span className="font-bold text-slate-200">Enable VMC</span>
                </label>
              </div>

              {careerData.variantMulticlassing?.enabled && (
                <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300">Secondary VMC Class:</span>
                    <select
                      value={careerData.variantMulticlassing.secondaryClass}
                      onChange={(e) =>
                        updateCareerData({
                          variantMulticlassing: {
                            enabled: true,
                            secondaryClass: e.target.value,
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-amber-200 font-mono"
                    >
                      <option value="Wizard">Wizard</option>
                      <option value="Fighter">Fighter</option>
                      <option value="Barbarian">Barbarian</option>
                      <option value="Rogue">Rogue</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 pt-1">
                    {(VMC_SCHEDULES[careerData.variantMulticlassing.secondaryClass] || []).map((v) => (
                      <div key={v.level} className="flex items-start gap-2">
                        <span className="font-mono text-amber-400 text-[11px] shrink-0">Lvl {v.level} Feat Swap:</span>
                        <span className="text-[11px] text-slate-300">{v.feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Popular 3rd Party Features: Path of War & Spheres */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-mono font-bold text-purple-300 uppercase flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>Popular 3rd Party Systems (Path of War & Spheres)</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Path of War */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Path of War (Maneuvers)</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={careerData.thirdPartySupport?.pathOfWarEnabled || false}
                        onChange={(e) =>
                          updateCareerData({
                            thirdPartySupport: {
                              ...careerData.thirdPartySupport,
                              pathOfWarEnabled: e.target.checked,
                              spheresEnabled: careerData.thirdPartySupport?.spheresEnabled || false,
                            },
                          })
                        }
                        className="rounded border-slate-700 bg-slate-950 text-purple-500"
                      />
                      <span className="text-[10px] font-mono text-slate-400">Active</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Calculates Initiator Level = Martial Levels + 1/2 Other Levels.
                  </p>
                  {careerData.thirdPartySupport?.pathOfWarEnabled && (
                    <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-purple-300">
                      Calculated Initiator Level: {Math.floor(careerResult.totalLevel * 0.75)}
                    </div>
                  )}
                </div>

                {/* Spheres of Power / Might */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Spheres of Power & Might</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={careerData.thirdPartySupport?.spheresEnabled || false}
                        onChange={(e) =>
                          updateCareerData({
                            thirdPartySupport: {
                              ...careerData.thirdPartySupport,
                              pathOfWarEnabled: careerData.thirdPartySupport?.pathOfWarEnabled || false,
                              spheresEnabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-700 bg-slate-950 text-purple-500"
                      />
                      <span className="text-[10px] font-mono text-slate-400">Active</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tracks combat talents, magic spheres, and spell points pool per level.
                  </p>
                  {careerData.thirdPartySupport?.spheresEnabled && (
                    <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-purple-300">
                      Spheres Talents Available: {Math.max(1, Math.floor(careerResult.totalLevel))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Active Character: {character.name} | Mode: {careerData.mode.toUpperCase()}</span>
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
