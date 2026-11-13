/**
 * Pathfinder 1st Edition Multiclass, Gestalt & Archetype Calculation Engine
 * Handles:
 * - Dynamic Level-by-Level dominant kit resolution (HD, Skill Points, Saves, BAB)
 * - True Multiclassing (e.g. Fighter 2 -> Wizard 1 -> Fighter 3)
 * - Gestalt Progression (Class A // Class B taking max HD, max BAB rate, best saves, combined features)
 * - Fractional BAB & Fractional Saves (Unchained variant rules)
 * - Archetype feature replacement resolution
 * - Variant Multiclassing (VMC) feat schedules
 * - 3rd Party Integrations (Path of War Initiator Level, Spheres of Power/Might)
 */

import {
  PF1Character,
  CustomClassGrid,
  ClassGridRow,
  CareerProgressionData,
  CareerLevelEntry,
  ArchetypeConfig,
} from '../types/character';

export interface CalculatedCareerResult {
  totalLevel: number;
  classSummaryTitle: string;
  totalHp: number;
  hitDiceString: string;
  totalBab: number;
  babString: string;
  fortBase: number;
  refBase: number;
  willBase: number;
  totalSkillPoints: number;
  allFeatures: string[];
  levelBreakdown: Array<{
    level: number;
    className: string;
    classLevel: number;
    gestaltClassName?: string;
    gestaltClassLevel?: number;
    hitDie: number;
    hpGained: number;
    skillPointsGained: number;
    cumulativeBab: number;
    cumulativeFort: number;
    cumulativeRef: number;
    cumulativeWill: number;
    features: string[];
    isGestalt: boolean;
  }>;
}

// Built-in popular archetypes with their standard feature replacements
export const POPULAR_ARCHETYPES: ArchetypeConfig[] = [
  {
    id: 'cavalier-gendarme',
    name: 'Gendarme',
    targetClassName: 'Cavalier',
    swaps: [
      { id: 'g-1', level: 1, replacedFeature: 'Tactician', newFeature: 'Bonus Combat Feat (Gendarme)', description: 'Replaces tactician with bonus combat feat at 1st, 5th, 8th, etc.' },
      { id: 'g-2', level: 5, replacedFeature: 'Banner', newFeature: 'Bonus Combat Feat (Gendarme)', description: 'Replaces banner' },
      { id: 'g-3', level: 9, replacedFeature: 'Greater tactician', newFeature: 'Bonus Combat Feat (Gendarme)', description: 'Replaces greater tactician' },
      { id: 'g-4', level: 14, replacedFeature: 'Greater banner', newFeature: 'Bonus Combat Feat (Gendarme)', description: 'Replaces greater banner' },
      { id: 'g-5', level: 17, replacedFeature: 'Master tactician', newFeature: 'Bonus Combat Feat (Gendarme)', description: 'Replaces master tactician' },
    ],
  },
  {
    id: 'fighter-two-handed',
    name: 'Two-Handed Fighter',
    targetClassName: 'Fighter',
    swaps: [
      { id: 'th-1', level: 2, replacedFeature: 'Bravery', newFeature: 'Shattering Strike (+1 CMB vs sunder/damage)', description: 'Replaces bravery' },
      { id: 'th-2', level: 3, replacedFeature: 'Armor Training 1', newFeature: 'Overhand Chop (Double STR mod on single attack)', description: 'Replaces armor training 1' },
      { id: 'th-3', level: 7, replacedFeature: 'Armor Training 2', newFeature: 'Weapon Training: Two-Handed Weapons', description: 'Replaces armor training 2' },
      { id: 'th-4', level: 11, replacedFeature: 'Armor Training 3', newFeature: 'Piledriver (Free trip/bull rush on standard attack)', description: 'Replaces armor training 3' },
      { id: 'th-5', level: 15, replacedFeature: 'Armor Training 4', newFeature: 'Greater Power Attack (x2 two-handed PA bonus)', description: 'Replaces armor training 4' },
    ],
  },
  {
    id: 'rogue-scout',
    name: 'Scout',
    targetClassName: 'Rogue',
    swaps: [
      { id: 'sc-1', level: 4, replacedFeature: 'Uncanny Dodge', newFeature: "Scout's Charge (Sneak attack on charges)", description: 'Replaces uncanny dodge' },
      { id: 'sc-2', level: 8, replacedFeature: 'Improved Uncanny Dodge', newFeature: 'Skirmish (Sneak attack whenever moving 10+ ft)', description: 'Replaces improved uncanny dodge' },
    ],
  },
  {
    id: 'barbarian-invulnerable',
    name: 'Invulnerable Rager',
    targetClassName: 'Barbarian',
    swaps: [
      { id: 'ir-1', level: 2, replacedFeature: 'Uncanny Dodge', newFeature: 'Damage Reduction (DR 1/- per 2 levels)', description: 'Replaces uncanny dodge & improves DR' },
      { id: 'ir-2', level: 3, replacedFeature: 'Trap Sense', newFeature: 'Extreme Endurance (Fire/Cold resist 1 per 3 lvls)', description: 'Replaces trap sense' },
    ],
  },
  {
    id: 'paladin-oath-vengeance',
    name: 'Oath of Vengeance',
    targetClassName: 'Paladin',
    swaps: [
      { id: 'ov-1', level: 4, replacedFeature: 'Lay on Hands (Channel Energy)', newFeature: 'Channel Wrath (Spend 2 LoH to gain extra Smite Evil)', description: 'Replaces standard channel energy' },
    ],
  },
];

