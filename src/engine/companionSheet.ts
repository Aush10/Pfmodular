/**
 * Deterministic complete-sheet tools for the AI companion.
 *
 * There is an AI companion module, but it has no tool-calling chat loop.
 * This module is the bounded tool layer: it reads a player message, writes
 * one canonical character, and always returns a reply. It does not call a
 * model and does not invent class features, archetypes, or point-buy budgets.
 *
 * Gaps (not full tool coverage):
 * - Live Gemini/other model turns are not invoked here, even if a session key exists.
 * - Macaroni state writes that the engine actually applies are HP, temporary HP, and GP.
 * - Archetype swaps come only from POPULAR_ARCHETYPES already in the sheet.
 * - Dice, decks, journals, images, and loadouts are not driven by this turn.
 */

import {
  AbilityName,
  AIModuleSettings,
  ArchetypeConfig,
  CareerProgressionData,
  CharacterClassEntry,
  CustomClassGrid,
  PF1Character,
} from '../types/character';
import { parseNaturalLanguageSheetUpdates, DEFAULT_AI_MODULE_SETTINGS } from './aiService';
import { buildFormulaContext } from './formula';
import { applyMacaroniToCharacter, executeMacaroni } from './macaroni';
import { POPULAR_ARCHETYPES } from './multiclassCalculator';
import { evaluateConditions, getPointBuyCost } from './pf1eMath';

const ABILITIES: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const HIT_DICE = new Set([4, 6, 8, 10, 12]);
const MACARONI_MUTATION_FIELDS = new Set(['hp', 'hp_current', 'thp', 'temp_hp', 'gp', 'gold']);

const SCALAR_FIELDS: Record<string, 'string' | 'number'> = {
  name: 'string',
  player: 'string',
  alignment: 'string',
  race: 'string',
  deity: 'string',
  gender: 'string',
  height: 'string',
  weight: 'string',
  eyes: 'string',
  hair: 'string',
  campaign: 'string',
  age: 'number',
  currentXP: 'number',
  nextLevelXP: 'number',
  heroPoints: 'number',
  hpCurrent: 'number',
  hpTotalMax: 'number',
  hpTemp: 'number',
  hpNonlethal: 'number',
  baseAttackBonus: 'number',
  casterLevel: 'number',
  speedBase: 'number',
  naturalArmorMod: 'number',
  deflectionMod: 'number',
  dodgeMod: 'number',
  acMiscMod: 'number',
  initMiscMod: 'number',
  spellResistance: 'number',
};

const SIZES: PF1Character['size'][] = [
  'Fine',
  'Diminutive',
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
  'Gargantuan',
  'Colossal',
];

export interface CompanionChange {
  field: string;
  summary: string;
}

export interface CompanionQuestion {
  topic: 'archetype' | 'point-buy-budget' | 'class-target' | 'source' | 'other';
  prompt: string;
}

export interface CompanionMacaroniReport {
  resolved: Array<{ call: string; value: string }>;
  unresolved: string[];
  ignoredMutations: string[];
  output: string;
}

export interface CompanionTurnResult {
  character: PF1Character;
  reply: string;
  changes: CompanionChange[];
  questions: CompanionQuestion[];
  errors: string[];
  usedLiveModel: false;
  macaroni?: CompanionMacaroniReport;
}

