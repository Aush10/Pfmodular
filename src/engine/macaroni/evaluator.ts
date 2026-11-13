/**
 * Macaroni Evaluator: Executes symbolic verb-centric macros with single-purpose grammar
 * Includes full <^...> Buff-Making Parser ({col:row}, Stat.Type, ALLCAPS) & State Application
 */

import {
  PF1Character,
  UiMakePreset,
  BuffBonusType,
  BuffStatTarget,
  CustomBuffEffect,
} from '../../types/character';
import { executeDiceRoll } from '../formula';
import { tokenizeMacaroni } from './lexer';
import {
  MacaroniExecutionResult,
  MacaroniSlotResult,
  MacaroniQueryRequest,
  MacaroniQueryOption,
  MacaroniBuffMakeSpec,
} from './types';

export interface MacaroniExecutionContext {
  character: PF1Character;
  formulaContext: Record<string, any>;
  target?: Record<string, any>;
  companion?: Record<string, any>;
  thisValue?: number;
  stepCount?: number;
  uiPresets?: UiMakePreset[];
  depth?: number;
}

/**
 * 1-Indexed Column & Row Coordinate Maps for the 19x19 Buff Box Matrix
 */
export const BUFF_MATRIX_COLUMNS: BuffStatTarget[] = [
  'hp',       // 1
  'mattack',  // 2
  'rattack',  // 3
  'fort',     // 4
  'ref',      // 5
  'will',     // 6
  'ac',       // 7
  'str',      // 8
  'dex',      // 9
  'con',      // 10
  'int',      // 11
  'wis',      // 12
  'cha',      // 13
  'str_mod',  // 14
  'dex_mod',  // 15
  'con_mod',  // 16
  'int_mod',  // 17
  'wis_mod',  // 18
  'cha_mod',  // 19
];

export const BUFF_MATRIX_ROWS: BuffBonusType[] = [
  'Untyped',        // 1
  'Enhancement',    // 2
  'Circumstance',   // 3
  'Competence',     // 4
  'Deflection',     // 5
  'Dodge',          // 6
  'Insight',        // 7
  'Item',           // 8
  'Inherent',       // 9
  'Luck',           // 10
  'Morale',         // 11
  'Pro/Sac',        // 12
  'Race',           // 13
  'NAT armor',      // 14
  'Armor',          // 15
  'Level advance',  // 16
  'Shield',         // 17
  'Size',           // 18
  'Alt size',       // 19
];

const QUIRKY_BUFF_MESSAGES = [
  'Extra sharp cheddar applied to your character sheet!',
  'Nethys nods approvingly at this mathematical cheese.',
  'Golarion physics bent by +100% pure Macaroni power.',
  'The GM squints suspiciously at your Armor Class...',
  'Pathfinder math: where 19 bonus types walk into a tavern.',
  'Buff simmering nicely! Stir occasionally to prevent dispelling.',
  'Certified 100% organic Pathfinder 1e Gouda.',
  'By Cayden Cailean’s tankard, those numbers just went up!',
];

const QUIRKY_DEBUFF_MESSAGES = [
  'Oof, someone stepped in cursed dungeon fondue.',
  'A tragic penalty! Even your dice look slightly apologetic.',
  'Debuff applied. Time to blame the rogue for triggering the trap.',
  'Shaken, stirred, and mathematically penalized.',
];

const QUIRKY_ROLL_MESSAGES = [
  'The polyhedrals have spoken!',
  'Rolled with extra parmesan and zero remorse.',
  'May Desna smile upon this arithmetic.',
  'Crunching numbers faster than a Barbarian with Power Attack.',
];