// Preloaded VMC Progression schedules
export const VMC_SCHEDULES: Record<string, Array<{ level: number; feature: string }>> = {
  Wizard: [
    { level: 3, feature: 'VMC Wizard: Arcane School 1st-level power (as wizard of character level - 2)' },
    { level: 7, feature: 'VMC Wizard: Familiar (using full character level)' },
    { level: 11, feature: 'VMC Wizard: Arcane School secondary power or bonus feat' },
    { level: 15, feature: 'VMC Wizard: Arcane School 8th-level power' },
    { level: 19, feature: 'VMC Wizard: Arcane Discovery' },
  ],
  Fighter: [
    { level: 3, feature: 'VMC Fighter: Bravery +1 (+1 every 4 levels thereafter)' },
    { level: 7, feature: 'VMC Fighter: Armor Training 1' },
    { level: 11, feature: 'VMC Fighter: Weapon Training 1 (+1 on one weapon group)' },
    { level: 15, feature: 'VMC Fighter: Armor Training 2' },
    { level: 19, feature: 'VMC Fighter: Weapon Mastery (crit multiplier/rerolls)' },
  ],
  Barbarian: [
    { level: 3, feature: 'VMC Barbarian: Rage (character level - 2 rounds per day)' },
    { level: 7, feature: 'VMC Barbarian: Uncanny Dodge' },
    { level: 8, feature: 'VMC Barbarian: Rage Power' },
    { level: 15, feature: 'VMC Barbarian: Damage Reduction 1/-' },
    { level: 19, feature: 'VMC Barbarian: Greater Rage' },
  ],
  Rogue: [
    { level: 3, feature: 'VMC Rogue: Trapfinding (half level on Perception/Disable Device)' },
    { level: 7, feature: 'VMC Rogue: Sneak Attack +1d6 (+1d6 at 11, 15, 19)' },
    { level: 11, feature: 'VMC Rogue: Evasion' },
    { level: 15, feature: 'VMC Rogue: Rogue Talent' },
    { level: 19, feature: 'VMC Rogue: Improved Evasion' },
  ],
};

/**
 * Main Calculation Runner
 */
