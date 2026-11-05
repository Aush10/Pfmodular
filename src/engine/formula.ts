/**
 * Pathfinder 1e Player-Friendly Formula and Object Expression Engine
 * Supports:
 * - Built-in stats: level, bab, str_mod, dex_mod, con_mod, int_mod, wis_mod, cha_mod, ac, hp_max, etc.
 * - Dice notation: 1d6, 2d8, 3d6+5, 4d6k3 (drop lowest)
 * - Math functions: floor, round, ceil, min, max, abs, sqrt
 * - Ability DC: DC+#CON, DC+CON (10 + 1/2 level + mod)
 * - String literals: " fire", " slashing", " to hit "
 * - String concatenation: mainattack + " and " + firebreath
 * - Dynamic macro calls: firebreath, #firebreath, {firebreath}, <<firebreath, @firebreath
 * - Multiple pipeline rolls: attack | damage
 * - Syntax highlighting & live dice rolling
 */

import { PF1Character } from '../types/character';

export interface EvaluatedResult {
  raw: string;
  evaluated: string;
  isError: boolean;
  errorMessage?: string;
  tokens: FormulaToken[];
  rollable?: boolean;
}

export type TokenType =
  | 'dice'
  | 'number'
  | 'operator'
  | 'function'
  | 'variable'
  | 'string'
  | 'punctuation'
  | 'text'
  | 'unknown';

export interface FormulaToken {
  type: TokenType;
  value: string;
}

/**
 * Builds an evaluation context dictionary from a PF1Character
 */