export function pickQuirkyMessage(kind: 'buff' | 'debuff' | 'roll' | 'locked' | 'toggled_off'): string {
  if (kind === 'locked') {
    return 'Locked with $ — already simmering in the pot! No double-stacking cheese allowed.';
  }
  if (kind === 'toggled_off') {
    return 'Buff toggled OFF — the arcane cheese has cooled down.';
  }
  const pool =
    kind === 'buff'
      ? QUIRKY_BUFF_MESSAGES
      : kind === 'debuff'
      ? QUIRKY_DEBUFF_MESSAGES
      : QUIRKY_ROLL_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const DEFAULT_UI_PRESETS: UiMakePreset[] = [
  {
    tag: 1,
    name: 'Default Tabletop Alert',
    layout: 'floating_card',
    font: 'serif',
    theme: 'default_amber',
    soundCue: 'bell',
  },
  {
    tag: 11,
    name: 'Dragonfire Critical',
    layout: 'floating_card',
    font: 'gothic',
    theme: 'crimson_gold',
    soundCue: 'critical',
  },
  {
    tag: 20,
    name: 'Natural 20 Fanfare',
    layout: 'banner',
    font: 'serif',
    theme: 'celestial_cyan',
    soundCue: 'fanfare',
  },
  {
    tag: 13,
    name: 'Necrotic Decay',
    layout: 'toast',
    font: 'mono',
    theme: 'necrotic_slate',
    soundCue: 'whisper',
  },
];

/**
 * Resolves a Stat name or alias into a canonical BuffStatTarget
 */
export function resolveBuffStatTarget(rawStat: string): BuffStatTarget | null {
  const clean = rawStat.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const map: Record<string, BuffStatTarget> = {
    hp: 'hp',
    health: 'hp',
    hitpoints: 'hp',
    mattack: 'mattack',
    melee: 'mattack',
    meleeattack: 'mattack',
    atk: 'mattack',
    attack: 'mattack',
    rattack: 'rattack',
    ranged: 'rattack',
    rangedattack: 'rattack',
    fort: 'fort',
    fortitude: 'fort',
    ref: 'ref',
    reflex: 'ref',
    will: 'will',
    willsave: 'will',
    ac: 'ac',
    armorclass: 'ac',
    str: 'str',
    strength: 'str',
    dex: 'dex',
    dexterity: 'dex',
    con: 'con',
    constitution: 'con',
    int: 'int',
    intelligence: 'int',
    wis: 'wis',
    wisdom: 'wis',
    cha: 'cha',
    charisma: 'cha',
    strmod: 'str_mod',
    str_mod: 'str_mod',
    dexmod: 'dex_mod',
    dex_mod: 'dex_mod',
    conmod: 'con_mod',
    con_mod: 'con_mod',
    intmod: 'int_mod',
    int_mod: 'int_mod',
    wismod: 'wis_mod',
    wis_mod: 'wis_mod',
    chamod: 'cha_mod',
    cha_mod: 'cha_mod',
  };
  return map[clean] || null;
}

/**
 * Resolves a Bonus Type name or alias into a canonical BuffBonusType
 */
export function resolveBuffBonusType(rawType?: string): BuffBonusType {
  if (!rawType) return 'Untyped';
  const clean = rawType.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const map: Record<string, BuffBonusType> = {
    untyped: 'Untyped',
    enhancement: 'Enhancement',
    enhancment: 'Enhancement', // common user spelling
    enh: 'Enhancement',
    circumstance: 'Circumstance',
    circ: 'Circumstance',
    competence: 'Competence',
    comp: 'Competence',
    deflection: 'Deflection',
    defl: 'Deflection',
    dodge: 'Dodge',
    insight: 'Insight',
    item: 'Item',
    inherent: 'Inherent',
    luck: 'Luck',
    morale: 'Morale',
    prosac: 'Pro/Sac',
    profane: 'Pro/Sac',
    sacred: 'Pro/Sac',
    race: 'Race',
    racial: 'Race',
    natarmor: 'NAT armor',
    naturalarmor: 'NAT armor',
    natural: 'NAT armor',
    nat: 'NAT armor',
    armor: 'Armor',
    leveladvance: 'Level advance',
    level: 'Level advance',
    shield: 'Shield',
    size: 'Size',
    altsize: 'Alt size',
  };
  return map[clean] || 'Untyped';
}

/**
 * Parses a <^ ... > Buff-Making Construct supporting all 3 formats:
 * 1. Matrix Coordinates: {col:row}+val (e.g. {7:2}+4 or {7:1}+10)
 * 2. Shorthand Stat.BonusType: AC.Armor+4, AC+10, STR.Morale+4, CON.Morale+4
 * 3. Natural ALLCAPS phrase: ENHANCEMENTBONUSTOAC+4, UNTYPEDBONUSTOAC+10, DODGEBONUSTOAC+2
 */
export function parseMacaroniBuffMake(
  innerContent: string,
  macroName: string | undefined,
  isLockedOnce: boolean,
  ctx: MacaroniExecutionContext
): MacaroniBuffMakeSpec | null {
  const raw = `<^${innerContent}>`;
  const trimmed = innerContent.trim();
  if (!trimmed || trimmed === 'make_buff') {
    return {
      raw,
      name: macroName || 'Custom_Macaroni_Buff',
      isDirectMatrix: !macroName,
      isLockedOnce,
      category: isLockedOnce ? 'permanent' : 'activatable',
      bonusType: 'Untyped',
      values: { ac: 4 },
      matrixEntries: [{ col: 7, row: 1, stat: 'ac', bonusType: 'Untyped', value: 4 }],
      summaryText: `${macroName || 'Matrix[AC, Untyped]'}: +4 AC (Untyped)`,
    };
  }

  const pieces = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const matrixEntries: MacaroniBuffMakeSpec['matrixEntries'] = [];
  const values: Partial<Record<BuffStatTarget, number>> = {};
  let primaryBonusType: BuffBonusType = 'Untyped';
  let hasBonusTypeSet = false;

  for (const piece of pieces) {
    // Format 1: {col:row}+val or {col:row}-val
    const coordMatch = piece.match(/^\{(\d+)\s*:\s*(\d+)\}\s*([+-]?\s*(?:\[[^\]]+\]|\d+))/);
    if (coordMatch) {
      const colNum = Math.max(1, Math.min(19, parseInt(coordMatch[1], 10)));
      const rowNum = Math.max(1, Math.min(19, parseInt(coordMatch[2], 10)));
      const rawValStr = coordMatch[3].replace(/\s+/g, '');
      let numVal = 0;
      if (rawValStr.includes('[')) {
        const b = evaluateBracketContent(rawValStr.replace(/[[\]]/g, ''), ctx);
        numVal = evaluatePureMath(b.text);
      } else {
        numVal = parseInt(rawValStr, 10) || 0;
      }

      const stat = BUFF_MATRIX_COLUMNS[colNum - 1] || 'ac';
      const bonusType = BUFF_MATRIX_ROWS[rowNum - 1] || 'Untyped';
      if (!hasBonusTypeSet) {
        primaryBonusType = bonusType;
        hasBonusTypeSet = true;
      }
      values[stat] = (values[stat] || 0) + numVal;
      matrixEntries.push({ col: colNum, row: rowNum, stat, bonusType, value: numVal });
      continue;
    }

    // Format 3: Natural ALLCAPS phrase e.g. ENHANCEMENTBONUSTOAC+4, UNTYPEDBONUSTOAC+10, DODGEBONUSTOAC+2
    const phraseMatch = piece.match(/^([A-Za-z_]+?)(?:BONUS|PENALTY)?TO([A-Za-z_]+?)\s*([+-]\s*\d+)$/i);
    if (phraseMatch) {
      const bType = resolveBuffBonusType(phraseMatch[1]);
      const stat = resolveBuffStatTarget(phraseMatch[2]) || 'ac';
      const numVal = parseInt(phraseMatch[3].replace(/\s+/g, ''), 10) || 0;
      const colNum = BUFF_MATRIX_COLUMNS.indexOf(stat) + 1;
      const rowNum = BUFF_MATRIX_ROWS.indexOf(bType) + 1;
      if (!hasBonusTypeSet) {
        primaryBonusType = bType;
        hasBonusTypeSet = true;
      }
      values[stat] = (values[stat] || 0) + numVal;
      matrixEntries.push({ col: colNum, row: rowNum, stat, bonusType: bType, value: numVal });
      continue;
    }

    // Format 2: Stat.BonusType+val or Stat+val (e.g. AC.Armor+4, AC+10, STR.Morale+4, WILL-2)
    const statDotMatch = piece.match(/^([A-Za-z_]+)(?:\.([A-Za-z_ /]+))?\s*([+-]\s*(?:\[[^\]]+\]|\d+))$/);
    if (statDotMatch) {
      const stat = resolveBuffStatTarget(statDotMatch[1]);
      if (stat) {
        const bType = statDotMatch[2] ? resolveBuffBonusType(statDotMatch[2]) : primaryBonusType;
        const rawValStr = statDotMatch[3].replace(/\s+/g, '');
        let numVal = 0;
        if (rawValStr.includes('[')) {
          const sign = rawValStr.startsWith('-') ? -1 : 1;
          const b = evaluateBracketContent(rawValStr.replace(/^[+-]?\[|\]$/g, ''), ctx);
          numVal = sign * evaluatePureMath(b.text);
        } else {
          numVal = parseInt(rawValStr, 10) || 0;
        }
        const colNum = BUFF_MATRIX_COLUMNS.indexOf(stat) + 1;
        const rowNum = BUFF_MATRIX_ROWS.indexOf(bType) + 1;
        if (!hasBonusTypeSet && statDotMatch[2]) {
          primaryBonusType = bType;
          hasBonusTypeSet = true;
        }
        values[stat] = (values[stat] || 0) + numVal;
        matrixEntries.push({ col: colNum, row: rowNum, stat, bonusType: bType, value: numVal });
        continue;
      }
    }
  }

  if (matrixEntries.length === 0) return null;

  // Determine category: if all values are negative -> 'debuff', else if locked with $ and permanent keyword -> 'permanent', else 'activatable'
  const allNegative = matrixEntries.every((e) => e.value < 0);
  const category: 'activatable' | 'permanent' | 'debuff' = allNegative
    ? 'debuff'
    : isLockedOnce && macroName && /dodge|feat|perm|trait|inherent/i.test(macroName)
    ? 'permanent'
    : 'activatable';

  const summaryParts = matrixEntries.map(
    (e) => `${e.stat.toUpperCase()} ${e.value >= 0 ? `+${e.value}` : e.value} (${e.bonusType})`
  );
  const targetLabel = macroName ? `${macroName}${isLockedOnce ? ' [$ Locked]' : ''}` : 'Base Matrix';

  return {
    raw,
    name: macroName || undefined,
    isDirectMatrix: !macroName,
    isLockedOnce,
    category,
    bonusType: primaryBonusType,
    values,
    matrixEntries,
    summaryText: `${targetLabel} ➜ ${summaryParts.join(', ')}`,
  };
}

