import React, { useState } from 'react';
import {
  Code,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Dices,
  Calculator,
  Sparkles,
  Zap,
  Play,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { PF1Character } from '../../types/character';
import { evaluateFormula, buildFormulaContext } from '../../engine/formula';
import { evaluateConditions } from '../../engine/pf1eMath';

export interface DSLBibleDrawerProps {
  character: PF1Character;
  onRollFormula?: (formula: string, label?: string) => void;
}

export const DSLBibleDrawer: React.FC<DSLBibleDrawerProps> = ({
  character,
  onRollFormula,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [testInput, setTestInput] = useState<string>('1d20 + bab + str_mod');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const cond = evaluateConditions(character.conditions);
  const context = buildFormulaContext(character, cond);
  const evaluationResult = evaluateFormula(testInput, context);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(text);
    setTimeout(() => setCopiedSnippet(null), 1500);
  };

  return (
    <div className="border-b border-cyan-500/30 bg-slate-950 text-slate-100 select-none print:hidden transition-all shadow-md">
      {/* Top Foldable Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 bg-slate-950 hover:bg-slate-900/80 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left group flex-1 min-w-0"
        >
          <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50 group-hover:border-cyan-400 transition-colors shrink-0">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-xs text-amber-300 tracking-wide">
              DSLBible
            </span>
            <span className="text-[11px] text-slate-400 font-sans hidden sm:inline truncate">
              Reactive Formula &amp; Macro Language Reference Guide
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-800 hidden md:inline">
              Variables • Dice • Math • Triggers
            </span>
          </div>
        </button>

        {/* Quick Sandbox in the bar when folded */}
        {!isExpanded && (
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
            <span className="text-[10px] text-slate-400">Quick Test:</span>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-xs w-48 font-mono focus:border-cyan-400 focus:outline-none"
              placeholder="e.g. 1d8+str_mod"
            />
            <span className="text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              = {evaluationResult.evaluated}
            </span>
            {onRollFormula && (
              <button
                onClick={() => onRollFormula(evaluationResult.evaluated, 'Quick DSL Roll')}
                className="p-1 rounded hover:bg-slate-800 text-amber-400"
                title="Roll formula"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>{isExpanded ? 'Fold Reference' : 'Expand DSLBible'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>
      </div>

      {/* Expanded DSL Bible Drawer */}
      {isExpanded && (
        <div className="p-4 md:p-6 bg-[#0a0f18] border-t border-cyan-900/40 space-y-5 animate-in fade-in duration-200">
          {/* Header Description */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-cyan-900/30">
            <div>
              <h4 className="font-serif font-bold text-sm text-amber-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>The Pathfinder 1e DSLBible Reference</span>
              </h4>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Every formula field across the workspace (weapons, actions, custom objects, inventory macros) uses this reactive expression engine.
              </p>
            </div>

            {/* Live Interactive Sandbox */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 pl-1">Live Tester:</span>
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 w-52 focus:border-cyan-400 focus:outline-none"
                placeholder="e.g. 2d6 + (level * 2)"
              />
              <span className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
                {evaluationResult.evaluated}
              </span>
              {onRollFormula && (
                <button
                  onClick={() => onRollFormula(evaluationResult.evaluated, 'DSLBible Sandbox Roll')}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-colors"
                  title="Roll this expression"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll</span>
                </button>
              )}
            </div>
          </div>

          {/* Reference Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* 1. Core Variables */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-purple-400 font-bold border-b border-slate-800 pb-1">
                <span>1. Character Attributes</span>
                <span className="text-[10px] text-slate-500">Variables</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">level</code>
                  <span className="text-slate-400">{character.level} (Total Level)</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">bab</code>
                  <span className="text-slate-400">+{character.baseAttackBonus}</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">str_mod, dex_mod</code>
                  <span className="text-slate-400">Effective ASB</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">con_mod, int_mod</code>
                  <span className="text-slate-400">Effective ASB</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">wis_mod, cha_mod</code>
                  <span className="text-slate-400">Effective ASB</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">hp_current, hp_max</code>
                  <span className="text-slate-400">Health Points</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-purple-300 font-bold">ac, cmb, cmd</code>
                  <span className="text-slate-400">Combat Defenses</span>
                </li>
              </ul>
            </div>

            {/* 2. Math Functions */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-pink-400 font-bold border-b border-slate-800 pb-1">
                <span>2. Math Functions</span>
                <span className="text-[10px] text-slate-500">Evaluators</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">floor(x)</code>
                  <span className="text-slate-400">Round down</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">ceil(x)</code>
                  <span className="text-slate-400">Round up</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">round(x)</code>
                  <span className="text-slate-400">Nearest integer</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">min(a, b), max(a, b)</code>
                  <span className="text-slate-400">Bounds clamp</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">abs(x)</code>
                  <span className="text-slate-400">Absolute value</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-pink-300 font-bold">+, -, *, /, %, ^</code>
                  <span className="text-slate-400">Standard math</span>
                </li>
              </ul>
            </div>

            {/* 3. Dice & Text Concatenation */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800 pb-1">
                <span>3. Dice &amp; Strings</span>
                <span className="text-[10px] text-slate-500">Formulas</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex justify-between">
                  <code className="text-amber-300 font-bold">1d20, 2d6, 3d8</code>
                  <span className="text-slate-400">Dice rolling</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-emerald-300 font-bold">" fire", " slashing"</code>
                  <span className="text-slate-400">Damage types</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-sky-300 font-bold">+ (string concat)</code>
                  <span className="text-slate-400">Combined damage</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-amber-300 font-bold">&#123;object_name&#125;</code>
                  <span className="text-slate-400">Referenced object</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-amber-300 font-bold">4d6k3</code>
                  <span className="text-slate-400">Drop lowest</span>
                </li>
              </ul>
            </div>

            {/* 4. Stepper & Macros */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-slate-800 pb-1">
                <span>4. Steppers &amp; Modifiers</span>
                <span className="text-[10px] text-slate-500">Macros</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex justify-between">
                  <code className="text-cyan-300 font-bold">+2&gt;&gt;target</code>
                  <span className="text-slate-400">Apply buff modifier</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-cyan-300 font-bold">-1&gt;&gt;hp</code>
                  <span className="text-slate-400">Apply stat penalty</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-cyan-300 font-bold">&lt;&lt;counter</code>
                  <span className="text-slate-400">Track round duration</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-slate-400 font-bold">// note</code>
                  <span className="text-slate-500">Comment notation</span>
                </li>
                <li className="flex justify-between">
                  <code className="text-amber-300 font-bold">#FORT, #REF, #WILL</code>
                  <span className="text-slate-400">Save macros</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Common Snippet Quick-Copies */}
          <div className="pt-2 border-t border-cyan-900/30 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[11px] font-bold text-slate-400">Click to Copy Snippet:</span>
            {[
              { label: '2-Handed Power Attack', code: '6 + (3 * floor(bab / 4))' },
              { label: 'Dragon Breath', code: '2d6 + (5 * floor(level / 2)) + " fire"' },
              { label: 'Sneak Attack', code: 'ceil(level / 2) + "d6 precision"' },
              { label: 'Two-Hand Str Damage', code: 'round(str_mod * 1.5)' },
              { label: 'Primary Weapon Attack', code: '1d20 + bab + str_mod' },
              { label: 'Full Attack Concatenation', code: 'mainattack + " and " + firebreath' },
            ].map((snippet) => (
              <button
                key={snippet.label}
                onClick={() => copyToClipboard(snippet.code)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
                title={`Copy: ${snippet.code}`}
              >
                <span>{snippet.label}</span>
                {copiedSnippet === snippet.code ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