export function buildFormulaContext(
  character: PF1Character,
  activeConditionsModifier: { strPenalty: number; dexPenalty: number; attackPenalty: number },
  derivedCombatStats?: any
): Record<string, any> {
  const strScore = (character.abilities.STR.base + character.abilities.STR.raceMod + (character.abilities.STR.levelAsiMod || 0) + character.abilities.STR.enhMod + character.abilities.STR.miscMod + character.abilities.STR.tempMod) - activeConditionsModifier.strPenalty;
  const dexScore = (character.abilities.DEX.base + character.abilities.DEX.raceMod + (character.abilities.DEX.levelAsiMod || 0) + character.abilities.DEX.enhMod + character.abilities.DEX.miscMod + character.abilities.DEX.tempMod) - activeConditionsModifier.dexPenalty;
  const conScore = character.abilities.CON.base + character.abilities.CON.raceMod + (character.abilities.CON.levelAsiMod || 0) + character.abilities.CON.enhMod + character.abilities.CON.miscMod + character.abilities.CON.tempMod;
  const intScore = character.abilities.INT.base + character.abilities.INT.raceMod + (character.abilities.INT.levelAsiMod || 0) + character.abilities.INT.enhMod + character.abilities.INT.miscMod + character.abilities.INT.tempMod;
  const wisScore = character.abilities.WIS.base + character.abilities.WIS.raceMod + (character.abilities.WIS.levelAsiMod || 0) + character.abilities.WIS.enhMod + character.abilities.WIS.miscMod + character.abilities.WIS.tempMod;
  const chaScore = character.abilities.CHA.base + character.abilities.CHA.raceMod + (character.abilities.CHA.levelAsiMod || 0) + character.abilities.CHA.enhMod + character.abilities.CHA.miscMod + character.abilities.CHA.tempMod;

  const str_mod = derivedCombatStats?.strMod ?? Math.floor((strScore - 10) / 2);
  const dex_mod = derivedCombatStats?.dexMod ?? Math.floor((dexScore - 10) / 2);
  const con_mod = derivedCombatStats?.conMod ?? Math.floor((conScore - 10) / 2);
  const int_mod = derivedCombatStats?.intMod ?? Math.floor((intScore - 10) / 2);
  const wis_mod = derivedCombatStats?.wisMod ?? Math.floor((wisScore - 10) / 2);
  const cha_mod = derivedCombatStats?.chaMod ?? Math.floor((chaScore - 10) / 2);

  const context: Record<string, any> = {
    // Standard variables
    level: character.level,
    lvl: character.level,
    bab: character.baseAttackBonus,
    cl: character.casterLevel,
    casterlevel: character.casterLevel,

    // Ability modifiers (primary in PF1e check, attack, and damage math)
    str: str_mod,
    str_mod,
    strmod: str_mod,
    dex: dex_mod,
    dex_mod,
    dexmod: dex_mod,
    con: con_mod,
    con_mod,
    conmod: con_mod,
    int: int_mod,
    int_mod,
    intmod: int_mod,
    wis: wis_mod,
    wis_mod,
    wismod: wis_mod,
    cha: cha_mod,
    cha_mod,
    chamod: cha_mod,

    // Ability scores (for raw attributes, point buy, and carry capacity)
    str_score: strScore,
    strength: strScore,
    dex_score: dexScore,
    dexterity: dexScore,
    con_score: conScore,
    constitution: conScore,
    int_score: intScore,
    intelligence: intScore,
    wis_score: wisScore,
    wisdom: wisScore,
    cha_score: chaScore,
    charisma: chaScore,

    // Health
    hp_current: character.hpCurrent,
    hp_max: character.hpTotalMax,
    hp: character.hpCurrent,
    maxhp: character.hpTotalMax,
    hpmax: character.hpTotalMax,
    thp: character.hpTemp,
    temp_hp: character.hpTemp,

    // Defenses
    ac: derivedCombatStats?.acTotal ?? 10,
    touch: derivedCombatStats?.touchAC ?? 10,
    flat: derivedCombatStats?.flatFootedAC ?? 10,
    flatfooted: derivedCombatStats?.flatFootedAC ?? 10,
    ff: derivedCombatStats?.flatFootedAC ?? 10,

    // Saving throws
    fort: derivedCombatStats?.fortitudeTotal ?? (con_mod + (character.saves?.fortitude?.base ?? 0)),
    ref: derivedCombatStats?.reflexTotal ?? (dex_mod + (character.saves?.reflex?.base ?? 0)),
    will: derivedCombatStats?.willTotal ?? (wis_mod + (character.saves?.will?.base ?? 0)),
    fortitude: derivedCombatStats?.fortitudeTotal ?? (con_mod + (character.saves?.fortitude?.base ?? 0)),
    reflex: derivedCombatStats?.reflexTotal ?? (dex_mod + (character.saves?.reflex?.base ?? 0)),

    // Initiative & Combat Maneuvers
    init: derivedCombatStats?.initiativeTotal ?? (dex_mod + (character.initMiscMod || 0)),
    initiative: derivedCombatStats?.initiativeTotal ?? (dex_mod + (character.initMiscMod || 0)),
    cmb: derivedCombatStats?.cmbTotal ?? (character.baseAttackBonus + str_mod),
    cmd: derivedCombatStats?.cmdTotal ?? (10 + character.baseAttackBonus + str_mod),
    size: 0,
    misc: 0,

    mattack: derivedCombatStats?.meleeAttackBonusTotal ?? (character.baseAttackBonus + str_mod),
    rattack: derivedCombatStats?.rangedAttackBonusTotal ?? (character.baseAttackBonus + dex_mod),
    speed: character.speedBase || 30,
    sr: character.spellResistance || 0,
    gp: character.currency?.gp || 0,
    pp: character.currency?.pp || 0,
    sp: character.currency?.sp || 0,
    cp: character.currency?.cp || 0,
  };

  // Mirror all keys in uppercase, and with # and @ prefixes
  const initialKeys = Object.keys(context);
  for (const k of initialKeys) {
    const val = context[k];
    context[`#${k}`] = val;
    context[`@${k}`] = val;
    context[k.toUpperCase()] = val;
    context[`#${k.toUpperCase()}`] = val;
    context[`@${k.toUpperCase()}`] = val;
  }

  // Populate skills bonus: e.g. perception, #perception, stealth, #stealth
  if (character.skills) {
    for (const skill of character.skills) {
      if (skill.name) {
        const isClassBonus = skill.isClassSkill && skill.ranks > 0 ? 3 : 0;
        let abMod = 0;
        switch (skill.keyAbility) {
          case 'STR': abMod = str_mod; break;
          case 'DEX': abMod = dex_mod; break;
          case 'CON': abMod = con_mod; break;
          case 'INT': abMod = int_mod; break;
          case 'WIS': abMod = wis_mod; break;
          case 'CHA': abMod = cha_mod; break;
        }
        const totalBonus = skill.ranks + abMod + (skill.miscMod || 0) + isClassBonus;
        const cleanName = skill.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        context[cleanName] = totalBonus;
        context[`#${cleanName}`] = totalBonus;
        context[`@${cleanName}`] = totalBonus;
        context[cleanName.toUpperCase()] = totalBonus;
        context[`#${cleanName.toUpperCase()}`] = totalBonus;
      }
    }
  }

  // Add custom user objects into context
  if (character.customObjects) {
    for (const obj of character.customObjects) {
      if (obj.name) {
        const cleanName = obj.name.toLowerCase().trim();
        context[cleanName] = obj.formula;
        context[`#${cleanName}`] = obj.formula;
        context[`@${cleanName}`] = obj.formula;
        context[`<<${cleanName}`] = obj.formula;
        context[`{${cleanName}}`] = obj.formula;
      }
    }
  }

  // Add saved XDX macros into context
  if (character.xdxMacros) {
    for (const m of character.xdxMacros) {
      if (m.name) {
        const cleanName = m.name.toLowerCase().trim();
        if (!(cleanName in context)) {
          context[cleanName] = m.formula;
          context[`#${cleanName}`] = m.formula;
          context[`@${cleanName}`] = m.formula;
          context[`<<${cleanName}`] = m.formula;
          context[`{${cleanName}}`] = m.formula;
        }
      }
    }
  }

  // Add resource trackers into context (e.g. {smite}, #smite, SMITE)
  if (character.resourceTrackers) {
    for (const res of character.resourceTrackers) {
      if (res.name) {
        const cleanName = res.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        context[cleanName] = res.current;
        context[`#${cleanName}`] = res.current;
        context[`@${cleanName}`] = res.current;
        context[`{${cleanName}}`] = res.current;
      }
      if (res.macroKey) {
        const cleanKey = res.macroKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
        context[cleanKey] = res.current;
        context[res.macroKey] = res.current;
        context[`#${cleanKey}`] = res.current;
        context[`@${cleanKey}`] = res.current;
        context[`{${cleanKey}}`] = res.current;
      }
    }
  }

  return context;
}

