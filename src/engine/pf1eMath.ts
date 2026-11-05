/**
 * Core mathematical rules and derivations for Pathfinder 1st Edition
 */

import { ConditionState, PF1Character, AbilityName } from '../types/character';

// Standard PF1e Point Buy Cost Table (Score 6 to 18)
// 6=-5, 7=-4, 8=-2, 9=-1, 10=0, 11=1, 12=2, 13=3, 14=5, 15=7, 16=10, 17=13, 18=17
export const POINT_BUY_COST_TABLE: Record<number, number> = {
  6: -5,
  7: -4,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 5,
  15: 7,
  16: 10,
  17: 13,
  18: 17,
};

export const POINT_BUY_PRESETS = [
  { name: 'Low Fantasy', points: 10 },
  { name: 'Standard Fantasy', points: 15 },
  { name: 'High Fantasy', points: 20 },
  { name: 'Epic Fantasy', points: 25 },
];

export function getPointBuyCost(score: number): number {
  const clamped = Math.max(6, Math.min(18, score));
  return POINT_BUY_COST_TABLE[clamped] ?? 0;
}

export function calculateTotalPointBuy(character: PF1Character): number {
  let total = 0;
  const abilities: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  for (const ab of abilities) {
    const base = character?.abilities?.[ab]?.base ?? 10;
    total += getPointBuyCost(base);
  }
  return total;
}

// Size Modifiers for AC, Attack, CMB, CMD, and Stealth
export const SIZE_MODIFIERS: Record<
  PF1Character['size'],
  { acAndAttack: number; cmbAndCmd: number; fly: number; stealth: number; carryMult: number }
> = {
  Fine: { acAndAttack: 8, cmbAndCmd: -8, fly: 8, stealth: 16, carryMult: 0.125 },
  Diminutive: { acAndAttack: 4, cmbAndCmd: -4, fly: 6, stealth: 12, carryMult: 0.25 },
  Tiny: { acAndAttack: 2, cmbAndCmd: -2, fly: 4, stealth: 8, carryMult: 0.5 },
  Small: { acAndAttack: 1, cmbAndCmd: -1, fly: 2, stealth: 4, carryMult: 0.75 },
  Medium: { acAndAttack: 0, cmbAndCmd: 0, fly: 0, stealth: 0, carryMult: 1 },
  Large: { acAndAttack: -1, cmbAndCmd: 1, fly: -2, stealth: -4, carryMult: 2 },
  Huge: { acAndAttack: -2, cmbAndCmd: 2, fly: -4, stealth: -8, carryMult: 4 },
  Gargantuan: { acAndAttack: -4, cmbAndCmd: 4, fly: -6, stealth: -12, carryMult: 8 },
  Colossal: { acAndAttack: -8, cmbAndCmd: 8, fly: -8, stealth: -16, carryMult: 16 },
};

export interface ConditionPenalties {
  strPenalty: number;
  dexPenalty: number;
  attackPenalty: number;
  acPenalty: number;
  savePenalty: number;
  skillPenalty: number;
  speedMultiplier: number;
  losesDexToAC: boolean;
  notes: string[];
}