export interface PointBuyScores {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export type PointBuyDecision =
  | { ok: true; spent: number }
  | { ok: false; reason: string; spent?: number };

export interface ClassLevelResult {
  character: PF1Character;
  question?: string;
  changed: boolean;
}

export function companionCapabilityReport(): {
  liveModel: false;
  archetypeCatalog: string[];
  macaroniMutationFields: string[];
  modulesNotDrivenByThisTurn: string[];
} {
  return {
    liveModel: false,
    archetypeCatalog: POPULAR_ARCHETYPES.map((entry) => `${entry.name} (${entry.targetClassName})`),
    macaroniMutationFields: ['HP', 'temporary HP', 'GP'],
    modulesNotDrivenByThisTurn: [
      'dice tray',
      'deck',
      'journal images',
      'loadout',
      'image browser',
      'stepper rules',
    ],
  };
}

export function validatePointBuyAssignment(input: {
  scores: PointBuyScores;
  budget: number | undefined;
  asi?: Partial<Record<AbilityName, number>>;
  level?: number;
}): PointBuyDecision {
  if (input.budget === undefined || Number.isNaN(input.budget)) {
    return {
      ok: false,
      reason: 'No point-buy budget was provided. Scores were not applied. Name the budget and retry.',
    };
  }

  for (const ability of ABILITIES) {
    const score = input.scores[ability];
    if (!Number.isInteger(score) || score < 6 || score > 18) {
      return {
        ok: false,
        reason: `${ability} ${score} is outside the 6–18 point-buy table. Scores were not applied. Retry with a legal score.`,
      };
    }
  }

  const spent = pointBuySpent(input.scores);
  if (spent > input.budget) {
    return {
      ok: false,
      spent,
      reason: `These scores spend ${spent} and the budget is ${input.budget}. They were not applied. Lower a score and retry.`,
    };
  }

  if (input.asi) {
    const spentAsi = ABILITIES.reduce((sum, ability) => sum + (input.asi?.[ability] || 0), 0);
    const allowed = Math.floor((input.level ?? 1) / 4);
    if (spentAsi > allowed) {
      return {
        ok: false,
        spent,
        reason: `Level ASI spends ${spentAsi} and this level allows ${allowed}. Scores were not applied. Retry with fewer ability increases.`,
      };
    }
  }

  return { ok: true, spent };
}

export function assignRandomPointBuy(
  budget: number,
  rng: () => number = Math.random,
  options?: { maxAttempts?: number; propose?: () => PointBuyScores }
):
  | { ok: true; scores: PointBuyScores; rejected: number; attempts: number }
  | { ok: false; error: string; rejected: number } {
  const maxAttempts = options?.maxAttempts ?? 40;
  let rejected = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const scores = options?.propose ? options.propose() : spendPointBuy(budget, rng);
    const decision = validatePointBuyAssignment({ scores, budget, level: 1 });
    if (decision.ok) {
      return { ok: true, scores, rejected, attempts: attempt };
    }
    rejected += 1;
  }
  return {
    ok: false,
    rejected,
    error: `No legal score array was found within ${maxAttempts} attempts for a ${budget} point-buy budget. Nothing was applied.`,
  };
}

export function resolveClassGrids(character: PF1Character): Record<string, CustomClassGrid> {
  const classes = liveClasses(character);
  const stored = character.customClassGrids || {};
  const grids: Record<string, CustomClassGrid> = {};
  for (const entry of classes) {
    const storedEntry =
      Object.values(stored).find(
        (grid) => grid.id === entry.id || grid.className.toLowerCase() === entry.name.toLowerCase()
      ) || stored[entry.id];
    const id = entry.id || storedEntry?.id || 'class1';
    grids[id] = {
      id,
      className: entry.name,
      level: entry.level,
      hitDie: entry.hitDie,
      skillPointsPerLevel: entry.skillPointsPerLevel,
      proficiencies: storedEntry?.proficiencies || '',
      starterKitName: storedEntry?.starterKitName,
      rawText: storedEntry?.rawText || '',
      rows: storedEntry?.rows || [],
      classSkillsText: storedEntry?.classSkillsText,
      archetypeId: storedEntry?.archetypeId,
    };
  }
  return grids;
}

export function listUnlinkedClassGrids(character: PF1Character): CustomClassGrid[] {
  const linked = Object.values(resolveClassGrids(character));
  const linkedIds = new Set(linked.map((grid) => grid.id));
  const linkedNames = new Set(linked.map((grid) => grid.className.toLowerCase()));
  return Object.values(character.customClassGrids || {}).filter(
    (grid) => !linkedIds.has(grid.id) && !linkedNames.has(grid.className.toLowerCase())
  );
}