/**
 * Applies Macaroni Buff-Make events and state mutations directly to a PF1Character
 * Returns the updated character and a live status summary string.
 */
export function applyMacaroniToCharacter(
  character: PF1Character,
  result: MacaroniExecutionResult
): {
  updatedCharacter: PF1Character;
  statusMessage: string;
  quirkyMessage: string;
  didMutate: boolean;
} {
  let nextChar = { ...character };
  const statusNotes: string[] = [];
  let quirkyKind: 'buff' | 'debuff' | 'roll' | 'locked' | 'toggled_off' = 'roll';
  let didMutate = false;

  // 1. Apply <^...> Buff Make Events
  if (result.buffMakeEvents && result.buffMakeEvents.length > 0) {
    for (const buffSpec of result.buffMakeEvents) {
      didMutate = true;
      if (buffSpec.isDirectMatrix || !buffSpec.name) {
        // Unnamed buff macro -> write directly into the 19-row base matrix
        const nextBuffBox = { ...(nextChar.buffBox || {}) } as PF1Character['buffBox'];
        for (const entry of buffSpec.matrixEntries) {
          const rowObj = { ...(nextBuffBox[entry.bonusType] || {}) };
          rowObj[entry.stat] = entry.value;
          nextBuffBox[entry.bonusType] = rowObj;
        }
        nextChar = { ...nextChar, buffBox: nextBuffBox };
        quirkyKind = buffSpec.category === 'debuff' ? 'debuff' : 'buff';
        statusNotes.push(`Direct Matrix Updated: ${buffSpec.summaryText}`);
      } else {
        // Named buff macro -> create, lock ($), or toggle in customBuffs
        const currentBuffs = [...(nextChar.customBuffs || [])];
        const existingIdx = currentBuffs.findIndex(
          (b) => b.name.toLowerCase() === buffSpec.name!.toLowerCase()
        );

        if (existingIdx >= 0) {
          const existing = currentBuffs[existingIdx];
          if (buffSpec.isLockedOnce && existing.isActive) {
            // $ locks it once when active
            quirkyKind = 'locked';
            statusNotes.push(`${existing.name} is already ACTIVE & locked ($)`);
          } else {
            const nextActive = buffSpec.isLockedOnce ? true : !existing.isActive;
            currentBuffs[existingIdx] = {
              ...existing,
              isActive: nextActive,
              bonusType: buffSpec.bonusType,
              category: buffSpec.category,
              values: buffSpec.values,
            };
            nextChar = { ...nextChar, customBuffs: currentBuffs };
            quirkyKind = nextActive
              ? buffSpec.category === 'debuff'
                ? 'debuff'
                : 'buff'
              : 'toggled_off';
            statusNotes.push(
              `${existing.name}: ${nextActive ? 'ACTIVATED' : 'DEACTIVATED'} (${Object.entries(
                buffSpec.values
              )
                .map(([k, v]) => `${k.toUpperCase()} ${(v || 0) >= 0 ? `+${v}` : v}`)
                .join(', ')})`
            );
          }
        } else {
          // Create new named buff in customBuffs
          const newBuff: CustomBuffEffect = {
            id: `mac-buff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: buffSpec.name,
            category: buffSpec.category,
            bonusType: buffSpec.bonusType,
            isActive: true,
            values: buffSpec.values,
            notes: `Created via Macaroni: ${buffSpec.raw}${buffSpec.isLockedOnce ? ' ($ Locked)' : ''}`,
          };
          nextChar = {
            ...nextChar,
            customBuffs: [newBuff, ...currentBuffs],
          };
          quirkyKind = buffSpec.category === 'debuff' ? 'debuff' : 'buff';
          statusNotes.push(`Created & Activated: ${buffSpec.summaryText}`);
        }
      }
    }
  }

  // 2. Apply stateMutations (from ^ mutators or >> remote pushes on @me)
  if (result.stateMutations && result.stateMutations.length > 0) {
    for (const mut of result.stateMutations) {
      const f = mut.field.toLowerCase();
      if (f === 'hp' || f === 'hp_current') {
        didMutate = true;
        const newHp = Math.min(nextChar.hpTotalMax, nextChar.hpCurrent + mut.delta);
        nextChar = { ...nextChar, hpCurrent: newHp };
        statusNotes.push(`HP ${mut.delta >= 0 ? `+${mut.delta}` : mut.delta} (Now ${newHp})`);
      } else if (f === 'thp' || f === 'temp_hp') {
        didMutate = true;
        const newThp = Math.max(0, (nextChar.hpTemp || 0) + mut.delta);
        nextChar = { ...nextChar, hpTemp: newThp };
        statusNotes.push(`Temp HP ${mut.delta >= 0 ? `+${mut.delta}` : mut.delta} (Now ${newThp})`);
      } else if (f === 'gp' || f === 'gold') {
        didMutate = true;
        const newGp = Math.max(0, (nextChar.currency?.gp || 0) + mut.delta);
        nextChar = {
          ...nextChar,
          currency: { ...nextChar.currency, gp: newGp },
        };
        statusNotes.push(`GP ${mut.delta >= 0 ? `+${mut.delta}` : mut.delta} (Now ${newGp} gp)`);
      }
    }
  }

  const quirkyMessage = pickQuirkyMessage(quirkyKind);
  const statusMessage =
    statusNotes.length > 0 ? statusNotes.join(' • ') : result.fullOutput || 'Macro executed';

  return {
    updatedCharacter: nextChar,
    statusMessage,
    quirkyMessage,
    didMutate,
  };
}

/**
 * Resolves a UI Make tag using exact match -> prefix greedy match -> default fallback
 */
export function resolveUiMakePreset(
  tagCandidate: number | undefined,
  presets: UiMakePreset[] = DEFAULT_UI_PRESETS
): UiMakePreset {
  const allPresets = presets.length > 0 ? presets : DEFAULT_UI_PRESETS;
  const defaultPreset = allPresets.find((p) => p.tag === 1) || allPresets[0] || DEFAULT_UI_PRESETS[0];

  if (tagCandidate === undefined || Number.isNaN(tagCandidate)) {
    return defaultPreset;
  }

  // 1. Exact match
  const exact = allPresets.find((p) => p.tag === tagCandidate);
  if (exact) return exact;

  // 2. Prefix greedy match: e.g. tag 112 matches 11
  const candidateStr = String(tagCandidate);
  let bestMatch: UiMakePreset | null = null;
  let bestMatchLen = 0;

  for (const preset of allPresets) {
    const pStr = String(preset.tag);
    if (candidateStr.startsWith(pStr) && pStr.length > bestMatchLen) {
      bestMatch = preset;
      bestMatchLen = pStr.length;
    }
  }

  if (bestMatch) return bestMatch;

  // 3. Fallback to default
  return defaultPreset;
}

/**
 * Evaluates pure math safely with functions and ceil division /+
 */
export function evaluatePureMath(expr: string): number {
  let s = expr.trim();
  if (!s) return 0;

  // Functions: floor, round, ceil, abs, sqrt
  s = s.replace(/(floor|round|ceil|abs|sqrt)\s*\(([^()]+)\)/gi, (_, fn, inner) => {
    const val = evaluatePureMath(inner);
    const f = fn.toLowerCase();
    if (f === 'floor') return String(Math.floor(val));
    if (f === 'round') return String(Math.round(val));
    if (f === 'ceil') return String(Math.ceil(val));
    if (f === 'abs') return String(Math.abs(val));
    if (f === 'sqrt') return String(Math.sqrt(val));
    return String(val);
  });

  // Min & Max
  s = s.replace(/(min|max)\s*\(([^,()]+),([^()]+)\)/gi, (_, fn, a, b) => {
    const vA = evaluatePureMath(a);
    const vB = evaluatePureMath(b);
    return String(fn.toLowerCase() === 'min' ? Math.min(vA, vB) : Math.max(vA, vB));
  });

  // Ceil division: /+
  s = s.replace(/(\d+)\s*\/\+\s*(\d+)/g, (_, a, b) => String(Math.ceil(parseInt(a, 10) / parseInt(b, 10))));

  const sanitized = s.replace(/[^0-9+\-*/().\s]/g, '');
  if (!sanitized.trim()) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const val = fn();
    return typeof val === 'number' && !Number.isNaN(val) ? val : 0;
  } catch {
    return 0;
  }
}

/**
 * Evaluates bracketed calculation [ ... ]
 */
function evaluateBracketContent(
  inner: string,
  ctx: MacaroniExecutionContext
): { text: string; diceOutcome?: any } {
  let text = inner.trim();

  // Resolve external scope calls: ~target[#AC] or ~target#AC
  text = text.replace(/~([a-zA-Z0-9_-]+)(?:\[#?([a-zA-Z0-9_]+)\]|#([a-zA-Z0-9_]+))/g, (_, targetScope, key1, key2) => {
    const fieldKey = (key1 || key2).toLowerCase();
    if (targetScope.toLowerCase() === 'target' && ctx.target) {
      return String(ctx.target[fieldKey] ?? ctx.target[`#${fieldKey}`] ?? 0);
    }
    if (targetScope.toLowerCase() === 'companion' && ctx.companion) {
      return String(ctx.companion[fieldKey] ?? ctx.companion[`#${fieldKey}`] ?? 0);
    }
    return '0';
  });

  // Resolve #CALLs inside brackets
  text = text.replace(/#\(([^)]+)\)|#([a-zA-Z0-9_]+(?:\.[0-9]+)?)/g, (_, bracketed, simple) => {
    const callName = (bracketed || simple).toLowerCase();
    // Check if indexed slot call: e.g. firebolt.1
    const dotIdx = callName.indexOf('.');
    if (dotIdx > 0) {
      const baseName = callName.slice(0, dotIdx);
      const slotNum = parseInt(callName.slice(dotIdx + 1), 10) || 1;
      const baseMacro = ctx.formulaContext[baseName] || ctx.formulaContext[`#${baseName}`];
      if (typeof baseMacro === 'string') {
        const subRes = executeMacaroni(baseMacro, { ...ctx, depth: (ctx.depth || 0) + 1 });
        const slot = subRes.slots.find((s) => s.slot === slotNum);
        return slot ? slot.evaluated : '0';
      }
    }
    if (callName in ctx.formulaContext) {
      const val = ctx.formulaContext[callName];
      if (typeof val === 'number') return String(val);
      if (typeof val === 'string') {
        const res = evaluateMathOnlyCall(val, ctx);
        return res;
      }
    }
    return '0';
  });

  // Resolve keyword this
  if (ctx.thisValue !== undefined) {
    text = text.replace(/\bthis\b/gi, String(ctx.thisValue));
  }

  // Handle stepper progression: e.g. 10-1! with stepCount
  const stepMatch = text.match(/(\d+)\s*([+-])\s*(\d+)\s*!/);
  if (stepMatch) {
    const base = parseInt(stepMatch[1], 10);
    const op = stepMatch[2];
    const stepDelta = parseInt(stepMatch[3], 10);
    const count = ctx.stepCount || 1;
    const effectiveVal = op === '-' ? base - (stepDelta * count) : base + (stepDelta * count);
    text = text.replace(stepMatch[0], String(effectiveVal));
  }

  // Handle DC+#STAT shorthand inside brackets
  text = text.replace(/\bDC\b/gi, () => {
    const lvl = Number(ctx.formulaContext.level || ctx.character.level || 1);
    return String(10 + Math.floor(lvl / 2));
  });

  // Handle dice in bracket: e.g. 1d20 + 17
  const hasDice = /\d*d\d+/i.test(text);
  if (hasDice) {
    const diceMatch = text.match(/([+-]?\s*\d*d\d+(?:[kKdD]\d+)?)/i);
    if (diceMatch) {
      const dice = diceMatch[1].trim();
      const withoutDice = text.replace(diceMatch[0], ' ');
      const cleanRemainder = withoutDice.replace(/[^0-9+\-*/().\s]/g, '').trim();
      let mod = 0;
      if (cleanRemainder && /[0-9]/.test(cleanRemainder)) {
        mod = evaluatePureMath(cleanRemainder);
      }
      const formula = `${dice.replace(/\s+/g, '')}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ''}`;
      const outcome = executeDiceRoll(formula);
      return { text: formula, diceOutcome: outcome };
    }
  }

  const numResult = evaluatePureMath(text);
  return { text: String(numResult) };
}

/**
 * Extracts math-only values from a macro, ignoring dialogues, flavor text, and prompts
 */
export function evaluateMathOnlyCall(formula: string, ctx: MacaroniExecutionContext): string {
  const withoutQuotes = formula.replace(/"[^"]*"|'[^']*'/g, '');
  const withoutAlerts = withoutQuotes.replace(/<[^>]*>/g, '');
  const tokens = tokenizeMacaroni(withoutAlerts);
  let mathStr = '';

  for (const tok of tokens) {
    if (tok.type === 'eval_bracket') {
      const bRes = evaluateBracketContent(tok.value, ctx);
      mathStr += ` ${bRes.text} `;
    } else if (tok.type === 'hash_call') {
      const key = tok.value.toLowerCase();
      const val = ctx.formulaContext[key] ?? ctx.formulaContext[`#${key}`];
      if (val !== undefined) mathStr += ` ${val} `;
    } else if (tok.type === 'dice' || tok.type === 'number' || tok.type === 'operator') {
      mathStr += ` ${tok.value} `;
    }
  }

  const trimmed = mathStr.trim();
  if (/\d*d\d+/i.test(trimmed)) {
    const b = evaluateBracketContent(trimmed, ctx);
    return b.text;
  }
  return trimmed ? String(evaluatePureMath(trimmed)) : '0';
}

/**
 * Splits by delimiter outside quotes and brackets
 */
function splitOutsideEnclosures(text: string, delimiter: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let quoteChar = '';
  let bracketDepth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === '"' || ch === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuote = false;
      }
    } else if (!inQuote) {
      if (ch === '[' || ch === '{' || ch === '<') bracketDepth++;
      else if (ch === ']' || ch === '}' || ch === '>') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (bracketDepth === 0 && text.substring(i, i + delimiter.length) === delimiter) {
        result.push(text.substring(start, i));
        start = i + delimiter.length;
        i += delimiter.length - 1;
      }
    }
  }
  result.push(text.substring(start));
  return result;
}