export function evaluateConditions(conditions?: ConditionState): ConditionPenalties {
  const c = conditions || ({} as Partial<ConditionState>);
  const result: ConditionPenalties = {
    strPenalty: 0,
    dexPenalty: 0,
    attackPenalty: 0,
    acPenalty: 0,
    savePenalty: 0,
    skillPenalty: 0,
    speedMultiplier: 1.0,
    losesDexToAC: false,
    notes: [],
  };

  if (c.fatigued) {
    result.strPenalty += 2;
    result.dexPenalty += 2;
    result.notes.push('Fatigued: -2 STR, -2 DEX, cannot run/charge');
  }

  if (c.exhausted) {
    result.strPenalty += 6;
    result.dexPenalty += 6;
    result.speedMultiplier = Math.min(result.speedMultiplier, 0.5);
    result.notes.push('Exhausted: -6 STR, -6 DEX, half speed');
  }

  if (c.shaken || c.frightened || c.panicked) {
    result.attackPenalty += 2;
    result.savePenalty += 2;
    result.skillPenalty += 2;
    result.notes.push('Fear effect: -2 on attacks, saves, and skill checks');
  }

  if (c.sickened) {
    result.attackPenalty += 2;
    result.savePenalty += 2;
    result.skillPenalty += 2;
    result.notes.push('Sickened: -2 on attacks, damage, saves, skill checks');
  }

  if (c.entangled) {
    result.dexPenalty += 4;
    result.attackPenalty += 2;
    result.speedMultiplier = Math.min(result.speedMultiplier, 0.5);
    result.notes.push('Entangled: -4 DEX, -2 on attacks, half speed');
  }

  if (c.blinded) {
    result.acPenalty += 2;
    result.losesDexToAC = true;
    result.notes.push('Blinded: -2 AC, loses DEX to AC, -4 STR/DEX skills');
  }

  if (c.cowering || c.stunned) {
    result.acPenalty += 2;
    result.losesDexToAC = true;
    result.notes.push('Cowering/Stunned: -2 AC, loses DEX to AC');
  }

  if (c.prone) {
    result.attackPenalty += 4;
    result.notes.push('Prone: -4 melee attack rolls, +4 AC vs ranged, -4 AC vs melee');
  }

  if (c.grappled) {
    result.dexPenalty += 4;
    result.attackPenalty += 2;
    result.notes.push('Grappled: -4 DEX, -2 attacks/CMB');
  }

  if (c.dazzled) {
    result.attackPenalty += 1;
    result.notes.push('Dazzled: -1 attack rolls and sight Perception');
  }

  // Buffs
  if (c.haste) {
    result.attackPenalty -= 1; // bonus
    result.notes.push('Haste: +1 attack, +1 dodge AC, +1 Reflex, +30ft speed');
  }

  if (c.prayer) {
    result.attackPenalty -= 1;
    result.savePenalty -= 1;
    result.skillPenalty -= 1;
    result.notes.push('Prayer: +1 luck bonus to attacks, damage, saves, skills');
  }

  if (c.heroism) {
    result.attackPenalty -= 2;
    result.savePenalty -= 2;
    result.skillPenalty -= 2;
    result.notes.push('Heroism: +2 morale to attacks, saves, skills');
  }

  return result;
}

export interface DerivedCombatStats {
  strTotal: number;
  dexTotal: number;
  conTotal: number;
  intTotal: number;
  wisTotal: number;
  chaTotal: number;
  strMod: number; // Effective ASB
  dexMod: number; // Effective ASB
  conMod: number; // Effective ASB
  intMod: number; // Effective ASB
  wisMod: number; // Effective ASB
  chaMod: number; // Effective ASB
  baseStrMod: number;
  strDirectMod: number;
  baseDexMod: number;
  dexDirectMod: number;
  baseConMod: number;
  conDirectMod: number;
  baseIntMod: number;
  intDirectMod: number;
  baseWisMod: number;
  wisDirectMod: number;
  baseChaMod: number;
  chaDirectMod: number;

  armorBonusTotal: number;
  shieldBonusTotal: number;
  totalArmorBonus: number;
  totalAcMiscBonus: number;
  maxDexAllowance: number;
  armorCheckPenaltyTotal: number;

  effectiveDexModForAC: number;

  acTotal: number;
  touchAC: number;
  flatFootedAC: number;

  fortitudeTotal: number;
  reflexTotal: number;
  willTotal: number;

  meleeAttackBonusTotal: number;
  rangedAttackBonusTotal: number;

  initiativeTotal: number;

  cmbTotal: number;
  cmdTotal: number;
  cmdStrTotal: number;
  cmdDexTotal: number;
  cmdChoice: 'STR' | 'DEX' | 'BOTH';
  cmdFlatFooted: number;

  iterativeAttacks: number[];

  // Buff Box Totals
  buffTotals: Record<import('../types/character').BuffStatTarget, number>;

  // HP Breakdown
  hpBreakdownDetails: {
    calcMethod: 'average' | 'max' | 'rolled';
    dieSize: number;
    hdCount: number;
    baseHitDiceHP: number;
    conHpBonus: number;
    additionalBonusesSum: number;
    buffHpBonus: number;
    calculatedTotalMaxHP: number;
    formulaNotation: string;
  };