export function applySheetLevel(character: PF1Character, level: number): ClassLevelResult {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    return {
      character,
      changed: false,
      question: `Level ${level} is outside 1–20. I did not change the sheet.`,
    };
  }
  const classes = liveClasses(character);
  if (classes.length !== 1) {
    const summary = classes.map((entry) => `${entry.name} ${entry.level}`).join(', ');
    return {
      character,
      changed: false,
      question: `Which class should change so the total becomes ${level}? Current classes: ${summary}.`,
    };
  }
  return {
    character: writeClass(character, { ...classes[0], level }),
    changed: true,
  };
}

export function applyHitDieSize(
  character: PF1Character,
  hitDie: number,
  className?: string
): { character: PF1Character; error?: string; changed: boolean } {
  if (!HIT_DICE.has(hitDie)) {
    return {
      character,
      changed: false,
      error: `Hit die d${hitDie} is not a supported size (d4, d6, d8, d10, d12). It was not applied.`,
    };
  }
  const classes = liveClasses(character);
  const target = selectClass(classes, className);
  if (!target) {
    const summary = classes.map((entry) => entry.name).join(', ');
    return {
      character,
      changed: false,
      error: `Which class should use d${hitDie}? Current classes: ${summary}.`,
    };
  }
  return {
    character: writeClass(character, { ...target, hitDie }, { hitDieOnly: true }),
    changed: true,
  };
}

