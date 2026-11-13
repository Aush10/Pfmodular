import React, { useState } from 'react';
import {
  Code,
  Plus,
  Trash2,
  Play,
  Dices,
  Sparkles,
  Zap,
  HelpCircle,
  Check,
  Palette,
  Volume2,
  ExternalLink,
  Layers,
  Activity,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  PF1Character,
  CustomFormulaObject,
  UiMakePreset,
  MacaroniCategory,
} from '../../types/character';
import {
  evaluateFormula,
  buildFormulaContext,
  tokenizeFormula,
} from '../../engine/formula';
import { evaluateConditions } from '../../engine/pf1eMath';
import {
  executeMacaroni,
  resolveUiMakePreset,
  applyMacaroniToCharacter,
  BUFF_MATRIX_COLUMNS,
  BUFF_MATRIX_ROWS,
} from '../../engine/macaroni';

interface SheetPage4FormulaStudioProps {
  character: PF1Character;
  theme: string;
  fontClass: string;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  onRollFormula: (formula: string, label?: string) => void;
}

export const SheetPage4FormulaStudio: React.FC<SheetPage4FormulaStudioProps> = ({
  character,
  theme,
  fontClass,
  onUpdateCharacter,
  onRollFormula,
}) => {
  const [activeTab, setActiveTab] = useState<'macros' | 'ui_styler' | 'bible'>('macros');
  const [testExpression, setTestExpression] = useState('MageArmor:|<^{7:2}+4>|$');
  const [lastQuirkyNote, setLastQuirkyNote] = useState<string>(
    'Hover any stat for 3s to copy its #CALL, or run a <^...> buff macro below!'
  );
  const [copiedRecipe, setCopiedRecipe] = useState<string | null>(null);
  const [scratchpadText, setScratchpadText] = useState(
    `# Valerius Combat Notes & Macaroni Vocabulary
- Primary Strike: [d20 + #BAB + #STR] & [1d12 + round(#STR * 1.5)] "slashing"
- Sustained Buff: MageArmor:|<^{7:2}+4>|$
- Dragon breath: {firebreath}
- Combined combo: {mainattack_with_fire}
- Stepper countdown: this: 10-1! | this=0 | $
- UI Make Trigger: <11"Dragonfire Critical!">\n- Decision query: <? "Proceed?" | yes / no / #HP / [] >`
  );

  const isParchment = theme === 'parchment';
  const isBlueprint = theme === 'blueprint';
  const isMythWeavers = theme === 'mythweavers';

  const cardBg = isParchment
    ? 'bg-amber-50/70 border-amber-800/20 text-stone-900 shadow-sm'
    : isBlueprint
    ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-50'
    : isMythWeavers
    ? 'bg-[#15171a] border-[#2d3139] text-slate-100'
    : 'bg-white border-black text-black';

  const headerBg = isParchment
    ? 'bg-amber-900/10 border-amber-900/20 text-amber-950 font-serif'
    : isBlueprint
    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 font-mono'
    : isMythWeavers
    ? 'bg-[#0f1113] border-[#2d3139] text-amber-400 font-serif'
    : 'bg-neutral-100 border-black text-black font-sans';

  const inputStyle = isParchment
    ? 'bg-white/80 border-amber-900/30 text-stone-900 focus:border-amber-700 focus:bg-white'
    : isBlueprint
    ? 'bg-slate-950/80 border-cyan-700/60 text-cyan-200 focus:border-cyan-400'
    : isMythWeavers
    ? 'bg-[#0d0e10] border-[#383d47] text-amber-100 focus:border-amber-500'
    : 'bg-white border-neutral-400 text-black';

  // Formula Context
  const cond = evaluateConditions(character.conditions);
  const context = buildFormulaContext(character, cond);

  const setField = <K extends keyof PF1Character>(key: K, value: PF1Character[K]) => {
    onUpdateCharacter((prev) => ({ ...prev, [key]: value }));
  };

  // Add custom formula object
  const addCustomObject = () => {
    const newObj: CustomFormulaObject = {
      id: `obj-${Date.now()}`,
      name: `macro_${character.customObjects.length + 1}`,
      description: 'Player defined Macaroni verb macro',
      formula: '[d20 + #BAB + #STR] "to hit"',
      category: 'action',
      stepCount: 0,
    };
    setField('customObjects', [...character.customObjects, newObj]);
  };

  const removeCustomObject = (id: string) => {
    setField(
      'customObjects',
      character.customObjects.filter((o) => o.id !== id)
    );
  };

  const updateCustomObject = (id: string, updates: Partial<CustomFormulaObject>) => {
    setField(
      'customObjects',
      character.customObjects.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  // UI Make Presets State & Handlers
  const uiPresets: UiMakePreset[] = character.uiMakePresets || [
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

  const updateUiPresets = (newPresets: UiMakePreset[]) => {
    setField('uiMakePresets', newPresets);
  };

  const addUiPreset = () => {
    const nextTag = Math.max(0, ...uiPresets.map((p) => p.tag)) + 1;
    const newPreset: UiMakePreset = {
      tag: nextTag,
      name: `Preset Tag ${nextTag}`,
      layout: 'floating_card',
      font: 'serif',
      theme: 'default_amber',
      soundCue: 'bell',
    };
    updateUiPresets([...uiPresets, newPreset]);
  };

  const removeUiPreset = (tag: number) => {
    updateUiPresets(uiPresets.filter((p) => p.tag !== tag));
  };

  const updateUiPreset = (tag: number, updates: Partial<UiMakePreset>) => {
    updateUiPresets(
      uiPresets.map((p) => (p.tag === tag ? { ...p, ...updates } : p))
    );
  };

  const testFireUiPreset = (preset: UiMakePreset) => {
    window.dispatchEvent(
      new CustomEvent('macaroni:alert', {
        detail: {
          id: `alert-${Date.now()}`,
          message: `Testing UI Make Preset Tag <${preset.tag}>: "${preset.name}"`,
          tag: preset.tag,
          preset,
          timestamp: Date.now(),
        },
      })
    );
  };

  // Advance step category macro with ! trigger
  const handleTriggerStep = (obj: CustomFormulaObject) => {
    const nextStep = (obj.stepCount || 0) + 1;
    const macaroniResult = executeMacaroni(obj.formula, {
      character,
      formulaContext: context,
      stepCount: nextStep,
      uiPresets,
    });

    // Check if alert events fired
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

    updateCustomObject(obj.id, {
      stepCount: nextStep,
    });
  };

  // Render colored tokens for an expression
  const renderSyntaxHighlightedTokens = (formula: string) => {
    const tokens = tokenizeFormula(formula);
    return (
      <div className="flex flex-wrap items-center font-mono text-xs gap-0.5">
        {tokens.map((tok, idx) => {
          let colorClass = 'text-slate-300';
          if (tok.type === 'dice') colorClass = 'text-amber-400 font-bold';
          else if (tok.type === 'number') colorClass = 'text-cyan-400 font-semibold';
          else if (tok.type === 'operator') colorClass = 'text-sky-300 font-bold';
          else if (tok.type === 'function') colorClass = 'text-pink-400 font-bold';
          else if (tok.type === 'variable') colorClass = 'text-purple-300 font-semibold underline decoration-dotted';
          else if (tok.type === 'string') colorClass = 'text-emerald-400 font-serif';
          else if (tok.type === 'punctuation') colorClass = 'text-slate-400';

          return (
            <span key={idx} className={colorClass}>
              {tok.value}
            </span>
          );
        })}
      </div>
    );
  };

  // Live tester outcome using Macaroni engine
  const macaroniOutcome = executeMacaroni(testExpression, {
    character,
    formulaContext: context,
    uiPresets,
  });

  const handleRunExpressionAndApply = (exprToRun: string, label?: string) => {
    const outcome = executeMacaroni(exprToRun, {
      character,
      formulaContext: context,
      uiPresets,
    });

    if (outcome.alertEvents && outcome.alertEvents.length > 0) {
      outcome.alertEvents.forEach((alert) => {
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
    if (outcome.queryEvent) {
      window.dispatchEvent(
        new CustomEvent('macaroni:query', {
          detail: outcome.queryEvent,
        })
      );
    }

    // Apply <^...> buff make events or ^ / >> state mutations directly to the character!
    if (
      (outcome.buffMakeEvents && outcome.buffMakeEvents.length > 0) ||
      (outcome.stateMutations && outcome.stateMutations.length > 0)
    ) {
      onUpdateCharacter((prev) => {
        const applied = applyMacaroniToCharacter(prev, outcome);
        setLastQuirkyNote(`${applied.statusMessage} — 🧀 ${applied.quirkyMessage}`);
        return applied.updatedCharacter;
      });
    } else if (outcome.quirkyMessage) {
      setLastQuirkyNote(`🧀 ${outcome.quirkyMessage}`);
    }

    onRollFormula(outcome.fullOutput, label || exprToRun);
  };

  const handleTestRoll = () => {
    handleRunExpressionAndApply(testExpression, testExpression);
  };

  // Scratchpad interpolation: replace {formula} with evaluated result
  const renderInterpolatedScratchpad = (text: string) => {
    return text.replace(/\{([^{}]+)\}/g, (_match, expr) => {
      const res = executeMacaroni(expr, { character, formulaContext: context, uiPresets });
      return res.fullOutput;
    });
  };

  return (
    <div className={`space-y-4 ${fontClass} transition-colors duration-200`}>
      {/* 1. Header Banner & DSL Navigation */}
      <div className={`border rounded-lg p-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Macaroni Macro Language &amp; Object Studio
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('macros')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                activeTab === 'macros'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-300'
              }`}
            >
              Macros &amp; Objects
            </button>
            <button
              onClick={() => setActiveTab('ui_styler')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                activeTab === 'ui_styler'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-300'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>UI Make Styler &lt;&gt;</span>
            </button>
            <button
              onClick={() => setActiveTab('bible')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                activeTab === 'bible'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Vocabulary Bible</span>
            </button>
          </div>
        </div>
        <p className="text-xs opacity-80 leading-relaxed">
          Verb-centric, digestible macro language with single-purpose symbols. Uncontextualized plain text outside quotes is safely ignored.
          Categorize macros as <strong>action</strong>, <strong>step</strong>, <strong>logic</strong>, or <strong>placeholder</strong>.
        </p>

        {/* Quick symbol strip */}
        <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-black/20 border border-black/10 text-amber-300 font-bold">
            # [ ] &lt;&lt; : &#123; &#125; "" ^ &gt;&gt; &lt;&gt; &lt;?&gt; &amp; | $ ! this ~
          </span>
          <span className="text-[10px] opacity-75 self-center">
            Hover sheet stats for 3s to view &amp; copy #CALL identifiers
          </span>
        </div>
      </div>

      {/* Tab 2: UI Make Styler (<TAG"">) */}
      {activeTab === 'ui_styler' && (
        <div className={`border rounded-lg p-4 ${cardBg} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-2 border-black/10 dark:border-white/10">
            <div>
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span>UI Make Presets Drawer &lt;TAG"message"&gt;</span>
              </h4>
              <p className="text-xs opacity-75 mt-0.5">
                Assign a number tag to a &lt;&gt; construct to trigger custom card styles, banners, modals, and sound cues.
                Exact tag matches first; prefix matches second (e.g. <code>&lt;112""&gt;</code> resolves to Tag <code>11</code>); untagged or unknown tags fall back to Default.
              </p>
            </div>
            <button
              onClick={addUiPreset}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Preset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uiPresets.map((preset) => (
              <div
                key={preset.tag}
                className="p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      Tag {preset.tag}
                    </span>
                    <input
                      type="text"
                      value={preset.name}
                      onChange={(e) => updateUiPreset(preset.tag, { name: e.target.value })}
                      placeholder="Preset Name"
                      className={`font-bold text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => testFireUiPreset(preset)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1"
                      title="Test fire this UI Alert preset"
                    >
                      <Play className="w-3 h-3" />
                      <span>Test</span>
                    </button>
                    {preset.tag !== 1 && (
                      <button
                        onClick={() => removeUiPreset(preset.tag)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <span className="opacity-70 text-[10px] block mb-0.5">Layout:</span>
                    <select
                      value={preset.layout}
                      onChange={(e) => updateUiPreset(preset.tag, { layout: e.target.value as any })}
                      className={`w-full text-xs px-1.5 py-0.5 rounded border ${inputStyle}`}
                    >
                      <option value="floating_card">Floating Card</option>
                      <option value="banner">Banner (Top)</option>
                      <option value="modal">Modal (Center)</option>
                      <option value="toast">Toast (Bottom)</option>
                    </select>
                  </div>
                  <div>
                    <span className="opacity-70 text-[10px] block mb-0.5">Theme Palette:</span>
                    <select
                      value={preset.theme}
                      onChange={(e) => updateUiPreset(preset.tag, { theme: e.target.value as any })}
                      className={`w-full text-xs px-1.5 py-0.5 rounded border ${inputStyle}`}
                    >
                      <option value="default_amber">Amber Glow</option>
                      <option value="crimson_gold">Crimson &amp; Gold</option>
                      <option value="celestial_cyan">Celestial Cyan</option>
                      <option value="toxic_emerald">Toxic Emerald</option>
                      <option value="necrotic_slate">Necrotic Slate</option>
                    </select>
                  </div>
                  <div>
                    <span className="opacity-70 text-[10px] block mb-0.5">Font Style:</span>
                    <select
                      value={preset.font}
                      onChange={(e) => updateUiPreset(preset.tag, { font: e.target.value as any })}
                      className={`w-full text-xs px-1.5 py-0.5 rounded border ${inputStyle}`}
                    >
                      <option value="serif">Classic Serif</option>
                      <option value="gothic">Gothic Bold</option>
                      <option value="sans">Modern Sans</option>
                      <option value="mono">Terminal Mono</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div>
                    <span className="opacity-70 text-[10px] block mb-0.5">Image / GIF URL (Optional):</span>
                    <input
                      type="text"
                      value={preset.imageUrl || ''}
                      onChange={(e) => updateUiPreset(preset.tag, { imageUrl: e.target.value })}
                      placeholder="https://... or data:image/..."
                      className={`w-full text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="opacity-70 text-[10px] block mb-0.5">Hyperlink URL:</span>
                      <input
                        type="text"
                        value={preset.hyperlinkUrl || ''}
                        onChange={(e) => updateUiPreset(preset.tag, { hyperlinkUrl: e.target.value })}
                        placeholder="e.g. https://aonprd.com/..."
                        className={`w-full text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <span className="opacity-70 text-[10px] block mb-0.5">Hyperlink Label:</span>
                      <input
                        type="text"
                        value={preset.hyperlinkLabel || ''}
                        onChange={(e) => updateUiPreset(preset.tag, { hyperlinkLabel: e.target.value })}
                        placeholder="Archives of Nethys Link"
                        className={`w-full text-xs px-2 py-0.5 rounded border ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Macaroni Syntax Bible */}
      {activeTab === 'bible' && (
        <div className={`border rounded-lg p-4 ${cardBg} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-2 border-black/10 dark:border-white/10">
            <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span>The Macaroni Macro Vocabulary Bible</span>
            </h4>
            <span className="text-xs font-mono opacity-70">PF1e Cheese-Friendly Spec</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {[
              {
                sym: '#',
                name: 'Reference Field / Constant',
                ex: '#HP, #STR, #BAB, #FORT, #AC',
                desc: 'Accesses a defined character field or ability score. Hover any field for 3s to copy.',
              },
              {
                sym: '[]',
                name: 'Evaluate Calculation',
                ex: '[1d4 + #STR], [d20 + #BAB]',
                desc: 'Evaluates dice rolls and mathematical equations strictly within brackets.',
              },
              {
                sym: '<<',
                name: 'Listen / Pull External Macro',
                ex: '<<firebreath, <<mainattack',
                desc: 'Invokes and pulls in another saved macro or object.',
              },
              {
                sym: ':',
                name: 'Name / Definition',
                ex: 'firebolt: 2d6 & "burn" 1d8',
                desc: 'Labels a macro name for subsequent calls.',
              },
              {
                sym: '{}',
                name: 'Mathematical Context Call',
                ex: '{firebreath}',
                desc: 'Calls the numerical result of a macro while cleanly stripping any text or dialogue.',
              },
              {
                sym: '""',
                name: 'Written Text / Flavor Dialogue',
                ex: '"to hit +", "fire damage"',
                desc: 'Text to print in rolls. Ignored inside math calculations {}.',
              },
              {
                sym: '^',
                name: 'Delta Mutator / Increase',
                ex: 'HP^-d6, rounds^-1, HP^+10',
                desc: 'Adjusts a called field by the specified formula.',
              },
              {
                sym: '>>',
                name: 'Send to Remote Target',
                ex: '>>HP-5, >>THP+10',
                desc: 'Sends a value to a remote sheet area without changing the source formula.',
              },
              {
                sym: '<>',
                name: 'Make UI Construct / Tagged Alert',
                ex: '<11"Dragonfire Critical!">, <^>',
                desc: 'Renders a styled alert card modal using defined UI Make presets.',
              },
              {
                sym: '<?>',
                name: 'Make Interactive Decision Query',
                ex: '<? "Choose tactic" | yes / no / #HP / [] >',
                desc: 'Prompts the user with choice buttons or custom formula input.',
              },
              {
                sym: '&',
                name: 'Multi-Slot Separator',
                ex: 'firebolt: 2d6 & "burn" 1d8',
                desc: 'Runs multiple macro slots together. Address slots with .1, .2 (e.g. #(firebolt.2)).',
              },
              {
                sym: '|',
                name: 'Conditional Pipeline / Branch',
                ex: 'd20 | 20 | <"Crit!">, this=0 | $',
                desc: 'Branching and if-then evaluation.',
              },
              {
                sym: '!',
                name: 'Stepper Trigger Advancement',
                ex: 'this: 10-1!',
                desc: 'Advances stepper counter by 1 step. Can be self-altering.',
              },
              {
                sym: '$',
                name: 'Finished / Absolute Termination',
                ex: 'this: 10-1! | this=0 | $',
                desc: 'Marks a macro or expiring buff as finished and terminates execution.',
              },
              {
                sym: '~',
                name: 'External Context Scoping',
                ex: '~target[#AC], ~companion[#HP]',
                desc: 'Runs a calculation within the scope of an external target or companion.',
              },
              {
                sym: 'this',
                name: 'Self-Referencing Stepper Value',
                ex: 'this: 10-1! | this=0 | $',
                desc: 'Refers to the macro object itself in self-altering stepper countdowns.',
              },
              {
                sym: '<^...>',
                name: 'Make Buff in Buff Box',
                ex: 'MageArmor:|<^{7:2}+4>|$, <^AC.Armor+4>, <^ENHANCEMENTBONUSTOAC+4>',
                desc: 'Creates/toggles a named Buff Box effect or populates the 19x19 matrix directly. Append |$ to lock once.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-amber-400 font-mono">
                    {item.sym}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {item.name}
                  </span>
                </div>
                <div className="p-1 rounded bg-black/20 text-cyan-300 text-xs">
                  <code>{item.ex}</code>
                </div>
                <p className="text-[11px] opacity-75">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Standard Buffs & Conditions Macaroni Recipe Guide */}
          <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h5 className="font-bold text-sm text-cyan-300 flex items-center gap-2 font-mono uppercase">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Standard Buffs &amp; Conditions Recipe Guide (&lt;^...&gt;)</span>
                </h5>
                <p className="text-xs opacity-75 mt-0.5">
                  Every <code>&lt;^...&gt;</code> buff supports 3 target styles: Matrix Coordinates{' '}
                  <code>&#123;col:row&#125;</code>, Shorthand <code>Stat.Type</code>, or{' '}
                  <code>ALLCAPS</code> phrases. Re-running a named buff toggles it off/on unless locked with{' '}
                  <code>$</code>. Unnamed buffs populate the 19-row base matrix directly.
                </p>
              </div>
              {lastQuirkyNote && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {lastQuirkyNote}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {[
                {
                  title: 'Sustained +10 Untyped AC (Matrix or Named)',
                  tag: 'Sustained Buff',
                  coord: 'SustainedWard:|<^{7:1}+10>|$',
                  short: '<^AC+10>',
                  allcaps: 'SustainedWard:|<^UNTYPEDBONUSTOAC+10>|$',
                  desc: 'Targets Column 7 (AC), Row 1 (Untyped) with +10. Without a label (<^AC+10>), populates cell {7:1} directly.',
                },
                {
                  title: 'Mage Armor (+4 Enhancement/Armor to AC)',
                  tag: 'Spell • Locked ($)',
                  coord: 'MageArmor:|<^{7:2}+4>|$',
                  short: 'MageArmor:|<^AC.Enhancement+4>|$',
                  allcaps: 'MageArmor:|<^ENHANCEMENTBONUSTOAC+4>|$',
                  desc: 'Targets Column 7 (AC), Row 2 (Enhancement) with +4. Terminated with $ so running again will not double-stack.',
                },
                {
                  title: 'Bardic Inspiration +2 (Inspire Courage)',
                  tag: 'Party Buff • Toggleable',
                  coord: 'BardicInspiration: <^{2:4}+2, {3:4}+2, {6:11}+2>',
                  short: 'BardicInspiration: <^MATTACK.Competence+2, RATTACK.Competence+2, WILL.Morale+2>',
                  allcaps: 'BardicInspiration: <^COMPETENCEBONUSTOMATTACK+2, COMPETENCEBONUSTORATTACK+2>',
                  desc: '+2 Competence on Melee {2:4} & Ranged {3:4} attacks, +2 Morale on Will {6:11}. Run again to toggle off.',
                },
                {
                  title: 'Barbarian Rage (+4 STR/CON, +2 Will, -2 AC)',
                  tag: 'Class Feature • Toggleable',
                  coord: 'BarbarianRage: <^{8:11}+4, {10:11}+4, {6:11}+2, {7:1}-2>',
                  short: 'BarbarianRage: <^STR.Morale+4, CON.Morale+4, WILL.Morale+2, AC-2>',
                  allcaps: 'BarbarianRage: <^MORALEBONUSTOSTR+4, MORALEBONUSTOCON+4, MORALEBONUSTOWILL+2>',
                  desc: 'Multi-stat Morale boost to STR & CON (+4) and Will (+2) with an Untyped -2 AC penalty.',
                },
                {
                  title: 'Dodge Feat (Permanent +2 Dodge to AC)',
                  tag: 'Permanent Feat • Locked ($)',
                  coord: 'DodgeFeat:|<^{7:6}+2>|$',
                  short: 'DodgeFeat:|<^AC.Dodge+2>|$',
                  allcaps: 'DodgeFeat:|<^DODGEBONUSTOAC+2>|$',
                  desc: 'Targets Column 7 (AC), Row 6 (Dodge) with a permanent +2 bonus locked once via $.',
                },
                {
                  title: 'Grappled Condition (-4 DEX, -2 Attack)',
                  tag: 'Debuff Condition',
                  coord: 'Grappled: <^{9:1}-4, {2:1}-2, {3:1}-2>',
                  short: 'Grappled: <^DEX-4, MATTACK-2, RATTACK-2>',
                  allcaps: 'Grappled: <^UNTYPEDPENALTYTODEX-4, UNTYPEDPENALTYTOMATTACK-2>',
                  desc: 'Applies -4 Untyped penalty to Dexterity {9:1} and -2 to Melee {2:1} & Ranged {3:1} attacks.',
                },
                {
                  title: 'Sickened Condition (-2 All Attacks & Saves)',
                  tag: 'Debuff Condition',
                  coord: 'Sickened: <^{2:1}-2, {3:1}-2, {4:1}-2, {5:1}-2, {6:1}-2>',
                  short: 'Sickened: <^MATTACK-2, RATTACK-2, FORT-2, REF-2, WILL-2>',
                  allcaps: 'Sickened: <^UNTYPEDPENALTYTOMATTACK-2, UNTYPEDPENALTYTOFORT-2>',
                  desc: '-2 Untyped penalty across Melee/Ranged attacks and Fortitude, Reflex, and Will saves.',
                },
                {
                  title: 'Shaken Condition (-2 Attacks, Saves & Checks)',
                  tag: 'Fear Debuff',
                  coord: 'Shaken: <^{2:1}-2, {3:1}-2, {4:1}-2, {5:1}-2, {6:1}-2>',
                  short: 'Shaken: <^MATTACK-2, RATTACK-2, FORT-2, REF-2, WILL-2>',
                  allcaps: 'Shaken: <^UNTYPEDPENALTYTOMATTACK-2, UNTYPEDPENALTYTOWILL-2>',
                  desc: '-2 Untyped penalty on attack rolls and saving throws while Shaken.',
                },
              ].map((recipe, rIdx) => (
                <div
                  key={rIdx}
                  className="p-3 rounded-lg border border-cyan-500/30 bg-slate-950/70 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-300 text-xs">{recipe.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        {recipe.tag}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="p-1.5 rounded bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                        <code className="text-amber-300 truncate">{recipe.coord}</code>
                        <span className="text-[9px] text-slate-500 shrink-0">&#123;col:row&#125;</span>
                      </div>
                      <div className="p-1.5 rounded bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                        <code className="text-emerald-300 truncate">{recipe.short}</code>
                        <span className="text-[9px] text-slate-500 shrink-0">Stat.Type</span>
                      </div>
                      <div className="p-1.5 rounded bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                        <code className="text-purple-300 truncate">{recipe.allcaps}</code>
                        <span className="text-[9px] text-slate-500 shrink-0">ALLCAPS</span>
                      </div>
                    </div>

                    <p className="text-[11px] opacity-75 font-sans leading-snug">{recipe.desc}</p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(recipe.coord);
                        setCopiedRecipe(recipe.title);
                        setTimeout(() => setCopiedRecipe(null), 1800);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono"
                    >
                      {copiedRecipe === recipe.title ? '✓ Copied!' : 'Copy Macro'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTestExpression(recipe.coord);
                        handleRunExpressionAndApply(recipe.coord, recipe.title);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] font-mono flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run in Buff Box</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 19x19 Matrix Coordinate Quick Reference */}
            <div className="p-3 rounded-lg bg-black/30 border border-cyan-500/20 space-y-2 text-[11px] font-mono">
              <div className="font-bold text-cyan-300 uppercase text-xs">
                19×19 Buff Matrix Coordinate Map &#123;Column : Row&#125;
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-amber-400 uppercase block mb-1">
                    Columns (1–19: Target Stat)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {BUFF_MATRIX_COLUMNS.map((col, idx) => (
                      <span
                        key={col}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200"
                      >
                        <strong className="text-cyan-400">{idx + 1}:</strong> {col.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 uppercase block mb-1">
                    Rows (1–19: Bonus Type)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {BUFF_MATRIX_ROWS.map((row, idx) => (
                      <span
                        key={row}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200"
                      >
                        <strong className="text-amber-400">{idx + 1}:</strong> {row}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab: Macros & Formula Objects */}
      {activeTab === 'macros' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Custom Formula Objects List (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Macaroni Macro Objects
                  </span>
                </div>
                <button
                  onClick={addCustomObject}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Macro</span>
                </button>
              </div>

              <div className="p-3 space-y-3">
                {character.customObjects.map((obj) => {
                  const evalResult = executeMacaroni(obj.formula, {
                    character,
                    formulaContext: context,
                    stepCount: obj.stepCount || 0,
                    uiPresets,
                  });

                  return (
                    <div
                      key={obj.id}
                      className="p-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] font-mono opacity-70">Name:</span>
                          <input
                            type="text"
                            value={obj.name}
                            onChange={(e) =>
                              updateCustomObject(obj.id, {
                                name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                              })
                            }
                            placeholder="e.g. firebreath"
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border text-amber-500 dark:text-amber-300 w-44 ${inputStyle}`}
                          />
                        </div>

                        {/* Category Selector: logic, placeholder, action, step */}
                        <div className="flex items-center gap-2">
                          <select
                            value={obj.category}
                            onChange={(e) =>
                              updateCustomObject(obj.id, { category: e.target.value as MacaroniCategory })
                            }
                            className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${
                              obj.category === 'action'
                                ? 'text-amber-400'
                                : obj.category === 'step'
                                ? 'text-cyan-400'
                                : obj.category === 'logic'
                                ? 'text-purple-400'
                                : 'text-slate-400'
                            } ${inputStyle}`}
                          >
                            <option value="action">action</option>
                            <option value="step">step</option>
                            <option value="logic">logic</option>
                            <option value="placeholder">placeholder</option>
                          </select>
                          <button
                            onClick={() => removeCustomObject(obj.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/20"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Formula Input */}
                      <div>
                        <span className="text-[10px] font-mono opacity-75 block mb-1">
                          Formula Expression:
                        </span>
                        <input
                          type="text"
                          value={obj.formula}
                          onChange={(e) => updateCustomObject(obj.id, { formula: e.target.value })}
                          placeholder='e.g. [d20+#BAB+#STR] & <11"Crit!"> or this: 10-1! | this=0 | $'
                          className={`w-full font-mono text-xs px-2 py-1 rounded border ${inputStyle}`}
                        />
                      </div>

                      {/* Token Preview */}
                      <div className="p-2 rounded bg-black/20 dark:bg-black/60 border border-black/10 dark:border-white/5">
                        <div className="text-[10px] font-mono text-slate-400 mb-1">
                          Color Tokenized View:
                        </div>
                        {renderSyntaxHighlightedTokens(obj.formula)}
                      </div>

                      {/* Evaluation Outcome, Stepper & Action Controls */}
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              evalResult.isError
                                ? 'bg-red-950/80 text-red-400 border border-red-800'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {evalResult.fullOutput || '(empty)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* If step category, provide ! Trigger Button */}
                          {obj.category === 'step' && (
                            <button
                              onClick={() => handleTriggerStep(obj)}
                              className="px-2.5 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-cyan-50 font-mono font-bold text-xs rounded flex items-center gap-1 shadow-xs"
                              title="Advance Stepper (!)"
                            >
                              <Activity className="w-3 h-3" />
                              <span>Step ({obj.stepCount || 0}) !</span>
                            </button>
                          )}

                          <button
                            onClick={() => setTestExpression(obj.name)}
                            className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 text-xs font-mono"
                            title="Load in tester"
                          >
                            Load
                          </button>

                          <button
                            onClick={() => handleRunExpressionAndApply(obj.formula, obj.name)}
                            className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1"
                          >
                            <Dices className="w-3 h-3" />
                            <span>Run</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Formula Tester & Dynamic Scratchpad (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Expression Tester */}
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Live Macaroni Expression Tester
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-mono opacity-75 mb-1">
                    Type any macro, equation, or &lt;^...&gt; buff construct:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testExpression}
                      onChange={(e) => setTestExpression(e.target.value)}
                      placeholder='e.g. MageArmor:|<^{7:2}+4>|$ or [d20+#BAB] & <11"Crit!">'
                      className={`flex-1 font-mono text-xs px-2 py-1.5 rounded border ${inputStyle}`}
                    />
                    <button
                      onClick={handleTestRoll}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Run</span>
                    </button>
                  </div>

                  {/* Preset Quick Tests */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 text-[10px] font-mono">
                    <span className="opacity-60">Try:</span>
                    {[
                      { label: 'MageArmor <^{7:2}+4>', expr: 'MageArmor:|<^{7:2}+4>|$' },
                      { label: '+10 Untyped AC', expr: 'SustainedWard:|<^{7:1}+10>|$' },
                      { label: 'Rage <^>', expr: 'BarbarianRage: <^STR.Morale+4, CON.Morale+4, WILL.Morale+2, AC-2>' },
                      { label: 'ALLCAPS <^>', expr: 'MageArmor:|<^ENHANCEMENTBONUSTOAC+4>|$' },
                      { label: '[d20+#BAB+#STR]', expr: '[d20 + #BAB + #STR]' },
                      { label: '<11"Crit!">', expr: '<11"Dragonfire Critical Strike!">' },
                      { label: 'Multi &', expr: 'firebolt: 2d6 & "burn" 1d8' },
                      { label: 'Stepper !', expr: 'this: 10-1! | this=0 | $' },
                      { label: 'Query <?>', expr: '<? "Continue attack?" | yes / no / #HP / [] >' },
                      { label: '{firebreath}', expr: '{firebreath}' },
                      { label: 'Mutate ^', expr: 'HP^-d6' },
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setTestExpression(p.expr)}
                        className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-300 border border-black/10 dark:border-white/10 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evaluated Result Box */}
                <div className="p-3 rounded-lg bg-black/20 dark:bg-black/60 border border-black/10 dark:border-white/10 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
                    <span>Evaluated Result:</span>
                    <span className="text-amber-400 text-[10px] font-bold">● Multi-Slot &amp; &lt;^&gt; Buff Engine</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-400 break-words">
                    {macaroniOutcome.fullOutput || '(empty expression)'}
                  </div>
                  {lastQuirkyNote && (
                    <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded px-2 py-1">
                      {lastQuirkyNote}
                    </div>
                  )}
                  {macaroniOutcome.slots.length > 1 && (
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400">Separated Slots (.1, .2):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {macaroniOutcome.slots.map((s) => (
                          <span
                            key={s.slot}
                            className="px-1.5 py-0.5 rounded bg-black/40 border border-cyan-800/40 text-[10px] font-mono text-cyan-300"
                          >
                            .{s.slot} ➜ {s.evaluated}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {macaroniOutcome.isError && (
                    <div className="text-xs text-red-400 font-mono">{macaroniOutcome.errorMessage}</div>
                  )}
                </div>

                {/* Engine Diagnostic Tests */}
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Macaroni Diagnostic Suite</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50">
                      Passing
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono max-h-44 overflow-y-auto pr-1">
                    {[
                      { cat: 'Buff <^{c:r}>', expr: 'MageArmor:|<^{7:2}+4>|$', desc: 'Matrix {7:2} +4 Enhancement AC' },
                      { cat: 'Buff ALLCAPS', expr: 'DodgeFeat:|<^DODGEBONUSTOAC+2>|$', desc: 'Permanent +2 Dodge AC' },
                      { cat: 'Buff Shorthand', expr: '<^AC+10>', desc: 'Direct +10 Untyped AC in cell {7:1}' },
                      { cat: 'Reference #', expr: '#BAB + #STR', desc: 'Call constant #BAB and #STR' },
                      { cat: 'Calculation []', expr: '[1d4 + #STR]', desc: 'Bracketed math roll' },
                      { cat: 'Multi-Slot &', expr: 'firebolt: 2d6 & "burn" 1d8', desc: 'Separated .1 and .2 slots' },
                      { cat: 'UI Alert <>', expr: '<11"Critical Strike!">', desc: 'Tagged alert preset 11' },
                      { cat: 'Stepper !', expr: 'this: 10-1! | this=0 | $', desc: 'Self-altering countdown' },
                      { cat: 'Math Strip {}', expr: '{firebreath}', desc: 'Numerical call only' },
                      { cat: 'Push >>', expr: '>>HP-5', desc: 'Push delta to remote field' },
                      { cat: 'Mutate ^', expr: 'HP^-d6', desc: 'Direct HP mutation' },
                    ].map((test, idx) => {
                      const result = executeMacaroni(test.expr, {
                        character,
                        formulaContext: context,
                        uiPresets,
                      });
                      return (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-black/30 border border-white/5 flex items-center justify-between gap-2"
                        >
                          <div className="truncate min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[9px] uppercase font-bold text-cyan-400 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800/40">
                                {test.cat}
                              </span>
                              <span className="text-slate-300 font-bold truncate">{test.expr}</span>
                            </div>
                            <div className="text-[10px] text-emerald-300 font-bold truncate">
                              ➜ {result.fullOutput}
                            </div>
                          </div>
                          <button
                            onClick={() => setTestExpression(test.expr)}
                            className="px-1.5 py-0.5 rounded bg-cyan-900/40 hover:bg-cyan-800 text-[10px] text-cyan-200 border border-cyan-700/50 shrink-0"
                            title="Load into tester"
                          >
                            Load
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Scratchpad Notepad */}
            <div className={`border rounded-lg overflow-hidden ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Macaroni Scratchpad
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-70">Interpolates &#123;object&#125;</span>
              </div>

              <div className="p-3 space-y-3">
                <textarea
                  rows={5}
                  value={scratchpadText}
                  onChange={(e) => setScratchpadText(e.target.value)}
                  placeholder="Type notes and equations..."
                  className={`w-full font-mono text-xs px-2 py-1.5 rounded border leading-relaxed ${inputStyle}`}
                />

                <div className="p-3 rounded-lg bg-black/10 dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Live Resolved Output:
                  </div>
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-200 select-text">
                    {renderInterpolatedScratchpad(scratchpadText)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
