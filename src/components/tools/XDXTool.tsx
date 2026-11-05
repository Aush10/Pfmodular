import React, { useState } from 'react';
import {
  Terminal,
  Dices,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  FileText,
  HelpCircle,
  X,
  Sparkles,
  Save,
  Copy,
} from 'lucide-react';
import { PF1Character, XdxMacroEntry } from '../../types/character';
import { DerivedCombatStats, evaluateConditions } from '../../engine/pf1eMath';
import { executeMacaroni, applyMacaroniToCharacter } from '../../engine/macaroni';
import { buildFormulaContext } from '../../engine/formula';

interface XDXToolProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  derived: DerivedCombatStats;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  isDocked?: boolean;
}

interface RollLogItem {
  id: string;
  timestamp: string;
  rawInput: string;
  resultOutput: string;
  appliedPushes?: string[];
  slots?: Array<{ slot: number; evaluated: string }>;
  isFinished?: boolean;
  quirkyMessage?: string;
}

export const XDXTool: React.FC<XDXToolProps> = ({
  isOpen,
  onClose,
  character,
  derived,
  onUpdateCharacter,
  isDocked = false,
}) => {
  const [macroInput, setMacroInput] = useState('');
  const [rollLogs, setRollLogs] = useState<RollLogItem[]>([
    {
      id: 'log-init',
      timestamp: 'Ready',
      rawInput: '"to hit " d20+10 | 4d6+5 "fire damage"',
      resultOutput: 'to hit 22, 19 fire damage',
    },
  ]);
  const [showMemoryTxt, setShowMemoryTxt] = useState(false);
  const [memoryTxtContent, setMemoryTxtContent] = useState<string>(
    `firebreath: 2d6+(5*floor(#level/2)+1) "fire"\nmainattack: d20+#bab+#str | 1d8+#str "slashing"\npower_strike: d20+#bab+4 | 2d6+12 "bludgeoning"\npoison_save: DC+#CON "Fort save DC"\nblood_drain: "blood" >>HP-5`
  );
  const [showHelp, setShowHelp] = useState(false);

  // Saved macros list
  const savedMacros: XdxMacroEntry[] = character.xdxMacros || [
    { id: 'm-1', name: 'firebreath', formula: '2d6+(5*floor(#level/2)+1) "fire"', description: 'Dragon fire breath' },
    { id: 'm-2', name: 'mainattack', formula: 'd20+#bab+#str | 1d8+#str "slashing"', description: 'Primary weapon attack' },
    { id: 'm-3', name: 'blood_drain', formula: '"blood" >>HP-5', description: 'Drain 5 HP from character' },
    { id: 'm-4', name: 'spell_dc', formula: 'DC+#CON "Fort DC"', description: 'Standard ability DC' },
  ];

  const updateSavedMacros = (newMacros: XdxMacroEntry[]) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      xdxMacros: newMacros,
    }));
  };

  // Roll single die
  const rollDie = (sides: number) => {
    if (sides <= 1) return 1;
    return Math.floor(Math.random() * sides) + 1;
  };

  // Roll dice expression e.g. "10d6" or "1d20"
  const evaluateDiceExpr = (expr: string): number => {
    const match = expr.match(/^(\d*)[dD](\d+)$/);
    if (!match) return 0;
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]) || 6;
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += rollDie(sides);
    }
    return sum;
  };

  // Get sheet call value
  const getCallValue = (token: string): number | null => {
    const clean = token.replace(/^[#@]/, '').toUpperCase();
    switch (clean) {
      case 'HP':
        return character.hpCurrent;
      case 'MAXHP':
      case 'HPMAX':
        return character.hpTotalMax;
      case 'THP':
      case 'TEMP':
        return character.hpTemp;
      case 'STR':
      case 'STRENGTH':
      case 'STR_MOD':
      case 'STRMOD':
        return derived.strMod;
      case 'DEX':
      case 'DEXTERITY':
      case 'DEX_MOD':
      case 'DEXMOD':
        return derived.dexMod;
      case 'CON':
      case 'CONSTITUTION':
      case 'CON_MOD':
      case 'CONMOD':
        return derived.conMod;
      case 'INT':
      case 'INTELLIGENCE':
      case 'INT_MOD':
      case 'INTMOD':
        return derived.intMod;
      case 'WIS':
      case 'WISDOM':
      case 'WIS_MOD':
      case 'WISMOD':
        return derived.wisMod;
      case 'CHA':
      case 'CHARISMA':
      case 'CHA_MOD':
      case 'CHAMOD':
        return derived.chaMod;
      case 'STR_SCORE':
        return derived.strTotal;
      case 'DEX_SCORE':
        return derived.dexTotal;
      case 'CON_SCORE':
        return derived.conTotal;
      case 'INT_SCORE':
        return derived.intTotal;
      case 'WIS_SCORE':
        return derived.wisTotal;
      case 'CHA_SCORE':
        return derived.chaTotal;
      case 'BAB':
        return character.baseAttackBonus;
      case 'INIT':
      case 'INITIATIVE':
        return derived.initiativeTotal;
      case 'FORT':
      case 'FORTITUDE':
        return derived.fortitudeTotal;
      case 'REF':
      case 'REFLEX':
        return derived.reflexTotal;
      case 'WILL':
        return derived.willTotal;
      case 'AC':
        return derived.acTotal;
      case 'TOUCH':
        return derived.touchAC;
      case 'FF':
      case 'FLAT':
      case 'FLATFOOTED':
        return derived.flatFootedAC;
      case 'CMB':
        return derived.cmbTotal;
      case 'CMD':
        return derived.cmdTotal;
      case 'LEVEL':
      case 'LVL':
        return character.level;
      case 'CL':
      case 'CASTERLEVEL':
        return character.casterLevel;
      case 'SPEED':
        return character.speedBase || 30;
      case 'SIZE':
        return 0;
      case 'MISC':
        return 0;
      default: {
        // Check skills
        const lower = clean.toLowerCase();
        const skill = character.skills?.find(
          (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === lower || s.name.toLowerCase() === lower
        );
        if (skill) {
          const isClass = skill.isClassSkill && skill.ranks > 0 ? 3 : 0;
          let abMod = 0;
          switch (skill.keyAbility) {
            case 'STR': abMod = derived.strMod; break;
            case 'DEX': abMod = derived.dexMod; break;
            case 'CON': abMod = derived.conMod; break;
            case 'INT': abMod = derived.intMod; break;
            case 'WIS': abMod = derived.wisMod; break;
            case 'CHA': abMod = derived.chaMod; break;
          }
          return skill.ranks + abMod + (skill.miscMod || 0) + isClass;
        }
        // Check resource trackers
        const tracker = character.resourceTrackers?.find(
          (t) => t.name.toLowerCase() === lower || t.macroKey?.toLowerCase() === lower
        );
        if (tracker) {
          return tracker.current;
        }
        return null;
      }
    }
  };

  // Parse arithmetic with floor (/) and ceil (/+) and functions
  const evaluateMathChunk = (chunk: string): number => {
    try {
      let parsed = chunk;

      // Handle grouped multiplication like 10(d6+5) or 10(1d6+5)
      parsed = parsed.replace(/(\d+)\s*\(\s*([dD]\d+|\d+[dD]\d+)\s*([+-]\s*\d+)\s*\)/g, (_, mult, dPart, bonus) => {
        const m = parseInt(mult, 10);
        const b = parseInt(bonus.replace(/\s+/g, ''), 10);
        const sides = parseInt(dPart.replace(/^[0-9]*[dD]/, ''), 10);
        let rollSum = 0;
        for (let i = 0; i < m; i++) {
          rollSum += rollDie(sides) + b;
        }
        return String(rollSum);
      });

      // Handle standard dice: 10d6, d20, etc.
      parsed = parsed.replace(/(\d*)[dD](\d+)/g, (match) => {
        return String(evaluateDiceExpr(match));
      });

      // Handle DC calculation: DC+#CON or DC+CON (10 + 1/2 level + abilityMod)
      parsed = parsed.replace(/DC(?:\s*\+\s*#?([A-Za-z0-9_]+))?/gi, (_, abName) => {
        const halfLevel = Math.floor(character.level / 2);
        let abMod = 0;
        if (abName) {
          if (/^\d+$/.test(abName)) {
            abMod = parseInt(abName, 10);
          } else {
            const val = getCallValue(abName);
            if (val !== null) abMod = val;
          }
        }
        return String(10 + halfLevel + abMod);
      });

      // Handle math functions: floor, round, ceil, abs, sqrt
      parsed = parsed.replace(/(floor|round|ceil|abs|sqrt)\s*\(([^()]+)\)/gi, (_, fn, inner) => {
        try {
          const sanitizedInner = inner.replace(/[^0-9+\-*/().\s]/g, '');
          // eslint-disable-next-line no-new-func
          const val = Function(`"use strict"; return (${sanitizedInner});`)();
          const f = fn.toLowerCase();
          if (f === 'floor') return String(Math.floor(val));
          if (f === 'round') return String(Math.round(val));
          if (f === 'ceil') return String(Math.ceil(val));
          if (f === 'abs') return String(Math.abs(val));
          if (f === 'sqrt') return String(Math.sqrt(val));
          return String(val);
        } catch {
          return inner;
        }
      });

      // Handle calls #CALL or @CALL
      parsed = parsed.replace(/[#@]([A-Za-z0-9_]+)/g, (_, name) => {
        const val = getCallValue(name);
        return String(val ?? 0);
      });

      // Handle all-caps calls not in quotes
      parsed = parsed.replace(/\b([A-Z]{2,}[0-9_]*)\b/g, (match) => {
        const val = getCallValue(match);
        return val !== null ? String(val) : match;
      });

      // Handle /+ as round UP (ceil division)
      if (parsed.includes('/+')) {
        parsed = parsed.replace(/(\d+)\s*\/\+\s*(\d+)/g, (_, a, b) => {
          return String(Math.ceil(parseInt(a, 10) / parseInt(b, 10)));
        });
      }

      // Standard division rounds down (floor) per PF1e rules
      if (parsed.includes('/')) {
        parsed = parsed.replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => {
          return String(Math.floor(parseInt(a, 10) / parseInt(b, 10)));
        });
      }

      // Safe arithmetic evaluator for remaining numbers and +, -, *
      if (/^[0-9+\-*()\s]+$/.test(parsed)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return Math.floor(${parsed});`)();
        return typeof result === 'number' && !isNaN(result) ? result : 0;
      }
    } catch {
      // fallback
    }
    return 0;
  };

  // Find macro formula across savedMacros and customObjects
  const findMacroFormula = (name: string): string | null => {
    const clean = name.replace(/^[<#@{]{1,2}/, '').replace(/[>}]+$/, '').trim().toLowerCase();
    const fromSaved = savedMacros.find((m) => m.name.toLowerCase() === clean);
    if (fromSaved) return fromSaved.formula;
    const fromCustom = character.customObjects?.find((o) => o.name.toLowerCase() === clean);
    if (fromCustom) return fromCustom.formula;
    return null;
  };

  // Evaluate a single sub-macro inside pipes
  // Supports text literals in quotes "", pushes >>, and math/dice
  const evaluateSegment = (seg: string, pushesOut: string[]): string => {
    let remaining = seg.trim();

    // 1. Check for macro pull <<name, {name}, or direct macro name
    const singlePullMatch = remaining.match(/^([<#@{]{1,2})?([a-zA-Z0-9_]+)[>} ]*$/);
    if (singlePullMatch) {
      const candidateName = singlePullMatch[2];
      const formula = findMacroFormula(candidateName);
      if (formula) {
        // If the formula itself has pipes, evaluate pipeline
        if (formula.includes('|') && !formula.startsWith('"')) {
          const subPipes = formula.split('|').map((s) => s.trim()).filter(Boolean);
          return subPipes.map((p) => evaluateSegment(p, pushesOut)).join(', ');
        }
        return evaluateSegment(formula, pushesOut);
      }
    }

    // Replace embedded <<name or {name} inside expressions
    remaining = remaining.replace(/([<{]{1,2})([a-zA-Z0-9_]+)([>}]*)/g, (match, _, name) => {
      const formula = findMacroFormula(name);
      if (formula) {
        return evaluateSegment(formula, pushesOut);
      }
      return match;
    });

    // 2. Extract and handle >> pushes
    // User rule: >>HP-5 will send -5 to HP. No spaces between call and equation.
    // If spaces like >>HP +5 or >>HP+ 5, it prints +5 or 5 instead of pushing!
    const strictPushMatch = remaining.match(/>>([A-Za-z]+)([+-]\d+)/);
    const loosePushMatch = remaining.match(/>>([A-Za-z]+)\s+([+-]?\s*\d+)/);

    if (strictPushMatch) {
      const target = strictPushMatch[1].toUpperCase();
      const delta = parseInt(strictPushMatch[2], 10);
      pushesOut.push(`Applied ${delta >= 0 ? `+${delta}` : delta} to ${target}`);

      // Apply directly to character
      if (target === 'HP') {
        onUpdateCharacter((prev) => ({
          ...prev,
          hpCurrent: Math.max(0, prev.hpCurrent + delta),
        }));
      } else if (target === 'THP' || target === 'TEMP') {
        onUpdateCharacter((prev) => ({
          ...prev,
          hpTemp: Math.max(0, (prev.hpTemp || 0) + delta),
        }));
      }

      // Remove the strict push command from printed output
      remaining = remaining.replace(strictPushMatch[0], '').trim();
    } else if (loosePushMatch) {
      // User rule: if spaces like >>HP +5, prints +5 or 5 instead of pushing!
      const printedVal = loosePushMatch[2].trim();
      remaining = remaining.replace(loosePushMatch[0], printedVal).trim();
    }

    // 3. Extract text in quotes vs math
    // e.g. "to hit " d20+10
    const tokens: string[] = [];
    let currentIdx = 0;
    const textRegex = /"([^"]*)"/g;
    let match: RegExpExecArray | null;

    while ((match = textRegex.exec(remaining)) !== null) {
      const beforeText = remaining.substring(currentIdx, match.index).trim();
      if (beforeText) {
        tokens.push(beforeText);
      }
      tokens.push(`"${match[1]}"`);
      currentIdx = match.index + match[0].length;
    }
    const afterText = remaining.substring(currentIdx).trim();
    if (afterText) {
      tokens.push(afterText);
    }

    const evaluatedParts: string[] = [];
    for (const tok of tokens) {
      if (tok.startsWith('"') && tok.endsWith('"')) {
        // Literal text
        evaluatedParts.push(tok.slice(1, -1));
      } else {
        // Dice and math
        const num = evaluateMathChunk(tok);
        evaluatedParts.push(String(num));
      }
    }

    return evaluatedParts.join(' ').replace(/\s+/g, ' ').trim();
  };

  // Evaluate full macro using Macaroni engine
  const executeXdxMacro = (raw: string) => {
    if (!raw.trim()) return;

    const cond = evaluateConditions(character.conditions);
    const context = buildFormulaContext(character, cond);

    const macaroniResult = executeMacaroni(raw, {
      character,
      formulaContext: context,
      uiPresets: character.uiMakePresets,
    });

    // 1. Dispatch UI alerts if any (<TAG"message">)
    if (macaroniResult.alertEvents && macaroniResult.alertEvents.length > 0) {
      macaroniResult.alertEvents.forEach((alert) => {
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

    // 2. Dispatch decision queries if any (<?>)
    if (macaroniResult.queryEvent) {
      window.dispatchEvent(
        new CustomEvent('macaroni:query', {
          detail: macaroniResult.queryEvent,
        })
      );
    }

    // 3. Apply <^...> buff makes, ^ mutators, and >> pushes to character
    const pushesOut: string[] = [];
    if (
      (macaroniResult.buffMakeEvents && macaroniResult.buffMakeEvents.length > 0) ||
      (macaroniResult.stateMutations && macaroniResult.stateMutations.length > 0)
    ) {
      onUpdateCharacter((prev) => {
        const applied = applyMacaroniToCharacter(prev, macaroniResult);
        pushesOut.push(applied.statusMessage);
        return applied.updatedCharacter;
      });
    } else if (macaroniResult.appliedPushes && macaroniResult.appliedPushes.length > 0) {
      macaroniResult.appliedPushes.forEach((p) => {
        pushesOut.push(p);
      });
    }

    const newLogItem: RollLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rawInput: raw,
      resultOutput: macaroniResult.fullOutput || '(empty)',
      appliedPushes: pushesOut.length > 0 ? pushesOut : undefined,
      slots: macaroniResult.slots.map((s) => ({ slot: s.slot, evaluated: s.evaluated })),
      isFinished: macaroniResult.isFinished,
      quirkyMessage: macaroniResult.quirkyMessage,
    };

    setRollLogs((prev) => [newLogItem, ...prev].slice(0, 50));
  };

  // Add macro to saved list
  const handleSaveCurrentMacro = () => {
    if (!macroInput.trim()) return;
    const name = `macro_${Date.now().toString(36).substring(2, 6)}`;
    const newEntry: XdxMacroEntry = {
      id: `m-${Date.now()}`,
      name,
      formula: macroInput.trim(),
    };
    updateSavedMacros([...savedMacros, newEntry]);
  };

  // Save memory.txt
  const handleSaveMemoryTxt = () => {
    const lines = memoryTxtContent.split('\n').filter((l) => l.trim());
    const parsedEntries: XdxMacroEntry[] = lines.map((l, i) => {
      const [name, ...rest] = l.split(':');
      return {
        id: `txt-${i}`,
        name: name ? name.trim() : `macro_${i}`,
        formula: rest.join(':').trim(),
      };
    });
    updateSavedMacros(parsedEntries);
    setShowMemoryTxt(false);
  };

  if (!isOpen && !isDocked) return null;

  const content = (
    <div className="flex flex-col h-full space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
              <span>XDX Macro Center</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                Mini DSL Engine
              </span>
            </div>
            <div className="text-[10px] opacity-70">
              Compact dice evaluator · Pipes | · Literals &quot;&quot; · Calls # · Pushes &gt;&gt;
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowMemoryTxt(!showMemoryTxt)}
            className="px-2.5 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 border border-black/10 dark:border-white/10 flex items-center gap-1 text-[11px]"
            title="Open macros.txt memory slot"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>macros.txt</span>
          </button>

          {!isDocked && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Memory Slot TXT Drawer */}
      {showMemoryTxt && (
        <div className="p-3 rounded-lg bg-black/20 dark:bg-black/40 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-cyan-300 uppercase">Memory Slot: macros.txt</span>
            <span className="text-[10px] opacity-60">Format: name: formula</span>
          </div>

          <textarea
            value={memoryTxtContent}
            onChange={(e) => setMemoryTxtContent(e.target.value)}
            rows={6}
            className="w-full p-2 rounded bg-black/40 border border-cyan-500/30 font-mono text-xs text-cyan-100 resize-none"
            placeholder={`firebreath: 2d6+(5*floor(#level/2)+1) "fire"\nmainattack: d20+#bab+#str | 1d8+#str`}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowMemoryTxt(false)}
              className="px-2.5 py-1 rounded bg-slate-800 text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMemoryTxt}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              <span>Save & Load Macros</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Terminal Command Line Input */}
      <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-wider opacity-80">Command / Macro Line</span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-amber-500 hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Syntax Reference</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={macroInput}
            onChange={(e) => setMacroInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeXdxMacro(macroInput)}
            placeholder={`"to hit " d20+10 | 4d6 "damage"  OR  10(D6+5)  OR  "blood" >>HP-5`}
            className="flex-1 px-3 py-1.5 rounded border border-black/20 dark:border-white/20 bg-black/10 dark:bg-white/10 text-xs font-mono text-amber-200"
          />
          <button
            onClick={() => executeXdxMacro(macroInput)}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded flex items-center gap-1 transition-colors text-xs"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Roll</span>
          </button>
          <button
            onClick={handleSaveCurrentMacro}
            className="p-1.5 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 border border-black/10 dark:border-white/10"
            title="Save to macros list"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {/* Quick Macaroni presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
          <span className="opacity-60">Macaroni Presets:</span>
          {[
            { label: 'Att & Dmg &', f: '[d20+#BAB+#STR] & [1d8+#STR] "slashing"' },
            { label: 'Crit Alert <>', f: '[d20+#BAB+#STR] & <11"Dragonfire Critical Strike!">' },
            { label: 'Stepper !', f: 'this: 10-1! | this=0 | $' },
            { label: 'Decision <?>', f: '<? "Tactical Tactic" | attack / defend / #HP / [] >' },
            { label: 'Mutate HP^-d6', f: 'HP^-d6' },
            { label: 'Push >>HP-5', f: '"blood drain" >>HP-5' },
            { label: 'Math Only {}', f: '{firebreath}' },
            { label: 'DC+#CON', f: 'DC+#CON "Fort DC"' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setMacroInput(item.f);
                executeXdxMacro(item.f);
              }}
              className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-400 border border-black/10 dark:border-white/10 font-mono transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Syntax Help */}
        {showHelp && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] leading-relaxed space-y-1 font-mono">
            <div className="font-bold text-amber-400 uppercase text-xs mb-1">Macaroni Vocabulary Guide:</div>
            <p><strong>#FIELD</strong> : Reference field/stat as constant (e.g. <code>#HP</code>, <code>#BAB</code>, <code>#STR</code>, <code>#FORT</code>, <code>#AC</code>). Hover fields on sheet for 3s to copy.</p>
            <p><strong>[ ]</strong> : Evaluate calculation or dice expression (e.g. <code>[1d4 + #STR]</code>).</p>
            <p><strong>&lt;&lt;name</strong> : Listen for or pull another named macro (e.g. <code>&lt;&lt;firebreath</code>).</p>
            <p><strong>&#123;name&#125;</strong> : Mathematical context call (strips flavor text/dialogues, pulls number only).</p>
            <p><strong>&quot;&quot;</strong> : Written text to print with roll; ignored inside mathematical calls.</p>
            <p><strong>^</strong> : Increase/delta mutator on called field (e.g. <code>HP^-d6</code>, <code>rounds^-1</code>).</p>
            <p><strong>&gt;&gt;FIELD-5</strong> : Pushes value to sheet stat directly (no spaces between call and math).</p>
            <p><strong>&lt;TAG"message"&gt;</strong> : Trigger styled alert card modal (e.g. <code>&lt;11"Dragonfire Crit!"&gt;</code>). Configurable in DSL Studio.</p>
            <p><strong>&lt;?&gt;</strong> : Interactive decision query with selectable options and custom [ ] input.</p>
            <p><strong>&amp;</strong> : Multi-slot separator. Access slots via <code>.1</code>, <code>.2</code> (e.g. <code>#(firebolt.2)</code>).</p>
            <p><strong>|</strong> : Conditional branching and if-then pipeline (e.g. <code>d20 | 20 | &lt;"Crit!"&gt;</code>).</p>
            <p><strong>!</strong> : Stepper advancement trigger. Advanced automatically or via Step button.</p>
            <p><strong>$</strong> : Finished/absolute termination for expired buffs and loops.</p>
            <p className="text-[10px] text-slate-400 italic pt-1">Note: Plain text outside symbols and quotes is inert and safely ignored.</p>
          </div>
        )}
      </div>

      {/* Output Console / Roll History Log */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-75 flex items-center justify-between">
          <span>Terminal Output Log</span>
          <button
            onClick={() => setRollLogs([])}
            className="text-[10px] opacity-60 hover:opacity-100"
          >
            Clear Log
          </button>
        </div>

        {rollLogs.map((log) => (
          <div
            key={log.id}
            className="p-2.5 rounded-lg bg-black/10 dark:bg-white/5 border border-black/15 dark:border-white/15 space-y-1.5 font-mono"
          >
            <div className="flex items-center justify-between text-[10px] opacity-60">
              <span className="font-bold text-amber-500">&gt; {log.rawInput}</span>
              <span>{log.timestamp}</span>
            </div>

            <div className="font-bold text-sm text-cyan-400 dark:text-cyan-300">
              {log.resultOutput}
            </div>

            {/* If multi-slot results, render slot chips */}
            {log.slots && log.slots.length > 1 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-black/10 dark:border-white/10">
                {log.slots.map((s) => (
                  <span
                    key={s.slot}
                    className="px-1.5 py-0.5 rounded bg-black/30 border border-cyan-800/40 text-[10px] text-cyan-300"
                  >
                    .{s.slot} ➜ {s.evaluated}
                  </span>
                ))}
              </div>
            )}

            {log.isFinished && (
              <div className="text-[10px] text-amber-400 font-bold">
                ✓ Terminated ($)
              </div>
            )}

            {log.appliedPushes && (
              <div className="text-[10px] text-rose-400 font-semibold pt-0.5 border-t border-black/10 dark:border-white/10">
                ⚡ {log.appliedPushes.join(' · ')}
              </div>
            )}

            {log.quirkyMessage && (
              <div className="text-[10px] text-amber-300/80 italic">
                🧀 {log.quirkyMessage}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Saved Macros Quick List */}
      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase opacity-75">
          <span>Stored Macros ({savedMacros.length})</span>
          <span className="opacity-60">Call with &lt;&lt;name</span>
        </div>

        <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto text-[11px]">
          {savedMacros.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMacroInput(`<<${m.name}`);
                executeXdxMacro(`<<${m.name}`);
              }}
              className="p-1.5 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 text-left border border-black/10 dark:border-white/10 flex items-center justify-between group transition-colors"
            >
              <div className="truncate min-w-0">
                <span className="font-bold text-amber-500 group-hover:underline">
                  &lt;&lt;{m.name}
                </span>
                <span className="text-[9px] opacity-60 block truncate">{m.formula}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isDocked) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[92vh] bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-4 overflow-y-auto text-slate-100">
        {content}
      </div>
    </div>
  );
};