export function runCompanionTurn(
  message: string,
  character: PF1Character,
  options?: { permissions?: AIModuleSettings['allowedFields'] }
): CompanionTurnResult {
  const permissions = options?.permissions || DEFAULT_AI_MODULE_SETTINGS.allowedFields;
  let next = structuredClone(character);
  const changes: CompanionChange[] = [];
  const questions: CompanionQuestion[] = [];
  const errors: string[] = [];
  const text = message.trim();

  const className = readClassName(text);
  const level = readLevel(text);
  const hitDie = readHitDie(text);
  const hitDieClass = readHitDieClass(text);
  const archetypeName = readArchetype(text);
  const scores = readAbilityScores(text);
  const budget = readPointBuyBudget(text);
  const wantsRandomScores = /\brandom\b/i.test(text) && /\b(?:abilit|scores|point\s*-?\s*buy)\b/i.test(text);

  if (className) {
    const classes = liveClasses(next);
    const named = selectClass(classes, className);
    if (classes.length > 1 && !named) {
      questions.push({
        topic: 'class-target',
        prompt: `Which current class should be renamed to ${className}? Current classes: ${classes
          .map((entry) => entry.name)
          .join(', ')}.`,
      });
    } else {
      const target = named || classes[0];
      next = writeClass(next, { ...target, name: cleanLabel(className) });
      changes.push({ field: 'class', summary: `Class set to ${cleanLabel(className)}` });
    }
  }

  if (level !== undefined) {
    const classes = liveClasses(next);
    const levelTarget = selectClass(classes, className || hitDieClass);
    if (classes.length > 1 && !levelTarget) {
      questions.push({
        topic: 'class-target',
        prompt: `Which class should change so the total becomes ${level}? Current classes: ${classes
          .map((entry) => `${entry.name} ${entry.level}`)
          .join(', ')}.`,
      });
    } else if (!Number.isInteger(level) || level < 1 || level > 20) {
      errors.push(`Level ${level} is outside 1–20 and was not applied.`);
    } else {
      const target = levelTarget || classes[0];
      next = writeClass(next, { ...target, level });
      changes.push({ field: 'level', summary: `${target.name} level set to ${level}` });
    }
  }

  if (hitDie !== undefined) {
    const applied = applyHitDieSize(next, hitDie, className || hitDieClass);
    if (applied.error) {
      if (applied.error.startsWith('Which class')) {
        questions.push({ topic: 'class-target', prompt: applied.error });
      } else {
        errors.push(applied.error);
      }
    } else if (applied.changed) {
      next = applied.character;
      changes.push({
        field: 'hitDie',
        summary: `Hit die set to d${hitDie}`,
      });
    }
  }

  if (archetypeName) {
    const outcome = applyArchetype(next, archetypeName);
    next = outcome.character;
    if (outcome.change) changes.push(outcome.change);
    if (outcome.question) questions.push(outcome.question);
  }

  if (scores) {
    const activeBudget = budget ?? next.pointBuyBudget;
    const decision = validatePointBuyAssignment({
      scores: mergeScores(next, scores),
      budget: activeBudget,
      level: next.level,
    });
    if (!decision.ok) {
      errors.push(decision.reason);
    } else {
      next = writeAbilityScores(next, mergeScores(next, scores), activeBudget);
      changes.push({
        field: 'abilities',
        summary: `Ability scores applied on a ${activeBudget} point-buy budget (${decision.spent} spent)`,
      });
    }
  } else if (wantsRandomScores) {
    const activeBudget = budget ?? next.pointBuyBudget;
    if (activeBudget === undefined) {
      questions.push({
        topic: 'point-buy-budget',
        prompt: 'What point-buy budget should random ability scores use? I will not assume 10, 15, 20, or 25.',
      });
    } else {
      const random = assignRandomPointBuy(activeBudget);
      if (!random.ok) {
        errors.push(random.error);
      } else {
        next = writeAbilityScores(next, random.scores, activeBudget);
        changes.push({
          field: 'abilities',
          summary: `Random ability scores assigned inside a ${activeBudget} point-buy budget after ${random.rejected} rejected attempt(s)`,
        });
      }
    }
  } else if (budget !== undefined && budget !== next.pointBuyBudget) {
    const current = scoresFromCharacter(next);
    const decision = validatePointBuyAssignment({ scores: current, budget, level: next.level });
    if (!decision.ok) {
      errors.push(
        `Current ability scores were kept. ${decision.reason} The ${budget} point-buy budget was not stored.`
      );
    } else {
      next = { ...next, pointBuyBudget: budget };
      changes.push({ field: 'pointBuyBudget', summary: `Point-buy budget set to ${budget}` });
    }
  }

  if (permissions) {
    const legacy = parseNaturalLanguageSheetUpdates(text, next, permissions);
    for (const action of legacy) {
      next = action.apply(next);
      changes.push({ field: action.category, summary: action.label });
    }
  }

  const scalar = readScalarAssignment(text);
  if (scalar) {
    if (isSensitiveField(scalar.field)) {
      errors.push(`Refused to write ${scalar.field}. That name is not a permitted sheet field.`);
    } else if (!(scalar.field in SCALAR_FIELDS) && scalar.field !== 'size') {
      if (!className && !archetypeName && level === undefined) {
        errors.push(`${scalar.field} is not a writable companion field.`);
      }
    } else if (scalar.field === 'size') {
      const match = SIZES.find((size) => size.toLowerCase() === scalar.value.toLowerCase());
      if (!match) {
        errors.push(`Size "${scalar.value}" is not a sheet size and was not applied.`);
      } else {
        next = { ...next, size: match };
        changes.push({ field: 'size', summary: `Size set to ${match}` });
      }
    } else {
      const kind = SCALAR_FIELDS[scalar.field];
      if (kind === 'number') {
        const value = Number(scalar.value);
        if (!Number.isFinite(value)) {
          errors.push(`${scalar.field} needs a number. "${scalar.value}" was not applied.`);
        } else {
          next = { ...next, [scalar.field]: value };
          changes.push({ field: scalar.field, summary: `${scalar.field} set to ${value}` });
        }
      } else {
        next = { ...next, [scalar.field]: scalar.value };
        changes.push({ field: scalar.field, summary: `${scalar.field} set to ${scalar.value}` });
      }
    }
  }

  let macaroni: CompanionMacaroniReport | undefined;
  const expression = extractMacaroni(text);
  if (expression) {
    const report = resolveMacaroni(next, expression);
    macaroni = report.report;
    next = report.character;
    changes.push(...report.changes);
    errors.push(...report.errors);
  }

  return {
    character: next,
    reply: composeReply(changes, questions, errors),
    changes,
    questions,
    errors,
    usedLiveModel: false,
    macaroni,
  };
}