  // Skill Points constraints (Requirement 1.3 & Multistalt rules)
  skillPointsStats: {
    basePerLevel: number;
    intMod: number;
    favoredBonus: number;
    extraPerLevel: number;
    bonusFlat: number;
    calculatedMaxAfforded: number;
    maxAfforded: number;
    totalSpent: number;
    remaining: number;
    isOverspent: boolean;
    isManualOverride: boolean;
  };

  carryingCapacity: {
    light: number;
    medium: number;
    heavy: number;
    overhead: number;
    offGround: number;
    drag: number;
    currentWeight: number;
    loadStatus: 'Light' | 'Medium' | 'Heavy' | 'Overburdened';
  };

  hpStatus: {
    label: string;
    color: string;
    percent: number;
  };

  pointBuySpent: number;
}

export function computeBuffBoxTotals(
  buffBox?: import('../types/character').BuffBoxData,
  customBuffs?: import('../types/character').CustomBuffEffect[]
): Record<import('../types/character').BuffStatTarget, number> {
  const totals: Record<import('../types/character').BuffStatTarget, number> = {
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

  const targets: import('../types/character').BuffStatTarget[] = [
    'hp',
    'mattack',
    'rattack',
    'fort',
    'ref',
    'will',
    'ac',
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha',
    'str_mod',
    'dex_mod',
    'con_mod',
    'int_mod',
    'wis_mod',
    'cha_mod',
  ];

  // 1. Sum values from the base typed matrix (buffBox)
  if (buffBox) {
    for (const bonusType of Object.keys(buffBox) as import('../types/character').BuffBonusType[]) {
      const row = buffBox[bonusType];
      if (row) {
        for (const target of targets) {
          totals[target] += Number(row[target]) || 0;
        }
      }
    }
  }

  // 2. Sum values from active custom buffs and debuffs (activatable, permanent, negative numbers)
  if (customBuffs && Array.isArray(customBuffs)) {
    for (const buff of customBuffs) {
      if (buff.isActive && buff.values) {
        for (const target of targets) {
          totals[target] += Number(buff.values[target]) || 0;
        }
      }
    }
  }

  return totals;
}

export function computeDerivedCharacterStats(character: PF1Character): DerivedCombatStats {
  const cond = evaluateConditions(character.conditions);
  const buffTotals = computeBuffBoxTotals(character.buffBox, character.customBuffs);

  // Ability totals: Base (6-18) + RaceMod + LevelAsiMod + BuffBox + EnhMod + MiscMod + TempMod - ConditionPenalty
  const getScore = (name: AbilityName, penalty: number = 0) => {
    const ab = character?.abilities?.[name];
    if (!ab) return 10;
    const statKey = name.toLowerCase() as import('../types/character').BuffStatTarget;
    const buffStat = buffTotals[statKey] || 0;
    const levelAsi = ab.levelAsiMod || 0;
    return Math.max(
      1,
      (ab.base ?? 10) + (ab.raceMod ?? 0) + levelAsi + buffStat + (ab.enhMod ?? 0) + (ab.miscMod ?? 0) + (ab.tempMod ?? 0) - penalty
    );
  };

  const strTotal = getScore('STR', cond.strPenalty);
  const dexTotal = getScore('DEX', cond.dexPenalty);
  const conTotal = getScore('CON', 0);
  const intTotal = getScore('INT', 0);
  const wisTotal = getScore('WIS', 0);
  const chaTotal = getScore('CHA', 0);

  // Base Score-Derived Mod: floor((score - 10) / 2)
  const baseStrMod = Math.floor((strTotal - 10) / 2);
  const baseDexMod = Math.floor((dexTotal - 10) / 2);
  const baseConMod = Math.floor((conTotal - 10) / 2);
  const baseIntMod = Math.floor((intTotal - 10) / 2);
  const baseWisMod = Math.floor((wisTotal - 10) / 2);
  const baseChaMod = Math.floor((chaTotal - 10) / 2);

  // Direct Mod Adj (User specification: direct mod bonuses not calculated with total score + Buff Box Mod ADJ)
  const strDirectMod = (character?.abilities?.STR?.directMod || 0) + (buffTotals['str_mod'] || 0);
  const dexDirectMod = (character?.abilities?.DEX?.directMod || 0) + (buffTotals['dex_mod'] || 0);
  const conDirectMod = (character?.abilities?.CON?.directMod || 0) + (buffTotals['con_mod'] || 0);
  const intDirectMod = (character?.abilities?.INT?.directMod || 0) + (buffTotals['int_mod'] || 0);
  const wisDirectMod = (character?.abilities?.WIS?.directMod || 0) + (buffTotals['wis_mod'] || 0);
  const chaDirectMod = (character?.abilities?.CHA?.directMod || 0) + (buffTotals['cha_mod'] || 0);

  // Final Effective Mod (used in attacks, checks, saves, spells, skills)
  const strMod = baseStrMod + strDirectMod;
  const dexMod = baseDexMod + dexDirectMod;
  const conMod = baseConMod + conDirectMod;
  const intMod = baseIntMod + intDirectMod;
  const wisMod = baseWisMod + wisDirectMod;
  const chaMod = baseChaMod + chaDirectMod;

  // Armor and Shields
  let armorBonusTotal = 0;
  let shieldBonusTotal = 0;
  let maxDexAllowance = 99;
  let armorCheckPenaltyTotal = 0;

  for (const item of (character?.armor || [])) {
    if (item.isEquipped) {
      if (item.type === 'Shield') {
        shieldBonusTotal += item.acBonus || 0;
      } else {
        armorBonusTotal += item.acBonus || 0;
      }
      if (item.maxDex !== undefined && item.maxDex < maxDexAllowance) {
        maxDexAllowance = item.maxDex;
      }
      armorCheckPenaltyTotal += item.checkPenalty || 0;
    }
  }

  const effectiveDexModForAC = cond.losesDexToAC ? 0 : Math.min(dexMod, maxDexAllowance);

  // Size Modifiers
  const sizeInfo = SIZE_MODIFIERS[character?.size || 'Medium'] || SIZE_MODIFIERS.Medium;
  const sizeMod = sizeInfo.acAndAttack;

  // Dodge bonus (haste adds +1 dodge)
  const dodgeBonus = (character?.dodgeMod || 0) + (character?.conditions?.haste ? 1 : 0);

  // User Specification 1:
  // "AC: ac is ac bonus + Dex asb + 10 + miscellaneous other bonuses"
  // "Flat footed is the same without the dex bonus and touch is the same without the armor bonus"
  const totalArmorBonus = armorBonusTotal + shieldBonusTotal + (character?.naturalArmorMod || 0);
  // Dodge bonuses are kept for Touch AC but denied when Flat-Footed (matches user prompt: armor 5, dex +2, misc +2 (dodge) -> AC 19, Touch 14, FF 15)
  const totalAcMiscBonus = (character?.deflectionMod || 0) + dodgeBonus + (character?.acMiscMod || 0) + buffTotals.ac - cond.acPenalty + sizeMod;
  const flatFootedMiscBonus = (character?.deflectionMod || 0) + (character?.acMiscMod || 0) + buffTotals.ac - cond.acPenalty + sizeMod;

  const acTotal = 10 + totalArmorBonus + effectiveDexModForAC + totalAcMiscBonus;
  const touchAC = 10 + effectiveDexModForAC + totalAcMiscBonus;
  const flatFootedAC = 10 + totalArmorBonus + flatFootedMiscBonus;

  // Saves (incorporating BuffBox save bonuses)
  // User Specification 3: Fortitude:CON, will:WIS, reflex:DEX
  const fortBase = character.saves?.fortitude?.base ?? 0;
  const fortMagic = character.saves?.fortitude?.magicMod ?? 0;
  const fortMisc = character.saves?.fortitude?.miscMod ?? 0;
  const fortTemp = character.saves?.fortitude?.tempMod ?? 0;
  const fortitudeTotal =
    fortBase +
    conMod +
    fortMagic +
    fortMisc +
    fortTemp +
    buffTotals.fort -
    cond.savePenalty;

  const refBase = character.saves?.reflex?.base ?? 0;
  const refMagic = character.saves?.reflex?.magicMod ?? 0;
  const refMisc = character.saves?.reflex?.miscMod ?? 0;
  const refTemp = character.saves?.reflex?.tempMod ?? 0;
  const reflexTotal =
    refBase +
    dexMod +
    refMagic +
    refMisc +
    refTemp +
    buffTotals.ref +
    (character.conditions?.haste ? 1 : 0) -
    cond.savePenalty;

  const willBase = character.saves?.will?.base ?? 0;
  const willMagic = character.saves?.will?.magicMod ?? 0;
  const willMisc = character.saves?.will?.miscMod ?? 0;
  const willTemp = character.saves?.will?.tempMod ?? 0;
  const willTotal =
    willBase +
    wisMod +
    willMagic +
    willMisc +
    willTemp +
    buffTotals.will -
    cond.savePenalty;

  // Attack bonuses incorporating BuffBox Mattack and Rattack
  const meleeAttackBonusTotal =
    (character.baseAttackBonus || 0) + strMod + sizeMod + buffTotals.mattack - cond.attackPenalty;
  const rangedAttackBonusTotal =
    (character.baseAttackBonus || 0) + dexMod + sizeMod + buffTotals.rattack - cond.attackPenalty;

  // Initiative
  const initMisc = character.initMiscMod ?? 0;
  const initiativeTotal = dexMod + initMisc - (character.conditions?.deafened ? 4 : 0);

  // User Specification 2:
  // "CMB and CMD are scaled of BAB. BAB is provided by the player"
  // "CMB is STR+BAB+SIZE+Misc bonus (assume SIZE is the call for macros and the bonus is +0)"
  // "CMD is STR or DEX+BAB+10+SIZE+misc"
  const sizeBonusForMacro = 0; // SIZE bonus default +0
  const cmbMisc = character?.cmbMiscMod || 0;
  const cmdMisc = character?.cmdMiscMod ?? (character?.acMiscMod || 0);
  const bab = character?.baseAttackBonus || 0;
  const cmbTotal = strMod + bab + sizeBonusForMacro + cmbMisc + buffTotals.mattack - cond.attackPenalty;

  const cmdChoice = character?.cmdAbilityChoice || 'STR';
  const cmdAbilityMod = cmdChoice === 'DEX' ? dexMod : cmdChoice === 'BOTH' ? (strMod + dexMod) : strMod;
  const cmdTotal = 10 + bab + cmdAbilityMod + sizeBonusForMacro + cmdMisc + buffTotals.ac - cond.acPenalty;
  const cmdStrTotal = 10 + bab + strMod + sizeBonusForMacro + cmdMisc + buffTotals.ac - cond.acPenalty;
  const cmdDexTotal = 10 + bab + dexMod + sizeBonusForMacro + cmdMisc + buffTotals.ac - cond.acPenalty;
  const cmdFlatFooted = 10 + bab + strMod + sizeBonusForMacro + cmdMisc + buffTotals.ac - cond.acPenalty;

  // HP Breakdown Calculation:
  // [Total/Current HP] [THP] (#HD d Size + ConBonus(con_asb * level) + Additional Bonuses "Source")
  const calcMethod = character?.hpBreakdown?.calcMethod || 'average';
  const charLevel = character?.level || 1;
  const hdCount = character?.hpBreakdown?.hitDiceCount || charLevel;
  const dieSize = character?.hpBreakdown?.hitDiceSize || 10;

  let baseHitDiceHP = 0;
  if (calcMethod === 'average') {
    // Level 1 gets max dieSize. Subsequent levels get (dieSize / 2) + 1.
    const subsequentAverage = Math.floor(dieSize / 2) + 1;
    baseHitDiceHP = hdCount <= 1 ? dieSize : dieSize + (hdCount - 1) * subsequentAverage;
  } else if (calcMethod === 'max') {
    baseHitDiceHP = hdCount * dieSize;
  } else {
    // 'rolled' or manual custom roll
    baseHitDiceHP = character?.hpBreakdown?.hitDiceRolledBase || (dieSize + (hdCount - 1) * Math.floor(dieSize / 2));
  }

  const conHpBonus = conMod * charLevel;
  const additionalBonusesSum = (character?.hpBreakdown?.additionalBonuses || []).reduce(
    (acc, b) => acc + (b.amount || 0),
    0
  );
  const buffHpBonus = buffTotals.hp;
  const calculatedTotalMaxHP = Math.max(1, baseHitDiceHP + conHpBonus + additionalBonusesSum + buffHpBonus);
  const totalHpBonus = conHpBonus + additionalBonusesSum + buffHpBonus;
  const formulaNotation = `${calculatedTotalMaxHP} HP (${hdCount}d${dieSize}${totalHpBonus >= 0 ? `+${totalHpBonus}` : totalHpBonus}) ${calcMethod}`;

  // Skill Points calculation (Multistalt, Extra/Lvl, Bonus, and Manual Override)
  const spConfig = character?.skillPointsConfig;
  const effectiveIntMod = spConfig?.intOverride !== undefined ? spConfig.intOverride : intMod;
  const extraPerLvl = spConfig?.extraPerLevel ?? 0;
  const bonusFlat = spConfig?.bonusFlat ?? 0;
  const favoredBonus = character?.favoredClassSkillRanks ?? 0;

  let totalFromClasses = 0;
  if (character?.classes && character.classes.length > 0) {
    character.classes.forEach((cls) => {
      const spBase =
        spConfig?.classSpOverrides?.[cls.id] ??
        cls.skillPointsPerLevel ??
        character.classSkillPointsPerLevel ??
        2;
      const lvl = cls.level || 0;
      totalFromClasses += Math.max(1, spBase + effectiveIntMod) * lvl;
    });
  } else {
    const basePerLevel = character?.classSkillPointsPerLevel ?? 2;
    totalFromClasses = Math.max(1, basePerLevel + effectiveIntMod) * charLevel;
  }

  const calculatedMaxAfforded = totalFromClasses + extraPerLvl * charLevel + bonusFlat + favoredBonus;
  const maxAfforded =
    spConfig?.isManualOverride && spConfig?.manualOverride !== undefined
      ? spConfig.manualOverride
      : calculatedMaxAfforded;

  const totalSpent = (character?.skills || []).reduce((acc, s) => acc + (s.ranks || 0), 0);
  const remainingSkillPoints = maxAfforded - totalSpent;
  const isOverspent = remainingSkillPoints < 0;

  // Iterative Attacks (+BAB, +BAB-5, +BAB-10, +BAB-15)
  const iteratives: number[] = [];
  let babRemain = bab;
  while (babRemain > 0) {
    iteratives.push(babRemain);
    babRemain -= 5;
    if (iteratives.length >= 4) break;
  }
  if (iteratives.length === 0) iteratives.push(0);

  // Carrying Capacity based on STR
  const carryTableMaxLight = [
    0, 3, 6, 10, 13, 16, 20, 23, 26, 30, 33, 38, 43, 50, 58, 66, 76, 86, 100, 116, 133, 153, 173,
    200, 233, 266, 306, 346, 400, 466,
  ];
  const maxLightBase =
    strTotal < carryTableMaxLight.length ? carryTableMaxLight[Math.max(1, strTotal)] : 466 * Math.pow(4, Math.floor((strTotal - 29) / 10));

  const lightMax = Math.round(maxLightBase * sizeInfo.carryMult);
  const medMax = Math.round(lightMax * 2);
  const heavyMax = Math.round(lightMax * 3);

  // Calculate current weight
  let currentWeight = 0;
  for (const it of character.inventory || []) {
    const bagKey = (it.location || '').trim();
    const isDropped = character.droppedBags && bagKey && character.droppedBags[bagKey] === true;
    if (!isDropped && (it.storageType || 'worn') === 'worn') {
      currentWeight += (it.weight || 0) * (it.quantity || 1);
    }
  }
  for (const wp of character.weapons || []) {
    currentWeight += wp.weight || 0;
  }
  for (const ar of character.armor || []) {
    currentWeight += ar.weight || 0;
  }
  // Coins Weight (Optional feature: default 0.02 lbs each / 50 coins = 1 lb, adjustable)
  const totalCoins =
    (character.currency?.cp || 0) +
    (character.currency?.sp || 0) +
    (character.currency?.gp || 0) +
    (character.currency?.pp || 0);
  const includeCoinWeight = character.includeCoinWeight ?? false;
  const coinWeightRate = character.coinWeightRate ?? 0.02;
  if (includeCoinWeight) {
    currentWeight += Number((totalCoins * coinWeightRate).toFixed(2));
  }

  let loadStatus: 'Light' | 'Medium' | 'Heavy' | 'Overburdened' = 'Light';
  if (currentWeight > heavyMax) loadStatus = 'Overburdened';
  else if (currentWeight > medMax) loadStatus = 'Heavy';
  else if (currentWeight > lightMax) loadStatus = 'Medium';

  // HP Status derivation
  const effectiveMaxHP = character.hpTotalMax;
  const currentHP = character.hpCurrent;
  const nonlethal = character.hpNonlethal;
  const hpPercent = effectiveMaxHP > 0 ? Math.round((currentHP / effectiveMaxHP) * 100) : 0;

  let hpLabel = "Feelin' Fine";
  let hpColor = 'text-emerald-600 dark:text-emerald-400';

  if (currentHP <= -conTotal) {
    hpLabel = 'Dead';
    hpColor = 'text-red-700 dark:text-red-500 font-bold';
  } else if (currentHP < 0) {
    hpLabel = 'Dying';
    hpColor = 'text-red-600 dark:text-red-400 font-semibold';
  } else if (currentHP === 0 || nonlethal >= currentHP) {
    hpLabel = 'Disabled / Staggered';
    hpColor = 'text-amber-600 dark:text-amber-400 font-semibold';
  } else if (hpPercent <= 25) {
    hpLabel = 'Critical Wounds';
    hpColor = 'text-orange-600 dark:text-orange-400';
  } else if (hpPercent <= 50) {
    hpLabel = 'Bloodied';
    hpColor = 'text-yellow-600 dark:text-yellow-400';
  }

  const pointBuySpent = calculateTotalPointBuy(character);

  return {
    strTotal,
    dexTotal,
    conTotal,
    intTotal,
    wisTotal,
    chaTotal,
    strMod,
    dexMod,
    conMod,
    intMod,
    wisMod,
    chaMod,
    baseStrMod,
    strDirectMod,
    baseDexMod,
    dexDirectMod,
    baseConMod,
    conDirectMod,
    baseIntMod,
    intDirectMod,
    baseWisMod,
    wisDirectMod,
    baseChaMod,
    chaDirectMod,
    armorBonusTotal,
    shieldBonusTotal,
    totalArmorBonus,
    totalAcMiscBonus,
    maxDexAllowance,
    armorCheckPenaltyTotal,
    effectiveDexModForAC,
    acTotal,
    touchAC,
    flatFootedAC,
    fortitudeTotal,
    reflexTotal,
    willTotal,
    meleeAttackBonusTotal,
    rangedAttackBonusTotal,
    initiativeTotal,
    cmbTotal,
    cmdTotal,
    cmdStrTotal,
    cmdDexTotal,
    cmdChoice,
    cmdFlatFooted,
    iterativeAttacks: iteratives,
    buffTotals,
    hpBreakdownDetails: {
      calcMethod,
      dieSize,
      hdCount,
      baseHitDiceHP,
      conHpBonus,
      additionalBonusesSum,
      buffHpBonus,
      calculatedTotalMaxHP,
      formulaNotation,
    },
    skillPointsStats: {
      basePerLevel: character.classSkillPointsPerLevel ?? 2,
      intMod: effectiveIntMod,
      favoredBonus,
      extraPerLevel: extraPerLvl,
      bonusFlat,
      calculatedMaxAfforded,
      maxAfforded,
      totalSpent,
      remaining: remainingSkillPoints,
      isOverspent,
      isManualOverride: !!spConfig?.isManualOverride,
    },
    carryingCapacity: {
      light: lightMax,
      medium: medMax,
      heavy: heavyMax,
      overhead: heavyMax,
      offGround: heavyMax * 2,
      drag: heavyMax * 5,
      currentWeight,
      loadStatus,
    },
    hpStatus: {
      label: hpLabel,
      color: hpColor,
      percent: hpPercent,
    },
    pointBuySpent,
  };
}
