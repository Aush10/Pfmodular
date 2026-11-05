/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createBlankCharacter } from '../data/defaultCharacter';
import type { CustomClassGrid, PF1Character } from '../types/character';
import {
  assignRandomPointBuy,
  listUnlinkedClassGrids,
  resolveClassGrids,
  runCompanionTurn,
  validatePointBuyAssignment,
} from './companionSheet';

function withDemoGrids(character: PF1Character): PF1Character {
  const cavalier: CustomClassGrid = {
    id: 'class1',
    className: 'Cavalier',
    level: 12,
    hitDie: 10,
    skillPointsPerLevel: 4,
    proficiencies: 'demo cavalier proficiencies',
    rawText: '1\t+1\t+2\t+0\t+0\tChallenge',
    rows: [],
  };
  const wizard: CustomClassGrid = {
    id: 'class2',
    className: 'Wizard',
    level: 1,
    hitDie: 6,
    skillPointsPerLevel: 2,
    proficiencies: 'demo wizard proficiencies',
    rawText: '',
    rows: [],
  };
  return {
    ...character,
    customClassGrids: { class1: cavalier, class2: wizard },
  };
}

test('complete-sheet turn replies and writes level, class, and hit die into sheet and class editor state', () => {
  const start = withDemoGrids(createBlankCharacter());
  assert.equal(start.level, 1);
  assert.equal(start.classes[0].name, 'Fighter');

  const result = runCompanionTurn(
    'Complete the sheet: class Armorist, level 6, Armorist hit die d8',
    start
  );

  assert.equal(result.usedLiveModel, false);
  assert.ok(result.reply.trim().length > 0);
  assert.equal(result.errors.length, 0);
  assert.equal(result.character.level, 6);
  assert.equal(result.character.classes[0].name, 'Armorist');
  assert.equal(result.character.classes[0].level, 6);
  assert.equal(result.character.classes[0].hitDie, 8);
  assert.equal(result.character.hpBreakdown.hitDiceCount, 6);
  assert.equal(result.character.hpBreakdown.hitDiceSize, 8);
  assert.ok(result.character.characterClass.toLowerCase().includes('armorist'));

  const grids = resolveClassGrids(result.character);
  const armorist = Object.values(grids).find((grid) => grid.className === 'Armorist');
  assert.ok(armorist);
  assert.equal(armorist.level, 6);
  assert.equal(armorist.hitDie, 8);
  assert.equal(Object.values(grids).some((grid) => grid.className === 'Cavalier'), false);

  const unlinked = listUnlinkedClassGrids(result.character);
  assert.ok(unlinked.some((grid) => grid.className === 'Cavalier'));
  assert.equal(result.character.customClassGrids?.class1?.className, 'Cavalier');
  assert.equal(result.character.inventory.length, start.inventory.length);
});

test('unknown archetype asks and does not invent features', () => {
  const start = createBlankCharacter();
  const result = runCompanionTurn('Set the archetype to Beastmaster', start);

  assert.equal(result.character.careerData?.archetypes?.length ?? 0, 0);
  assert.ok(result.questions.some((question) => /beastmaster/i.test(question.prompt)));
  assert.ok(/not/i.test(result.reply));
  assert.equal(result.character.level, start.level);
});

test('catalog archetype is applied only when its class is already on the sheet', () => {
  const fighter = createBlankCharacter();
  const wrongClass = runCompanionTurn('Add the Gendarme archetype', fighter);
  assert.equal(wrongClass.character.careerData?.archetypes?.length ?? 0, 0);
  assert.ok(wrongClass.questions.some((question) => /cavalier/i.test(question.prompt)));

  const cavalier: PF1Character = {
    ...fighter,
    characterClass: 'Cavalier',
    classes: [{ ...fighter.classes[0], name: 'Cavalier' }],
  };
  const matched = runCompanionTurn('Add the Gendarme archetype', cavalier);
  assert.equal(matched.questions.length, 0);
  assert.equal(matched.character.careerData?.archetypes.length, 1);
  assert.equal(matched.character.careerData?.archetypes[0].name, 'Gendarme');
  assert.equal(matched.character.careerData?.archetypes[0].targetClassName, 'Cavalier');
  assert.ok((matched.character.careerData?.archetypes[0].swaps || []).length > 0);
});

test('existing homebrew archetype is left in place', () => {
  const start = createBlankCharacter();
  start.characterClass = 'Cavalier';
  start.classes = [{ ...start.classes[0], name: 'Cavalier' }];
  start.careerData = {
    mode: 'standard',
    useFractionalBab: false,
    useFractionalSaves: false,
    levels: [
      {
        level: 1,
        primaryClassId: start.classes[0].id,
        primaryClassLevel: 1,
        isGestalt: false,
        favoredClassBonus: 'hp',
      },
    ],
    archetypes: [
      {
        id: 'homebrew-gendarme',
        name: 'Gendarme',
        targetClassName: 'Cavalier',
        lostFeatures: ['Banner'],
        levelAbilities: { 1: 'House rule: lance only' },
        isActive: true,
      },
    ],
  };

  const result = runCompanionTurn('Add the Gendarme archetype', start);
  assert.equal(result.character.careerData?.archetypes.length, 1);
  assert.equal(result.character.careerData?.archetypes[0].id, 'homebrew-gendarme');
  assert.deepEqual(result.character.careerData?.archetypes[0].levelAbilities, { 1: 'House rule: lance only' });
  assert.ok(result.questions.some((question) => /already/i.test(question.prompt)));
});