function composeReply(
  changes: CompanionChange[],
  questions: CompanionQuestion[],
  errors: string[]
): string {
  const parts: string[] = [];
  if (changes.length) {
    parts.push(`Applied: ${changes.map((change) => change.summary).join('; ')}.`);
  }
  if (errors.length) parts.push(errors.join(' '));
  if (questions.length) parts.push(questions.map((question) => question.prompt).join(' '));
  if (!parts.length) {
    parts.push(
      'I did not change the sheet. No live model was called on this turn. Tell me a level, class name, hit die, catalog archetype, point-buy budget, Macaroni expression, or another permitted field.'
    );
  } else if (!changes.length) {
    parts.unshift('I did not change the sheet.');
  }
  return parts.join(' ');
}

function pointBuySpent(scores: PointBuyScores): number {
  return ABILITIES.reduce((sum, ability) => sum + getPointBuyCost(scores[ability]), 0);
}

function spendPointBuy(budget: number, rng: () => number): PointBuyScores {
  const scores: PointBuyScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  let stalls = 0;
  while (stalls < 30) {
    const ability = ABILITIES[Math.floor(rng() * ABILITIES.length) % ABILITIES.length];
    if (scores[ability] >= 18) {
      stalls += 1;
      continue;
    }
    const trial = { ...scores, [ability]: scores[ability] + 1 };
    if (pointBuySpent(trial) > budget) {
      stalls += 1;
      continue;
    }
    scores[ability] += 1;
    stalls = 0;
    if (pointBuySpent(scores) === budget) break;
  }
  return scores;
}

function scoresFromCharacter(character: PF1Character): PointBuyScores {
  return {
    STR: character.abilities.STR.base,
    DEX: character.abilities.DEX.base,
    CON: character.abilities.CON.base,
    INT: character.abilities.INT.base,
    WIS: character.abilities.WIS.base,
    CHA: character.abilities.CHA.base,
  };
}

function mergeScores(character: PF1Character, partial: Partial<PointBuyScores>): PointBuyScores {
  return { ...scoresFromCharacter(character), ...partial };
}

function writeAbilityScores(
  character: PF1Character,
  scores: PointBuyScores,
  budget: number | undefined
): PF1Character {
  const abilities = { ...character.abilities };
  for (const ability of ABILITIES) {
    abilities[ability] = { ...abilities[ability], base: scores[ability] };
  }
  return {
    ...character,
    abilities,
    pointBuyBudget: budget ?? character.pointBuyBudget,
  };
}

function liveClasses(character: PF1Character): CharacterClassEntry[] {
  if (character.classes?.length) return character.classes.map((entry) => ({ ...entry }));
  return [
    {
      id: 'class1',
      name: character.characterClass || 'Class',
      level: character.level || 1,
      hitDie: character.hpBreakdown?.hitDiceSize || 10,
      skillPointsPerLevel: character.classSkillPointsPerLevel || 2,
      babProgression: 'full',
      isFavoredClass: true,
    },
  ];
}

function selectClass(classes: CharacterClassEntry[], name?: string): CharacterClassEntry | undefined {
  if (!name) return classes.length === 1 ? classes[0] : undefined;
  const wanted = name.toLowerCase();
  return classes.find((entry) => entry.name.toLowerCase() === wanted);
}