/**
 * Main Macaroni Macro Execution Engine
 */
export function executeMacaroni(
  expression: string,
  ctx: MacaroniExecutionContext
): MacaroniExecutionResult {
  const depth = ctx.depth || 0;
  const tokens = tokenizeMacaroni(expression);

  if (depth > 6) {
    return {
      raw: expression,
      fullOutput: 'Error: circular reference detected',
      slots: [],
      isError: true,
      errorMessage: 'Circular reference limit (depth 6) exceeded',
      tokens,
      rollable: false,
    };
  }

  if (!expression || !expression.trim()) {
    return {
      raw: expression,
      fullOutput: '',
      slots: [],
      isError: false,
      tokens: [],
      rollable: false,
    };
  }

  let formulaBody = expression.trim();

  // Strip label if "name: formula" (e.g. MageArmor:|<^{7:2}+4>|$)
  const nameColonMatch = formulaBody.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
  let macroIdentifier = '';
  if (nameColonMatch && !formulaBody.startsWith('"') && !formulaBody.startsWith('<')) {
    macroIdentifier = nameColonMatch[1];
    formulaBody = nameColonMatch[2].trim();
  }

  const alertEvents: Array<{ tag?: number; message: string; preset?: UiMakePreset }> = [];
  const buffMakeEvents: MacaroniBuffMakeSpec[] = [];
  const appliedPushes: string[] = [];
  const stateMutations: Array<{ field: string; delta: number; description: string }> = [];
  let queryEvent: MacaroniQueryRequest | undefined;
  let isFinished = false;

  // Check if the overall formula has a terminal $ lock (e.g. MageArmor:|<^{7:2}+4>|$)
  const hasTerminalDollarLock = /\|\s*\$\s*$/.test(formulaBody) || /\$\s*$/.test(formulaBody);

  // Check for this: formula binding
  if (macroIdentifier.toLowerCase() === 'this') {
    const parts = splitOutsideEnclosures(formulaBody, '|').map((s) => s.trim());
    const stepPart = parts[0] || '';
    const stepRes = evaluateBracketContent(stepPart, ctx);
    const currentVal = evaluatePureMath(stepRes.text);
    ctx.thisValue = currentVal;

    // Process pipe conditions: | this=0 | $
    for (let pIdx = 1; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      const condMatch = part.match(/^this\s*(=|<=|>=|<|>|==)\s*(-?\d+)/);
      if (condMatch) {
        const op = condMatch[1];
        const targetNum = parseInt(condMatch[2], 10);
        let condPass = false;
        if (op === '=' || op === '==') condPass = currentVal === targetNum;
        else if (op === '<=') condPass = currentVal <= targetNum;
        else if (op === '>=') condPass = currentVal >= targetNum;
        else if (op === '<') condPass = currentVal < targetNum;
        else if (op === '>') condPass = currentVal > targetNum;

        if (condPass && pIdx + 1 < parts.length) {
          const actionPart = parts[pIdx + 1];
          if (actionPart === '$') {
            isFinished = true;
          }
        }
      } else if (part === '$') {
        isFinished = true;
      }
    }

    return {
      raw: expression,
      fullOutput: isFinished ? `0 ($ finished)` : String(currentVal),
      slots: [{ slot: 1, raw: expression, evaluated: String(currentVal), isNumericOnly: true }],
      isError: false,
      tokens,
      rollable: false,
      isFinished,
      quirkyMessage: isFinished
        ? 'Countdown reached zero ($ finished) — buff has expired!'
        : `Stepper ticked! ${currentVal} rounds of cheesy goodness remain.`,
    };
  }

  // 1. Separate by & into multi-result slots (.1, .2, ...)
  const slotRawStrings = splitOutsideEnclosures(formulaBody, '&').map((s) => s.trim()).filter(Boolean);
  const slots: MacaroniSlotResult[] = [];

  for (let sIdx = 0; sIdx < slotRawStrings.length; sIdx++) {
    const slotStr = slotRawStrings[sIdx];
    let slotOutput = '';

    // Check if this slot is a pipe-wrapped buff make construct like |<^{7:2}+4>|$
    const pipeParts = splitOutsideEnclosures(slotStr, '|').map((s) => s.trim()).filter(Boolean);
    let activePart = pipeParts[0] || '';

    if (pipeParts.length > 1) {
      // If the first non-empty pipe part is a <^...> buff make, evaluate it directly and check for $ in remaining parts
      if (activePart.startsWith('<^')) {
        if (pipeParts.includes('$')) {
          isFinished = true;
        }
      } else {
        const primaryEval = evaluateMacaroniSegment(activePart, ctx, macroIdentifier, hasTerminalDollarLock);
        let conditionMet = false;

        for (let p = 1; p < pipeParts.length; p++) {
          const branch = pipeParts[p];
          if (/^\d+$/.test(branch)) {
            const expected = parseInt(branch, 10);
            const actualNum = evaluatePureMath(primaryEval.output);
            if (actualNum === expected && p + 1 < pipeParts.length) {
              conditionMet = true;
              activePart = `${primaryEval.output} ${pipeParts[p + 1]}`;
              break;
            }
          } else if (branch === '$') {
            isFinished = true;
          }
        }

        if (!conditionMet && !activePart.startsWith('<^')) {
          activePart = primaryEval.output;
        }
      }
    }

    const segmentOutcome = evaluateMacaroniSegment(
      activePart,
      ctx,
      macroIdentifier || undefined,
      hasTerminalDollarLock || isFinished
    );
    slotOutput = segmentOutcome.output;

    if (segmentOutcome.alerts) alertEvents.push(...segmentOutcome.alerts);
    if (segmentOutcome.buffs) buffMakeEvents.push(...segmentOutcome.buffs);
    if (segmentOutcome.pushes) appliedPushes.push(...segmentOutcome.pushes);
    if (segmentOutcome.mutations) stateMutations.push(...segmentOutcome.mutations);
    if (segmentOutcome.query) queryEvent = segmentOutcome.query;
    if (segmentOutcome.isFinished) isFinished = true;

    slots.push({
      slot: sIdx + 1,
      raw: slotStr,
      evaluated: slotOutput,
      isNumericOnly: !/[a-zA-Z]/.test(slotOutput) && !slotOutput.includes('"'),
      diceOutcome: segmentOutcome.diceOutcome,
    });
  }

  const fullOutput = slots.map((s) => s.evaluated).join(' & ');
  const quirkyKind =
    buffMakeEvents.length > 0
      ? buffMakeEvents[0].category === 'debuff'
        ? 'debuff'
        : 'buff'
      : 'roll';

  return {
    raw: expression,
    fullOutput,
    slots,
    isError: false,
    tokens,
    rollable: /d\d+/i.test(fullOutput),
    alertEvents: alertEvents.length ? alertEvents : undefined,
    buffMakeEvents: buffMakeEvents.length ? buffMakeEvents : undefined,
    queryEvent,
    appliedPushes: appliedPushes.length ? appliedPushes : undefined,
    stateMutations: stateMutations.length ? stateMutations : undefined,
    isFinished,
    quirkyMessage: pickQuirkyMessage(quirkyKind),
  };
}