/**
 * Tokenizes a formula string for syntax highlighting and safe parsing
 */
export function tokenizeFormula(expression: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;
  const len = expression.length;

  while (i < len) {
    const ch = expression[i];

    // Skip whitespace but record it for formatting
    if (/\s/.test(ch)) {
      let ws = '';
      while (i < len && /\s/.test(expression[i])) {
        ws += expression[i];
        i++;
      }
      tokens.push({ type: 'text', value: ws });
      continue;
    }

    // String literals "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = quote;
      i++;
      while (i < len && expression[i] !== quote) {
        str += expression[i];
        i++;
      }
      if (i < len) {
        str += expression[i]; // closing quote
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Pull or curly call syntax: <<name, {name}, @{name}
    const macroCallMatch = expression.slice(i).match(/^([<{]{1,2}|@\{)([a-zA-Z0-9_]+)([>}]*)/);
    if (macroCallMatch) {
      tokens.push({ type: 'variable', value: macroCallMatch[0] });
      i += macroCallMatch[0].length;
      continue;
    }

    // Grouped dice multiplication notation: e.g. 10(d6+5) or 10(2d6+3)
    const groupedDiceMatch = expression.slice(i).match(/^(\d+)\s*\(\s*([dD]\d+|\d+[dD]\d+)\s*([+-]\s*\d+)\s*\)/);
    if (groupedDiceMatch) {
      tokens.push({ type: 'dice', value: groupedDiceMatch[0] });
      i += groupedDiceMatch[0].length;
      continue;
    }

    // Dice notation: e.g. 2d6, 1d20, d8, 4d6k3 (keep highest 3)
    const diceMatch = expression.slice(i).match(/^(\d*d\d+(?:[kKdD]\d+)?)/i);
    if (diceMatch) {
      tokens.push({ type: 'dice', value: diceMatch[1] });
      i += diceMatch[1].length;
      continue;
    }

    // Numbers (integers or floats)
    const numMatch = expression.slice(i).match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[1] });
      i += numMatch[1].length;
      continue;
    }

    // Operators (+, -, *, /, %, ^, |, /+)
    const opMatch = expression.slice(i).match(/^(\/\+|[+\-*\/%^|])/);
    if (opMatch) {
      tokens.push({ type: 'operator', value: opMatch[1] });
      i += opMatch[1].length;
      continue;
    }

    // Punctuation: parentheses, colons, commas, brackets
    if (['(', ')', ',', ':', '[', ']', '{', '}'].includes(ch)) {
      tokens.push({ type: 'punctuation', value: ch });
      i++;
      continue;
    }

    // Identifiers (functions or variable names, including #macro, @macro syntax)
    const idMatch = expression.slice(i).match(/^([#@]?[a-zA-Z_][a-zA-Z0-9_]*)/);
    if (idMatch) {
      const id = idMatch[1];
      const lower = id.toLowerCase().replace(/^[#@]/, '');
      if (['floor', 'round', 'ceil', 'min', 'max', 'abs', 'sqrt', 'dc'].includes(lower)) {
        tokens.push({ type: 'function', value: id });
      } else {
        tokens.push({ type: 'variable', value: id });
      }
      i += id.length;
      continue;
    }

    // Fallback unknown character
    tokens.push({ type: 'unknown', value: ch });
    i++;
  }

  return tokens;
}

/**
 * Splits text by delimiter only outside of quotes
 */
function splitOutsideQuotes(text: string, delimiter: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let quoteChar = '';
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === '"' || ch === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuotes = false;
      }
    } else if (!inQuotes && text.substring(i, i + delimiter.length) === delimiter) {
      result.push(text.substring(start, i));
      start = i + delimiter.length;
      i += delimiter.length - 1;
    }
  }
  result.push(text.substring(start));
  return result;
}

/**
 * Pure math solver supporting basic arithmetic, power, functions, and ceil division /+
 */
function solvePureMath(expr: string): number {
  let s = expr.trim();
  if (!s) return 0;

  // Handle floor, round, ceil, abs, sqrt
  s = s.replace(/(floor|round|ceil|abs|sqrt)\s*\(([^()]+)\)/gi, (_, fn, inner) => {
    const val = solvePureMath(inner);
    const f = fn.toLowerCase();
    if (f === 'floor') return String(Math.floor(val));
    if (f === 'round') return String(Math.round(val));
    if (f === 'ceil') return String(Math.ceil(val));
    if (f === 'abs') return String(Math.abs(val));
    if (f === 'sqrt') return String(Math.sqrt(val));
    return String(val);
  });

  // Handle min(a, b) and max(a, b)
  s = s.replace(/(min|max)\s*\(([^,()]+),([^()]+)\)/gi, (_, fn, a, b) => {
    const vA = solvePureMath(a);
    const vB = solvePureMath(b);
    return String(fn.toLowerCase() === 'min' ? Math.min(vA, vB) : Math.max(vA, vB));
  });

  // Handle /+ as ceil division
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
 * Simplifies a single non-string chunk (math, dice, and DC formulas)
 */
function simplifyMathAndDiceSegment(expr: string, context: Record<string, any>): string {
  let text = expr.trim();
  if (!text) return '';

  // DC formula: DC or DC+#CON or DC+CON (10 + 1/2 level + mod)
  text = text.replace(/DC(?:\s*\+\s*#?([A-Za-z0-9_]+))?/gi, (_, arg) => {
    const level = Number(context['level'] || context['lvl']) || 1;
    const halfLevel = Math.floor(level / 2);
    let abMod = 0;
    if (arg) {
      if (/^\d+$/.test(arg)) {
        abMod = parseInt(arg, 10);
      } else {
        const lower = arg.toLowerCase();
        if (lower in context) abMod = Number(context[lower]) || 0;
      }
    }
    return String(10 + halfLevel + abMod);
  });

  // Math functions
  text = text.replace(/(floor|round|ceil|abs|sqrt)\s*\(([^()]+)\)/gi, (_, fn, inner) => {
    const val = solvePureMath(inner);
    const f = fn.toLowerCase();
    if (f === 'floor') return String(Math.floor(val));
    if (f === 'round') return String(Math.round(val));
    if (f === 'ceil') return String(Math.ceil(val));
    if (f === 'abs') return String(Math.abs(val));
    if (f === 'sqrt') return String(Math.sqrt(val));
    return String(val);
  });

  // Parenthesized math: e.g. (10 + 7) -> 17
  text = text.replace(/\(([^()a-zA-Z_]+)\)/g, (_, inner) => {
    return String(solvePureMath(inner));
  });

  // Check for dice
  const hasDice = /\d*d\d+/i.test(text);
  if (hasDice) {
    const diceMatch = text.match(/([+-]?\s*\d*d\d+(?:[kKdD]\d+)?)/i);
    if (diceMatch) {
      const dice = diceMatch[1].trim();
      const withoutDice = text.replace(diceMatch[0], ' ');
      const cleanRemainder = withoutDice.replace(/[^0-9+\-*/().\s]/g, '').trim();
      if (cleanRemainder && /[0-9]/.test(cleanRemainder)) {
        const mod = solvePureMath(cleanRemainder);
        return `${dice.replace(/\s+/g, '')}${mod >= 0 ? `+${mod}` : `${mod}`}`;
      }
      return dice.replace(/\s+/g, '');
    }
  }

  // Pure arithmetic
  const mathVal = solvePureMath(text);
  return String(mathVal);
}

/**
 * Resolves and evaluates an expression safely.
 * Allows math simplification while preserving dice formulas or combining text strings.
 */
export function evaluateFormula(
  expression: string,
  context: Record<string, any>,
  depth: number = 0
): EvaluatedResult {
  const tokens = tokenizeFormula(expression);

  if (depth > 6) {
    return {
      raw: expression,
      evaluated: 'Error: circular reference',
      isError: true,
      errorMessage: 'Circular reference detected',
      tokens,
    };
  }

  if (!expression || !expression.trim()) {
    return {
      raw: expression,
      evaluated: '',
      isError: false,
      tokens: [],
    };
  }

  let trimmed = expression.trim();

  // Strip formula label e.g. "mainattack: formula"
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0 && !trimmed.slice(0, colonIndex).includes('"') && !trimmed.slice(0, colonIndex).includes(' ')) {
    trimmed = trimmed.slice(colonIndex + 1).trim();
  }

  try {
    // 1. Handle pipeline execution with pipes | outside of quotes
    const pipeSegments = splitOutsideQuotes(trimmed, '|');
    if (pipeSegments.length > 1) {
      const evaluatedPipe = pipeSegments
        .map((s) => evaluateFormula(s.trim(), context, depth).evaluated)
        .join(' | ');
      return {
        raw: expression,
        evaluated: evaluatedPipe,
        isError: false,
        tokens,
        rollable: /d\d+/i.test(evaluatedPipe),
      };
    }

    // 2. Handle single macro pull: {var}, @{var}, <<var, #var, or var
    const singleVarMatch = trimmed.match(/^([<#@{]+)?([a-zA-Z0-9_]+)[>} ]*$/);
    if (singleVarMatch) {
      const varName = singleVarMatch[2].toLowerCase();
      if (varName in context) {
        const val = context[varName];
        if (typeof val === 'string') {
          return evaluateFormula(val, context, depth + 1);
        }
        return {
          raw: expression,
          evaluated: String(val),
          isError: false,
          tokens,
          rollable: false,
        };
      }
    }

    // 3. Extract strings and replace with placeholders
    const stringLiterals: string[] = [];
    const placeholderReplaced = trimmed.replace(/"([^"]*)"|'([^']*)'/g, (_, p1, p2) => {
      const str = p1 !== undefined ? p1 : p2;
      const idx = stringLiterals.length;
      stringLiterals.push(str);
      return ` __STR_${idx}__ `;
    });

    // 4. Substitute identifiers and macros in non-string parts
    let replaced = placeholderReplaced;

    // Replace {macro} or <<macro
    replaced = replaced.replace(/([<{]{1,2}|@\{)([a-zA-Z0-9_]+)([>}]*)/g, (_, _p, name) => {
      const lower = name.toLowerCase();
      if (lower in context) {
        const v = context[lower];
        if (typeof v === 'string') {
          const evalV = evaluateFormula(v, context, depth + 1).evaluated;
          const idx = stringLiterals.length;
          stringLiterals.push(evalV);
          return ` __STR_${idx}__ `;
        }
        return ` ${v} `;
      }
      return name;
    });

    // Replace standard identifiers
    replaced = replaced.replace(/([#@]?[a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
      const lower = match.toLowerCase();
      const unhashed = lower.replace(/^[#@]/, '');
      if (['floor', 'round', 'ceil', 'min', 'max', 'abs', 'sqrt', 'dc'].includes(lower)) {
        return match;
      }
      if (lower.startsWith('__str_')) {
        return match;
      }
      if (lower in context) {
        const v = context[lower];
        if (typeof v === 'string') {
          const evalV = evaluateFormula(v, context, depth + 1).evaluated;
          const idx = stringLiterals.length;
          stringLiterals.push(evalV);
          return ` __STR_${idx}__ `;
        }
        return ` ${v} `;
      }
      if (unhashed in context) {
        const v = context[unhashed];
        if (typeof v === 'string') {
          const evalV = evaluateFormula(v, context, depth + 1).evaluated;
          const idx = stringLiterals.length;
          stringLiterals.push(evalV);
          return ` __STR_${idx}__ `;
        }
        return ` ${v} `;
      }
      return match;
    });

    // 5. Split around __STR_i__ tokens and simplify each math/dice segment
    const chunks = replaced.split(/(__STR_\d+__)/g);
    let evaluatedOutput = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const strMatch = chunk.match(/^__STR_(\d+)__$/);
      if (strMatch) {
        const idx = parseInt(strMatch[1], 10);
        const strVal = stringLiterals[idx] ?? '';
        evaluatedOutput += strVal;
      } else {
        let cleanChunk = chunk.trim();
        if (!cleanChunk) continue;

        cleanChunk = cleanChunk.replace(/^\+\s*/, '').replace(/\s*\+$/, '').trim();
        if (cleanChunk) {
          const val = simplifyMathAndDiceSegment(cleanChunk, context);
          if (evaluatedOutput.endsWith('+') || evaluatedOutput.endsWith('-') || evaluatedOutput.endsWith('(')) {
            evaluatedOutput += val;
          } else if (!evaluatedOutput || evaluatedOutput.endsWith(' ') || val.startsWith(' ')) {
            evaluatedOutput += val;
          } else {
            evaluatedOutput += ` ${val}`;
          }
        }
      }
    }

    const finalOutput = evaluatedOutput
      .replace(/\+\s*\+/g, '+')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      raw: expression,
      evaluated: finalOutput,
      isError: false,
      tokens,
      rollable: /d\d+/i.test(finalOutput),
    };
  } catch (err: any) {
    return {
      raw: expression,
      evaluated: trimmed,
      isError: true,
      errorMessage: err?.message || 'Formula evaluation error',
      tokens,
    };
  }
}

/**
 * Rolls dice based on a formula like "2d6+10" or "1d20+14"
 */
export interface DiceRollOutcome {
  formula: string;
  total: number;
  rolls: Array<{ dice: string; values: number[]; sum: number }>;
  modifier: number;
  textOutput: string;
  isNat20?: boolean;
  isNat1?: boolean;
}

export function executeDiceRoll(formula: string): DiceRollOutcome {
  let total = 0;
  const rolls: Array<{ dice: string; values: number[]; sum: number }> = [];
  let modifier = 0;
  let isNat20 = false;
  let isNat1 = false;

  // Find all dice in the formula (including 4d6k3 drop lowest support)
  const diceRegex = /([+-]?\s*\d*)d(\d+)(?:[kKdD](\d+))?/gi;
  let match: RegExpExecArray | null;

  while ((match = diceRegex.exec(formula)) !== null) {
    const fullMatch = match[0];
    const sign = fullMatch.trim().startsWith('-') ? -1 : 1;
    const countStr = match[1].replace(/[+-]/g, '').trim();
    const count = countStr ? parseInt(countStr, 10) : 1;
    const sides = parseInt(match[2], 10);
    const keepCount = match[3] ? parseInt(match[3], 10) : count;

    const values: number[] = [];

    for (let c = 0; c < count; c++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      values.push(roll);

      if (sides === 20 && count === 1) {
        if (roll === 20) isNat20 = true;
        if (roll === 1) isNat1 = true;
      }
    }

    // If keep lowest / drop lowest specified
    let keptSum = 0;
    if (keepCount < count) {
      const sorted = [...values].sort((a, b) => b - a);
      keptSum = sorted.slice(0, keepCount).reduce((a, b) => a + b, 0);
    } else {
      keptSum = values.reduce((a, b) => a + b, 0);
    }

    rolls.push({
      dice: `${count}d${sides}`,
      values,
      sum: keptSum * sign,
    });

    total += keptSum * sign;
  }

  // Extract flat modifiers from outside dice expressions
  const withoutDice = formula.replace(/[+-]?\s*\d*d\d+(?:[kKdD]\d+)?/gi, '').replace(/[^0-9+\-.\s]/g, '');
  if (withoutDice.trim()) {
    try {
      modifier = solvePureMath(withoutDice);
      total += modifier;
    } catch {
      // modifier stays 0
    }
  }

  const breakdown = rolls
    .map((r) => `${r.dice} [${r.values.join(', ')}]`)
    .join(' + ');

  const textOutput = breakdown
    ? `${breakdown}${modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : ''} = ${total}`
    : String(modifier || total);

  return {
    formula,
    total,
    rolls,
    modifier,
    textOutput,
    isNat20,
    isNat1,
  };
}