function writeClass(
  character: PF1Character,
  updated: CharacterClassEntry,
  options?: { hitDieOnly?: boolean }
): PF1Character {
  const classes = liveClasses(character).map((entry) =>
    entry.id === updated.id ? { ...entry, ...updated } : entry
  );
  const total = classes.reduce((sum, entry) => sum + (entry.level || 0), 0);
  const sole = classes.length === 1;
  const primary = classes[0];
  const grids = { ...(character.customClassGrids || {}) };
  const existingKey = Object.keys(grids).find((key) => {
    const grid = grids[key];
    return key === updated.id || grid.id === updated.id || grid.className.toLowerCase() === updated.name.toLowerCase();
  });
  const gridKey = existingKey || updated.id;
  const previous = grids[gridKey];
  grids[gridKey] = {
    id: gridKey,
    className: updated.name,
    level: updated.level,
    hitDie: updated.hitDie,
    skillPointsPerLevel: updated.skillPointsPerLevel,
    proficiencies: previous?.proficiencies || '',
    starterKitName: previous?.starterKitName,
    rawText: previous?.rawText || '',
    rows: previous?.rows || [],
    classSkillsText: previous?.classSkillsText,
    archetypeId: previous?.archetypeId,
  };

  const touchHitDie = !options?.hitDieOnly || updated.id === primary.id || sole;
  return {
    ...character,
    classes,
    level: total,
    characterClass: classes.map((entry) => `${entry.name} ${entry.level}`).join(' / '),
    hitDice: sole ? `${classes[0].level}d${classes[0].hitDie}` : character.hitDice,
    hpBreakdown: {
      ...character.hpBreakdown,
      hitDiceCount: total,
      hitDiceSize: touchHitDie ? updated.hitDie : character.hpBreakdown?.hitDiceSize || updated.hitDie,
      hitDiceRolledBase: character.hpBreakdown?.hitDiceRolledBase || 0,
      additionalBonuses: character.hpBreakdown?.additionalBonuses || [],
      calcMethod: character.hpBreakdown?.calcMethod || 'max',
    },
    customClassGrids: grids,
    careerData: character.careerData ? resizeCareer(character.careerData, total, primary.id) : character.careerData,
  };
}

function resizeCareer(
  career: CareerProgressionData,
  totalLevel: number,
  primaryClassId: string
): CareerProgressionData {
  const levels = career.levels.slice(0, totalLevel).map((entry, index) => ({ ...entry, level: index + 1 }));
  while (levels.length < totalLevel) {
    const level = levels.length + 1;
    levels.push({
      level,
      primaryClassId,
      primaryClassLevel: level,
      isGestalt: false,
      gestaltClassId: 'class2',
      gestaltClassLevel: level,
      favoredClassBonus: 'hp',
    });
  }
  return { ...career, levels };
}

function applyArchetype(
  character: PF1Character,
  name: string
): { character: PF1Character; change?: CompanionChange; question?: CompanionQuestion } {
  const requested = cleanLabel(name);
  const catalog = POPULAR_ARCHETYPES.find((entry) => entry.name.toLowerCase() === requested.toLowerCase());
  const career = character.careerData;
  const existing = career?.archetypes?.find((entry) => entry.name.toLowerCase() === requested.toLowerCase());
  if (existing) {
    return {
      character,
      question: {
        topic: 'source',
        prompt: `This sheet already has an archetype named ${existing.name}. I left that homebrew or saved entry unchanged.`,
      },
    };
  }
  if (!catalog) {
    const known = POPULAR_ARCHETYPES.map((entry) => entry.name).join(', ');
    return {
      character,
      question: {
        topic: 'archetype',
        prompt: `${requested} is not in the sheet's archetype catalog (${known}). No source was provided, so I did not invent its features.`,
      },
    };
  }
  const targetClassName = catalog.targetClassName;
  if (!targetClassName) {
    return {
      character,
      question: {
        topic: 'archetype',
        prompt: `${catalog.name} has no target class in the sheet catalog. I did not apply it.`,
      },
    };
  }
  const classes = liveClasses(character);
  const target = classes.find((entry) => entry.name.toLowerCase() === targetClassName.toLowerCase());
  if (!target) {
    return {
      character,
      question: {
        topic: 'archetype',
        prompt: `${catalog.name} is in the sheet catalog for ${targetClassName}, but this character's classes are ${classes
          .map((entry) => entry.name)
          .join(', ') || 'unset'}. I did not apply it.`,
      },
    };
  }
  const archetype: ArchetypeConfig = {
    ...catalog,
    targetClassId: target.id,
    targetClassName,
    isActive: true,
    swaps: catalog.swaps?.map((swap) => ({ ...swap })),
  };
  const baseCareer = career || emptyCareer(character, target.id);
  return {
    character: {
      ...character,
      careerData: {
        ...baseCareer,
        archetypes: [...(baseCareer.archetypes || []), archetype],
      },
    },
    change: {
      field: 'archetype',
      summary: `${catalog.name} applied to ${targetClassName} from the sheet catalog`,
    },
  };
}