/**
 * Evaluates a single Macaroni segment (one slot of an & multi-slot formula)
 */
function evaluateMacaroniSegment(
  seg: string,
  ctx: MacaroniExecutionContext,
  macroIdentifier?: string,
  isLockedOnce?: boolean
): {
  output: string;
  alerts?: Array<{ tag?: number; message: string; preset?: UiMakePreset }>;
  buffs?: MacaroniBuffMakeSpec[];
  pushes?: string[];
  mutations?: Array<{ field: string; delta: number; description: string }>;
  query?: MacaroniQueryRequest;
  diceOutcome?: any;
  isFinished?: boolean;
} {
  let text = seg.trim();
  const alerts: Array<{ tag?: number; message: string; preset?: UiMakePreset }> = [];
  const buffs: MacaroniBuffMakeSpec[] = [];
  const pushes: string[] = [];
  const mutations: Array<{ field: string; delta: number; description: string }> = [];
  let query: MacaroniQueryRequest | undefined;
  let isFinished = Boolean(isLockedOnce);
  let lastDiceOutcome: any = undefined;

  // 0. Process Buff-Make Constructs: <^{7:2}+4>, <^AC.Armor+4>, <^ENHANCEMENTBONUSTOAC+4>, <^>
  text = text.replace(/<\^\s*([^>]*)>/g, (_, inner) => {
    const parsedBuff = parseMacaroniBuffMake(inner, macroIdentifier, Boolean(isLockedOnce), ctx);
    if (parsedBuff) {
      buffs.push(parsedBuff);
      return `[Buff: ${parsedBuff.summaryText}]`;
    }
    return `[Buff Make]`;
  });

  // 1. Process UI Make Alerts: <11"message"> or <"message">
  text = text.replace(/<(\d*)\s*"([^"]*)">/g, (_, tagStr, message) => {
    const tag = tagStr ? parseInt(tagStr, 10) : undefined;
    const preset = resolveUiMakePreset(tag, ctx.uiPresets);
    alerts.push({ tag, message, preset });
    return `[Alert: "${message}"]`;
  });

  // 2. Process Interactive Query: <? "Prompt" | opt1 / opt2 / [] >
  const queryMatch = text.match(/<\?\s*(?:"([^"]*)")?\s*\|?\s*([^>]+)>/);
  if (queryMatch) {
    const promptTitle = queryMatch[1] || 'Macro Decision Required';
    const rawOptions = queryMatch[2].split('/').map((o) => o.trim()).filter(Boolean);
    const options: MacaroniQueryOption[] = rawOptions.map((opt) => {
      if (opt === '[]' || opt.toLowerCase() === '[custom]') {
        return { label: 'Custom Formula', value: 'custom', isCustomInput: true };
      }
      if (opt.startsWith('#')) {
        const statKey = opt.slice(1).toLowerCase();
        const statVal = String(ctx.formulaContext[statKey] ?? ctx.formulaContext[`#${statKey}`] ?? 0);
        return { label: `${opt} (${statVal})`, value: statVal, isStat: true };
      }
      return { label: opt, value: opt };
    });

    query = {
      id: `query-${Date.now()}`,
      prompt: promptTitle,
      options,
      onSelect: () => {},
    };
    text = text.replace(queryMatch[0], `[Query: "${promptTitle}"]`);
  }

  // 3. Process Listen / Pull: <<macro_name (Executes and pulls live output of another macro)
  text = text.replace(/<<([a-zA-Z0-9_.]+)/g, (_, pullName) => {
    const clean = pullName.toLowerCase();
    const dotIdx = clean.indexOf('.');
    const baseName = dotIdx > 0 ? clean.slice(0, dotIdx) : clean;
    const slotNum = dotIdx > 0 ? parseInt(clean.slice(dotIdx + 1), 10) || 1 : undefined;

    const targetFormula =
      ctx.formulaContext[baseName] ??
      ctx.character?.customObjects?.find((o) => o.name.toLowerCase() === baseName)?.formula;

    if (typeof targetFormula === 'string') {
      const subRes = executeMacaroni(targetFormula, { ...ctx, depth: (ctx.depth || 0) + 1 });
      if (slotNum !== undefined) {
        const foundSlot = subRes.slots.find((s) => s.slot === slotNum);
        return foundSlot ? foundSlot.evaluated : subRes.fullOutput;
      }
      return subRes.fullOutput;
    }
    if (typeof targetFormula === 'number') {
      return String(targetFormula);
    }
    return `[<<${pullName}]`;
  });

  // 4. Process Send Pushes: >>target, >>HP-5, >>THP+10
  text = text.replace(/>>([~A-Za-z0-9_]+(?:\^[A-Za-z0-9_]+)?)(?:\s*([+-]\s*\d+))?/g, (_, target, delta) => {
    const cleanDelta = delta ? delta.replace(/\s+/g, '') : '';
    const numDelta = cleanDelta ? parseInt(cleanDelta, 10) || 0 : 0;
    pushes.push(`Send ${cleanDelta || 'result'} to ${target}`);
    if (numDelta !== 0) {
      mutations.push({
        field: target.replace(/^~/, ''),
        delta: numDelta,
        description: `>>${target}${cleanDelta}`,
      });
    }
    return `[Sent ${cleanDelta} ➜ ${target}]`;
  });

  // 5. Process Delta Mutators: HP^-d6, HP^+10, or ^-d6
  text = text.replace(/([a-zA-Z_][a-zA-Z0-9_]*)?\^([+-]?[0-9a-zA-Z_]+)/g, (_, fieldName, deltaExpr) => {
    const targetField = fieldName || 'HP';
    let resolvedDelta = 0;
    let rollDesc = deltaExpr;

    if (/\d*d\d+/i.test(deltaExpr)) {
      const sign = deltaExpr.startsWith('-') ? -1 : 1;
      const cleanDice = deltaExpr.replace(/^[+-]/, '');
      const rolled = executeDiceRoll(cleanDice);
      resolvedDelta = sign * rolled.total;
      rollDesc = `${resolvedDelta} (${cleanDice}=[${rolled.rolls.join(',')}])`;
    } else {
      resolvedDelta = parseInt(deltaExpr, 10) || 0;
    }

    const desc = `${targetField} ${resolvedDelta >= 0 ? `+${resolvedDelta}` : resolvedDelta}`;
    pushes.push(`Mutate ${desc}`);
    mutations.push({
      field: targetField,
      delta: resolvedDelta,
      description: desc,
    });
    return `[${targetField}^${rollDesc}]`;
  });

  // 6. Process Terminal $
  if (text.includes('$')) {
    isFinished = true;
    text = text.replace(/\$/g, '').trim();
  }

  // 7. Process Math-Only Calls: {firebreath}
  text = text.replace(/\{([^{}]+)\}/g, (_, name) => {
    const clean = name.trim().toLowerCase();
    const formula = ctx.formulaContext[clean] ?? ctx.formulaContext[`#${clean}`];
    if (typeof formula === 'string') {
      return evaluateMathOnlyCall(formula, ctx);
    }
    return String(formula ?? '0');
  });

  // 8. Process Evaluate Brackets: [1d4 + #STR]
  text = text.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const res = evaluateBracketContent(inner, ctx);
    if (res.diceOutcome) lastDiceOutcome = res.diceOutcome;
    return res.text;
  });

  // 9. Process Raw #CALLs outside brackets
  text = text.replace(/#\(([^)]+)\)|#([a-zA-Z0-9_]+(?:\.[0-9]+)?)/g, (_, b, s) => {
    const callName = (b || s).toLowerCase();
    const dotIdx = callName.indexOf('.');
    if (dotIdx > 0) {
      const baseName = callName.slice(0, dotIdx);
      const slotNum = parseInt(callName.slice(dotIdx + 1), 10) || 1;
      const baseMacro = ctx.formulaContext[baseName] ?? ctx.formulaContext[`#${baseName}`];
      if (typeof baseMacro === 'string') {
        const subRes = executeMacaroni(baseMacro, { ...ctx, depth: (ctx.depth || 0) + 1 });
        const slot = subRes.slots.find((sl) => sl.slot === slotNum);
        return slot ? slot.evaluated : '0';
      }
    }
    const val = ctx.formulaContext[callName] ?? ctx.formulaContext[`#${callName}`];
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') {
      return evaluateMathOnlyCall(val, ctx);
    }
    return '0';
  });

  const cleaned = text
    .replace(/"([^"]*)"/g, '$1')
    .replace(/\+\s*\+/g, '+')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    output: cleaned,
    alerts: alerts.length ? alerts : undefined,
    buffs: buffs.length ? buffs : undefined,
    pushes: pushes.length ? pushes : undefined,
    mutations: mutations.length ? mutations : undefined,
    query,
    diceOutcome: lastDiceOutcome,
    isFinished,
  };
}