export function calculateCareerProgression(
  character: PF1Character,
  careerData?: CareerProgressionData
): CalculatedCareerResult {
  const customGrids = character?.customClassGrids || {};
  const activeMode = careerData?.mode || 'standard';
  const isGestaltMode = activeMode === 'gestalt';
  const useFracBab = careerData?.useFractionalBab || false;
  const useFracSaves = careerData?.useFractionalSaves || false;
  const con = character?.abilities?.CON;
  const conMod = con ? Math.floor(((con.base || 10) + (con.raceMod || 0) + (con.levelAsiMod || 0) + (con.enhMod || 0) - 10) / 2) : 0;
  const int = character?.abilities?.INT;
  const intMod = int ? Math.floor(((int.base || 10) + (int.raceMod || 0) + (int.levelAsiMod || 0) + (int.enhMod || 0) - 10) / 2) : 0;

  // If no career levels exist yet, construct default career levels from character.level
  const charLevel = Math.max(1, character?.level || 1);
  const levels: CareerLevelEntry[] = (careerData && careerData.levels && careerData.levels.length > 0)
    ? careerData.levels
    : Array.from({ length: charLevel }, (_, idx) => {
        const lvl = idx + 1;
        return {
          level: lvl,
          primaryClassId: 'class1',
          primaryClassLevel: lvl,
          isGestalt: isGestaltMode,
          gestaltClassId: isGestaltMode ? 'class2' : undefined,
          gestaltClassLevel: isGestaltMode ? lvl : undefined,
          favoredClassBonus: lvl === 1 ? 'hp' : 'hp',
        };
      });

  const levelBreakdown: CalculatedCareerResult['levelBreakdown'] = [];
  const classCountMap: Record<string, number> = {};
  const gestaltClassCountMap: Record<string, number> = {};
  const allFeatures: string[] = [];
  const hitDiceCountMap: Record<number, number> = {};

  let totalHp = 0;
  let runningBab = 0;
  let runningFort = 0;
  let runningRef = 0;
  let runningWill = 0;
  let totalSkillPoints = 0;

  // Track if a good save bonus (+2) has already been applied in fractional mode
  let appliedGoodFort = false;
  let appliedGoodRef = false;
  let appliedGoodWill = false;

  levels.forEach((entry, idx) => {
    const isFirstLevel = idx === 0;

    // 1. Resolve Primary Class
    const primaryGrid = customGrids[entry.primaryClassId] || customGrids['class1'];
    const pName = primaryGrid?.className || 'Class 1';
    classCountMap[pName] = (classCountMap[pName] || 0) + 1;
    const pLevel = classCountMap[pName];

    // Find row in primary grid
    const pRow = primaryGrid?.rows?.find((r) => r.level === pLevel) || {
      level: pLevel,
      bab: pLevel,
      fort: Math.floor(pLevel / 2) + 2,
      ref: Math.floor(pLevel / 3),
      will: Math.floor(pLevel / 3),
      special: '',
    };

    // 2. Resolve Gestalt Class (if in gestalt mode or level has gestalt flagged)
    const isLevelGestalt = isGestaltMode || entry.isGestalt;
    let gGrid: CustomClassGrid | undefined = undefined;
    let gRow: ClassGridRow | undefined = undefined;
    let gName = '';
    let gLevel = 0;

    if (isLevelGestalt && entry.gestaltClassId) {
      gGrid = customGrids[entry.gestaltClassId] || customGrids['class2'];
      if (gGrid) {
        gName = gGrid.className || 'Class 2';
        gestaltClassCountMap[gName] = (gestaltClassCountMap[gName] || 0) + 1;
        gLevel = gestaltClassCountMap[gName];
        gRow = gGrid.rows?.find((r) => r.level === gLevel) || {
          level: gLevel,
          bab: Math.floor(gLevel * 0.75),
          fort: Math.floor(gLevel / 3),
          ref: Math.floor(gLevel / 3),
          will: Math.floor(gLevel / 2) + 2,
          special: '',
        };
      }
    }

    // 3. Dominant Kit HD & HP Resolution
    const pHD = primaryGrid?.hitDie || 10;
    const gHD = gGrid?.hitDie || 0;
    const dominantHD = isLevelGestalt ? Math.max(pHD, gHD) : pHD;

    hitDiceCountMap[dominantHD] = (hitDiceCountMap[dominantHD] || 0) + 1;

    // HP calculation: 1st level gets full HD; subsequent gets average (or custom roll)
    const calcMethod = character?.hpBreakdown?.calcMethod || 'average';
    let baseHdHp = 0;
    if (entry.customHpRoll) {
      baseHdHp = entry.customHpRoll;
    } else if (isFirstLevel) {
      baseHdHp = dominantHD;
    } else {
      if (calcMethod === 'max') baseHdHp = dominantHD;
      else if (calcMethod === 'rolled') baseHdHp = Math.floor(dominantHD / 2) + 1; // default fallback if unrolled
      else baseHdHp = Math.floor(dominantHD / 2) + 1; // average (10 -> 6, 8 -> 5, 12 -> 7, 6 -> 4)
    }

    const favoredHpBonus = entry.favoredClassBonus === 'hp' ? 1 : 0;
    const levelHpGained = Math.max(1, baseHdHp + conMod + favoredHpBonus);
    totalHp += levelHpGained;

    // 4. Skill Points Resolution
    const pSP = primaryGrid?.skillPointsPerLevel || 2;
    const gSP = gGrid?.skillPointsPerLevel || 0;
    const dominantSP = isLevelGestalt ? Math.max(pSP, gSP) : pSP;
    const favoredSpBonus = entry.favoredClassBonus === 'skill' ? 1 : 0;
    const levelSkillPoints = Math.max(1, dominantSP + intMod) + favoredSpBonus;
    totalSkillPoints += levelSkillPoints;

    // 5. BAB Resolution
    let levelBabIncrement = 0;
    if (useFracBab) {
      // Fractional BAB: Full=1.0, 3/4=0.75, 1/2=0.5
      const getRate = (grid?: CustomClassGrid) => {
        if (!grid || !grid.rows || grid.rows.length === 0) return 1.0;
        const r20 = grid.rows.find((r) => r.level === 20) || grid.rows[grid.rows.length - 1];
        if (r20.bab >= 20) return 1.0;
        if (r20.bab >= 15) return 0.75;
        return 0.5;
      };
      const pRate = getRate(primaryGrid);
      const gRate = isLevelGestalt ? getRate(gGrid) : 0;
      levelBabIncrement = Math.max(pRate, gRate);
      runningBab += levelBabIncrement;
    } else {
      // Standard additive or Gestalt max
      if (isLevelGestalt && gRow) {
        // Compare current BAB progress
        levelBabIncrement = Math.max(pRow.bab - (pLevel > 1 ? (primaryGrid?.rows?.find((r) => r.level === pLevel - 1)?.bab || 0) : 0),
                                     gRow.bab - (gLevel > 1 ? (gGrid?.rows?.find((r) => r.level === gLevel - 1)?.bab || 0) : 0));
      } else {
        const prevBab = pLevel > 1 ? (primaryGrid?.rows?.find((r) => r.level === pLevel - 1)?.bab || 0) : 0;
        levelBabIncrement = pRow.bab - prevBab;
      }
      runningBab += levelBabIncrement;
    }

    // 6. Saves Resolution (Fort, Ref, Will)
    if (useFracSaves) {
      const isGood = (row?: ClassGridRow) => row && row.level === 1 && row.fort === 2;
      // Fort
      if (pRow.fort > pRow.level / 3 || (gRow && gRow.fort > gRow.level / 3)) {
        if (!appliedGoodFort) { runningFort += 2.5; appliedGoodFort = true; }
        else { runningFort += 0.5; }
      } else {
        runningFort += 0.3333;
      }
      // Ref
      if (pRow.ref > pRow.level / 3 || (gRow && gRow.ref > gRow.level / 3)) {
        if (!appliedGoodRef) { runningRef += 2.5; appliedGoodRef = true; }
        else { runningRef += 0.5; }
      } else {
        runningRef += 0.3333;
      }
      // Will
      if (pRow.will > pRow.level / 3 || (gRow && gRow.will > gRow.level / 3)) {
        if (!appliedGoodWill) { runningWill += 2.5; appliedGoodWill = true; }
        else { runningWill += 0.5; }
      } else {
        runningWill += 0.3333;
      }
    } else {
      // Standard: In Gestalt, takes max base save of the two classes
      if (isLevelGestalt && gRow) {
        const prevP = primaryGrid?.rows?.find((r) => r.level === pLevel - 1);
        const prevG = gGrid?.rows?.find((r) => r.level === gLevel - 1);
        const pFortGain = pRow.fort - (prevP?.fort || 0);
        const gFortGain = gRow.fort - (prevG?.fort || 0);
        runningFort += Math.max(pFortGain, gFortGain);

        const pRefGain = pRow.ref - (prevP?.ref || 0);
        const gRefGain = gRow.ref - (prevG?.ref || 0);
        runningRef += Math.max(pRefGain, gRefGain);

        const pWillGain = pRow.will - (prevP?.will || 0);
        const gWillGain = gRow.will - (prevG?.will || 0);
        runningWill += Math.max(pWillGain, gWillGain);
      } else {
        const prevP = primaryGrid?.rows?.find((r) => r.level === pLevel - 1);
        runningFort += pRow.fort - (prevP?.fort || 0);
        runningRef += pRow.ref - (prevP?.ref || 0);
        runningWill += pRow.will - (prevP?.will || 0);
      }
    }

    // 7. Features & Archetype Resolution
    const levelFeatures: string[] = [];

    // Helper to resolve custom & stacking archetypes
    const resolveFeaturesForClass = (
      className: string,
      classLevel: number,
      rawFeatures: string,
      classId?: string
    ) => {
      if (!rawFeatures || rawFeatures === '—') {
        // Even if base features are empty, archetype might add something at this level
        const matchingArchs = (careerData?.archetypes || []).filter(
          (a) =>
            a.isActive !== false &&
            ((classId && a.targetClassId === classId) ||
              (a.targetClassName && a.targetClassName.toLowerCase() === className.toLowerCase()))
        );
        for (const arch of matchingArchs) {
          if (arch.levelAbilities && arch.levelAbilities[classLevel]) {
            const gained = arch.levelAbilities[classLevel].trim();
            if (gained && gained !== '—') {
              levelFeatures.push(`[${arch.name}] ${gained}`);
            }
          }
        }
        return;
      }

      const featuresList = rawFeatures.split(/,\s*(?![^()]*\))/).map((f) => f.trim()).filter(Boolean);

      // Check active archetypes matching this class
      const matchingArchetypes = (careerData?.archetypes || []).filter(
        (a) =>
          a.isActive !== false &&
          ((classId && a.targetClassId === classId) ||
            (a.targetClassName && a.targetClassName.toLowerCase() === className.toLowerCase()))
      );

      for (const feat of featuresList) {
        let isLost = false;

        for (const arch of matchingArchetypes) {
          // Check if marked in lostFeatures
          const matchedLost = (arch.lostFeatures || []).some(
            (lf) =>
              lf.trim().toLowerCase() === feat.toLowerCase() ||
              feat.toLowerCase().includes(lf.trim().toLowerCase()) ||
              lf.trim().toLowerCase().includes(feat.toLowerCase())
          );
          if (matchedLost) {
            isLost = true;
            break;
          }

          // Legacy swap support if present
          if (arch.swaps && Array.isArray(arch.swaps)) {
            const swap = arch.swaps.find(
              (s) => s.level === classLevel && feat.toLowerCase().includes(s.replacedFeature.toLowerCase())
            );
            if (swap) {
              levelFeatures.push(`[${arch.name}] ${swap.newFeature} (replaces ${feat})`);
              isLost = true;
              break;
            }
          }
        }

        if (!isLost) {
          levelFeatures.push(`${className} ${classLevel}: ${feat}`);
        }
      }

      // Add abilities granted by archetypes at this class level
      for (const arch of matchingArchetypes) {
        if (arch.levelAbilities && arch.levelAbilities[classLevel]) {
          const gained = arch.levelAbilities[classLevel].trim();
          if (gained && gained !== '—' && !levelFeatures.includes(`[${arch.name}] ${gained}`)) {
            levelFeatures.push(`[${arch.name}] ${gained}`);
          }
        }
      }
    };

    resolveFeaturesForClass(pName, pLevel, pRow.special, primaryGrid?.id);
    if (isLevelGestalt && gRow && gName) {
      resolveFeaturesForClass(gName, gLevel, gRow.special, gGrid?.id);
    }

    // Check VMC triggers (levels 3, 7, 11, 15, 19)
    if (careerData?.variantMulticlassing?.enabled && careerData.variantMulticlassing.secondaryClass) {
      const vmcClass = careerData.variantMulticlassing.secondaryClass;
      const vmcSchedule = VMC_SCHEDULES[vmcClass] || [];
      const vmcItem = vmcSchedule.find((v) => v.level === entry.level);
      if (vmcItem) {
        levelFeatures.push(vmcItem.feature);
      }
    }

    levelFeatures.forEach((f) => {
      if (!allFeatures.includes(f)) allFeatures.push(f);
    });

    levelBreakdown.push({
      level: entry.level,
      className: pName,
      classLevel: pLevel,
      gestaltClassName: isLevelGestalt ? gName : undefined,
      gestaltClassLevel: isLevelGestalt ? gLevel : undefined,
      hitDie: dominantHD,
      hpGained: levelHpGained,
      skillPointsGained: levelSkillPoints,
      cumulativeBab: Math.floor(runningBab),
      cumulativeFort: Math.floor(runningFort),
      cumulativeRef: Math.floor(runningRef),
      cumulativeWill: Math.floor(runningWill),
      features: levelFeatures,
      isGestalt: isLevelGestalt,
    });
  });

  // Build Hit Dice summary string (e.g. "8d10 + 4d6" or "12d10 [Gestalt]")
  const hdParts = Object.entries(hitDiceCountMap).map(([hd, count]) => `${count}d${hd}`);
  const hitDiceString = isGestaltMode ? `${levels.length}d${levelBreakdown[0]?.hitDie || 10} [Gestalt]` : hdParts.join(' + ');

  // Build Class summary title (e.g. "Fighter 8 / Wizard 4" or "Cavalier 12 // Dragon Disciple 12")
  let classSummaryTitle = '';
  if (isGestaltMode) {
    const pNames = Object.entries(classCountMap).map(([k, v]) => `${k} ${v}`).join(' / ');
    const gNames = Object.entries(gestaltClassCountMap).map(([k, v]) => `${k} ${v}`).join(' / ');
    classSummaryTitle = `${pNames} // ${gNames}`;
  } else {
    classSummaryTitle = Object.entries(classCountMap).map(([k, v]) => `${k} ${v}`).join(' / ');
  }

  // Iterative attack string for BAB (e.g. +12/+7/+2)
  const finalBab = Math.floor(runningBab);
  const iterativeBabStrings: string[] = [];
  let b = finalBab;
  while (b > 0) {
    iterativeBabStrings.push(`+${b}`);
    b -= 5;
  }
  const babString = iterativeBabStrings.length > 0 ? iterativeBabStrings.join('/') : '+0';

  return {
    totalLevel: levels.length,
    classSummaryTitle,
    totalHp,
    hitDiceString,
    totalBab: finalBab,
    babString,
    fortBase: Math.floor(runningFort),
    refBase: Math.floor(runningRef),
    willBase: Math.floor(runningWill),
    totalSkillPoints,
    allFeatures,
    levelBreakdown,
  };
}