function emptyCareer(character: PF1Character, primaryClassId: string): CareerProgressionData {
  const total = Math.max(1, character.level || 1);
  return {
    mode: 'standard',
    useFractionalBab: false,
    useFractionalSaves: false,
    levels: Array.from({ length: total }, (_, index) => ({
      level: index + 1,
      primaryClassId,
      primaryClassLevel: index + 1,
      isGestalt: false,
      favoredClassBonus: 'hp' as const,
    })),
    archetypes: [],
  };
}

function readLevel(text: string): number | undefined {
  const match = text.match(/\blevel(?:\s+to|\s+is|:)?\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function readHitDie(text: string): number | undefined {
  const match = text.match(/\b(?:hit\s*-?\s*die|hd)\s*(?:size)?(?:\s+to|\s+of|\s+is|:)?\s*d?(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function readHitDieClass(text: string): string | undefined {
  const match = text.match(/\b([A-Za-z][A-Za-z']+)\s+hit\s*-?\s*die\b/i);
  if (!match) return undefined;
  if (/^(set|the|a|an|and|with|its|their)$/i.test(match[1])) return undefined;
  return match[1];
}

function readClassName(text: string): string | undefined {
  const match = text.match(/\bclass(?:\s+is|\s+to|:)?\s+([A-Za-z][A-Za-z']*(?:\s+[A-Za-z][A-Za-z']*){0,3})/i);
  if (!match) return undefined;
  const cleaned = match[1].split(/\b(?:level|hit|hd|archetype|and|with|on|point)\b/i)[0].trim();
  return cleaned.replace(/[,\s]+$/, '') || undefined;
}

function readArchetype(text: string): string | undefined {
  const leading = text.match(/\barchetype(?:\s+is|\s+to|:)?\s+([A-Za-z][A-Za-z']*)/i);
  if (leading && !/^(the|a|an|to|is)$/i.test(leading[1])) return leading[1];
  const trailing = text.match(/\b([A-Za-z][A-Za-z']+)\s+archetype\b/i);
  if (trailing && !/^(the|a|an|add|set|my|their)$/i.test(trailing[1])) return trailing[1];
  return undefined;
}

function readAbilityScores(text: string): Partial<PointBuyScores> | undefined {
  const aliases: Record<string, AbilityName> = {
    str: 'STR',
    strength: 'STR',
    dex: 'DEX',
    dexterity: 'DEX',
    con: 'CON',
    constitution: 'CON',
    int: 'INT',
    intelligence: 'INT',
    wis: 'WIS',
    wisdom: 'WIS',
    cha: 'CHA',
    charisma: 'CHA',
  };
  const found: Partial<PointBuyScores> = {};
  const pattern = /\b(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)\s*(?:to|:|=)?\s*(\d+)/gi;
  for (const match of text.matchAll(pattern)) {
    const ability = aliases[match[1].toLowerCase()];
    found[ability] = parseInt(match[2], 10);
  }
  return Object.keys(found).length ? found : undefined;
}

function readPointBuyBudget(text: string): number | undefined {
  const leading = text.match(/\b(\d+)\s*-?\s*point\s*-?\s*buy\b/i);
  if (leading) return parseInt(leading[1], 10);
  const trailing = text.match(/\bpoint\s*-?\s*buy(?:\s+budget)?(?:\s+of|\s+is|:)?\s+(\d+)/i);
  return trailing ? parseInt(trailing[1], 10) : undefined;
}

function readScalarAssignment(text: string): { field: string; value: string } | undefined {
  const match = text.match(/(?:^|\n)\s*(?:set|change|update)\s+([A-Za-z][A-Za-z0-9_]*)\s+(?:to|=)\s+(.+)$/i);
  if (!match) return undefined;
  return { field: match[1], value: match[2].trim().replace(/[.]+$/, '') };
}

function isSensitiveField(field: string): boolean {
  const normalized = field.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return (
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('credential') ||
    normalized.includes('token') ||
    normalized.includes('apikey') ||
    /(?:gemini|openai|google|anthropic|claude|azure).*(?:key|token)/.test(normalized) ||
    /(?:key|token).*(?:gemini|openai|google|anthropic)/.test(normalized)
  );
}

function extractMacaroni(text: string): string | undefined {
  if (!/#[A-Za-z]|<\^|>>[A-Za-z]|\[[^\]]+\]|[A-Za-z]+\s*\^[+-]?\d+/.test(text)) return undefined;
  const bracket = text.match(/\[[^\]]+\]/);
  if (bracket) return bracket[0];
  const buff = text.match(/<\^[^>]*>/);
  if (buff) return buff[0];
  const push = text.match(/>>\s*[A-Za-z0-9_]+(?:\s*[+-]\s*\d+)?/);
  if (push) return push[0].replace(/\s+/g, '');
  const delta = text.match(/[A-Za-z]+\s*\^[+-]?\d+/);
  if (delta) return delta[0].replace(/\s+/g, '');
  const call = text.match(/#[A-Za-z][A-Za-z0-9_]*/);
  return call ? call[0] : undefined;
}

function resolveMacaroni(
  character: PF1Character,
  expression: string
): {
  character: PF1Character;
  report: CompanionMacaroniReport;
  changes: CompanionChange[];
  errors: string[];
} {
  const context = buildFormulaContext(character, evaluateConditions(character.conditions));
  const calls = [...expression.matchAll(/#([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  const resolved: Array<{ call: string; value: string }> = [];
  const unresolved: string[] = [];
  for (const call of calls) {
    const key = call.toLowerCase();
    if (key in context || `#${key}` in context) {
      const value = context[key] ?? context[`#${key}`];
      resolved.push({ call: `#${call.toUpperCase()}`, value: String(value) });
    } else {
      unresolved.push(`#${call.toUpperCase()}`);
    }
  }

  const errors: string[] = [];
  const changes: CompanionChange[] = [];
  if (unresolved.length) {
    errors.push(
      `Macaroni call ${unresolved.join(', ')} is not a supported field on this sheet. I did not treat 0 as its value.`
    );
    return {
      character,
      changes,
      errors,
      report: { resolved, unresolved, ignoredMutations: [], output: '' },
    };
  }

  const executed = executeMacaroni(expression, { character, formulaContext: context });
  const ignoredMutations = (executed.stateMutations || [])
    .map((mutation) => mutation.field)
    .filter((field) => !MACARONI_MUTATION_FIELDS.has(field.toLowerCase()));
  const supported = {
    ...executed,
    stateMutations: (executed.stateMutations || []).filter((mutation) =>
      MACARONI_MUTATION_FIELDS.has(mutation.field.toLowerCase())
    ),
  };
  const applied = applyMacaroniToCharacter(character, supported);
  if (applied.didMutate) {
    changes.push({ field: 'hp', summary: applied.statusMessage || 'Macaroni mutation applied' });
  }
  if (ignoredMutations.length) {
    errors.push(
      `Macaroni cannot write ${ignoredMutations.join(', ')}. Supported mutation fields are HP, temporary HP, and GP.`
    );
  }
  return {
    character: applied.updatedCharacter,
    changes,
    errors,
    report: {
      resolved,
      unresolved,
      ignoredMutations,
      output: executed.fullOutput,
    },
  };
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