test('point buy rejects an over-budget array and retries random proposals', () => {
  const scores = { STR: 18, DEX: 18, CON: 18, INT: 18, WIS: 18, CHA: 10 };
  const rejected = validatePointBuyAssignment({ scores, budget: 20, level: 1 });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.reason, /not applied|retry|over/i);

  const missingBudget = validatePointBuyAssignment({ scores, budget: undefined, level: 1 });
  assert.equal(missingBudget.ok, false);

  const start = createBlankCharacter();
  const blocked = runCompanionTurn('Set STR 18 DEX 18 CON 18 INT 18 WIS 18 CHA 10 on a 20 point buy', start);
  assert.equal(blocked.character.abilities.STR.base, 10);
  assert.ok(blocked.errors.some((error) => /20/.test(error)));

  let proposals = 0;
  const random = assignRandomPointBuy(15, () => 0.1, {
    maxAttempts: 4,
    propose: () => {
      proposals += 1;
      if (proposals < 3) return scores;
      return { STR: 14, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 10 };
    },
  });
  assert.equal(random.ok, true);
  if (random.ok) {
    assert.equal(random.rejected, 2);
    assert.equal(validatePointBuyAssignment({ scores: random.scores, budget: 15, level: 1 }).ok, true);
  }

  const exhausted = assignRandomPointBuy(15, () => 0, { maxAttempts: 3, propose: () => scores });
  assert.equal(exhausted.ok, false);

  const asked = runCompanionTurn('Assign random ability scores', start);
  assert.equal(asked.character.abilities.STR.base, start.abilities.STR.base);
  assert.ok(asked.questions.some((question) => /point-buy budget|point buy budget/i.test(question.prompt)));
  assert.equal(asked.character.pointBuyBudget, undefined);
});

test('blank sheet class editor follows live classes instead of the cavalier demo', () => {
  const blank = createBlankCharacter();
  assert.equal(blank.customClassGrids, undefined);
  const grids = resolveClassGrids(blank);
  const names = Object.values(grids).map((grid) => grid.className);
  assert.deepEqual(names, ['Fighter']);
  assert.equal(Object.values(grids)[0].level, 1);
  assert.equal(Object.values(grids)[0].hitDie, 10);
});

test('multiclass level change asks which class instead of moving only one field', () => {
  const start = createBlankCharacter();
  start.level = 3;
  start.classes = [
    { ...start.classes[0], level: 2 },
    {
      id: 'cls-2',
      name: 'Wizard',
      level: 1,
      hitDie: 6,
      skillPointsPerLevel: 2,
      babProgression: 'half',
      isFavoredClass: false,
    },
  ];
  const result = runCompanionTurn('Set level to 7', start);
  assert.equal(result.character.level, 3);
  assert.equal(result.character.classes[0].level, 2);
  assert.equal(result.character.classes[1].level, 1);
  assert.ok(result.questions.some((question) => /which class/i.test(question.prompt)));
});

test('companion answers an unrecognized request instead of returning silence', () => {
  const result = runCompanionTurn('hello, complete the sheet please', createBlankCharacter());
  assert.ok(result.reply.trim().length > 0);
  assert.equal(result.changes.length, 0);
  assert.equal(result.usedLiveModel, false);
  assert.match(result.reply, /level|class|point-buy|point buy|macaroni/i);
});

test('damage still changes current HP and a secret field is refused', () => {
  const start = createBlankCharacter();
  const damaged = runCompanionTurn('Take 4 damage', start);
  assert.equal(damaged.character.hpCurrent, start.hpCurrent - 4);
  assert.equal(damaged.errors.length, 0);

  const secret = runCompanionTurn('set geminiKey to super-secret', start);
  assert.equal((secret.character as unknown as { geminiKey?: string }).geminiKey, undefined);
  assert.ok(secret.errors.some((error) => /not (a permitted|allowed|writable)|refused/i.test(error)));
});

test('macaroni resolves #LEVEL after the level write and reports unknown calls', () => {
  const start = createBlankCharacter();
  const result = runCompanionTurn('Set level to 4. Read [#LEVEL]', start);
  assert.equal(result.character.level, 4);
  const levelRead = result.macaroni?.resolved.find((entry) => entry.call.toUpperCase() === '#LEVEL');
  assert.ok(levelRead);
  assert.equal(levelRead.value, '4');

  const unknown = runCompanionTurn('Evaluate #NOTAFIELD', start);
  assert.ok(unknown.macaroni?.unresolved.some((call) => call.toUpperCase() === '#NOTAFIELD'));
  assert.ok(unknown.errors.some((error) => /NOTAFIELD/i.test(error)) || unknown.macaroni?.unresolved.length);
  assert.equal(unknown.character.hpCurrent, start.hpCurrent);
});

test('supported macaroni HP mutation is applied and an unsupported push is named', () => {
  const start = createBlankCharacter();
  const healed = runCompanionTurn('Run HP^+3', start);
  assert.equal(healed.character.hpCurrent, Math.min(start.hpTotalMax, start.hpCurrent + 3));
  assert.ok(healed.changes.some((change) => /hp/i.test(change.field)));

  const speed = runCompanionTurn('Run >>SPEED+10', start);
  assert.equal(speed.character.speedBase, start.speedBase);
  assert.ok(
    speed.errors.some((error) => /SPEED/i.test(error)) ||
      speed.macaroni?.ignoredMutations.some((field) => /speed/i.test(field))
  );
});
