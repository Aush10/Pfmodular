import React, { useState } from 'react';
import {
  Clock,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  Volume2,
} from 'lucide-react';
import { PF1Character, StepperRule } from '../../types/character';
import { DerivedCombatStats } from '../../engine/pf1eMath';

interface StepperToolProps {
  isOpen: boolean;
  onClose: () => void;
  character: PF1Character;
  derived: DerivedCombatStats;
  onUpdateCharacter: (updater: (prev: PF1Character) => PF1Character) => void;
  theme?: string;
  isDocked?: boolean;
}

export const StepperTool: React.FC<StepperToolProps> = ({
  isOpen,
  onClose,
  character,
  derived,
  onUpdateCharacter,
  theme = 'parchment',
  isDocked = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const [stepLog, setStepLog] = useState<Array<{ round: number; message: string; type: 'apply' | 'track' | 'alert' }>>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Preset examples according to user request
  const presets = [
    { label: 'Bleed 2 (Applies to damage)', text: '>> damage+2step // jo loses 2 points of bleed this round' },
    { label: 'Rage 10 rounds (Stored & tracks)', text: '<< "Rage" 10-1step // 10 rounds of barbarian rage' },
    { label: 'Bomb Countdown 6 rounds', text: '<< 6-1step=0 "KABOOM" // Bomb fuse explodes at 0' },
    { label: 'HP Bleed -1 / step', text: '>> HP-1step // 1 point of HP damage per step' },
    { label: 'Fast Healing 3 / step', text: '>> HP+3step // Fast healing 3 every round' },
  ];

  const rules: StepperRule[] = character.stepperRules || [
    {
      id: 'step-1',
      rawText: '>> damage+2step // Bleed 2',
      type: 'apply',
      label: 'Damage Bleed',
      stepAmount: 2,
      targetStat: 'damage',
      isActive: true,
      playerNote: 'Bleed damage',
    },
    {
      id: 'step-2',
      rawText: '<< "Rage" 10-1step',
      type: 'track',
      label: 'Rage',
      currentValue: 10,
      stepAmount: -1,
      triggerValue: 0,
      triggerAlert: 'Rage has ended!',
      isActive: true,
    },
    {
      id: 'step-3',
      rawText: '<< 6-1step=0 "KABOOM"',
      type: 'track',
      label: 'Bomb Fuse',
      currentValue: 6,
      stepAmount: -1,
      triggerValue: 0,
      triggerAlert: 'KABOOM',
      isActive: true,
    },
  ];

  const round = character.combatTracker?.round || 1;

  const updateRules = (newRules: StepperRule[]) => {
    onUpdateCharacter((prev) => ({
      ...prev,
      stepperRules: newRules,
    }));
  };

  // Parser for stepper macro command line:
  // Examples:
  // >> damage+2step // label
  // << "Rage" 10-1step
  // << 6-1step=0 "KABOOM"
  // "rounds of rage" con+12-step
  const parseRuleInput = (raw: string): StepperRule | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Check comment
    let note = '';
    let commandPart = trimmed;
    if (trimmed.includes('//')) {
      const parts = trimmed.split('//');
      commandPart = parts[0].trim();
      note = parts.slice(1).join('//').trim();
    }

    const isApply = commandPart.startsWith('>>');
    const isTrack = commandPart.startsWith('<<');
    const cleanCommand = commandPart.replace(/^(>>|<<)\s*/, '');

    if (isApply) {
      // >> damage+2step or >> HP-1step
      // Matches target and step amount
      const match = cleanCommand.match(/([a-zA-Z_]+)\s*([+-]\s*\d+)/i);
      if (match) {
        const targetStat = match[1].toLowerCase();
        const stepAmount = parseInt(match[2].replace(/\s+/g, '')) || 1;
        return {
          id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          rawText: raw,
          type: 'apply',
          label: targetStat.toUpperCase(),
          stepAmount,
          targetStat,
          isActive: true,
          playerNote: note || `Applies ${stepAmount >= 0 ? `+${stepAmount}` : stepAmount} to ${targetStat} per step`,
        };
      }
      return {
        id: `step-${Date.now()}`,
        rawText: raw,
        type: 'apply',
        label: cleanCommand,
        stepAmount: 1,
        targetStat: 'damage',
        isActive: true,
        playerNote: note,
      };
    }

    // Default to track (<< or direct)
    // Check for triggered alert like: << 6-1step=0 "KABOOM" or << "Rage" 10-1step
    let label = 'Tracker';
    let labelMatch = cleanCommand.match(/"([^"]+)"/);
    if (labelMatch) {
      label = labelMatch[1];
    }

    let triggerAlert = '';
    let triggerValue = 0;
    // Check =0 "MESSAGE"
    const alertMatch = cleanCommand.match(/=\s*(\d+)\s*"([^"]+)"/);
    if (alertMatch) {
      triggerValue = parseInt(alertMatch[1]) || 0;
      triggerAlert = alertMatch[2];
    }

    // Determine initial value and stepAmount:
    // e.g. "Rage" 10-1step  or 6-1step=0
    let initialValue = 10;
    let stepAmount = -1;

    // look for X-Ystep or X+Ystep
    const mathMatch = cleanCommand.replace(/"[^"]*"/g, '').match(/(\d+)\s*([+-]\s*\d+)\s*step?/i);
    if (mathMatch) {
      initialValue = parseInt(mathMatch[1]) || 10;
      stepAmount = parseInt(mathMatch[2].replace(/\s+/g, '')) || -1;
    } else {
      // Check simple number
      const simpleNum = cleanCommand.replace(/"[^"]*"/g, '').match(/(\d+)/);
      if (simpleNum) {
        initialValue = parseInt(simpleNum[1]) || 10;
      }
    }

    return {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rawText: raw,
      type: 'track',
      label: label || 'Countdown',
      currentValue: initialValue,
      stepAmount,
      triggerValue,
      triggerAlert,
      isActive: true,
      playerNote: note,
    };
  };

  const handleAddRule = (textToAdd?: string) => {
    const text = textToAdd || inputText;
    if (!text.trim()) return;
    const newRule = parseRuleInput(text);
    if (newRule) {
      updateRules([...rules, newRule]);
      if (!textToAdd) setInputText('');
    }
  };

  const handleDeleteRule = (id: string) => {
    updateRules(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    updateRules(rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  // STEP BUTTON (Advance Round)
  // Executes all active stepper rules
  const handleAdvanceStep = () => {
    const newRound = round + 1;
    const triggeredAlerts: string[] = [];
    const logEntries: Array<{ round: number; message: string; type: 'apply' | 'track' | 'alert' }> = [];

    let hpDelta = 0;
    let damageDelta = 0;

    const updatedRules = rules.map((rule) => {
      if (!rule.isActive) return rule;

      if (rule.type === 'apply') {
        // >> applies to sheet
        if (rule.targetStat === 'damage' || rule.targetStat === 'bleed') {
          damageDelta += rule.stepAmount;
          logEntries.push({
            round: newRound,
            message: `Applied ${rule.stepAmount >= 0 ? `+${rule.stepAmount}` : rule.stepAmount} to Damage (${rule.label})`,
            type: 'apply',
          });
        } else if (rule.targetStat === 'hp') {
          hpDelta += rule.stepAmount;
          logEntries.push({
            round: newRound,
            message: `Applied ${rule.stepAmount >= 0 ? `+${rule.stepAmount}` : rule.stepAmount} to HP (${rule.label})`,
            type: 'apply',
          });
        }
        return rule;
      }

      if (rule.type === 'track') {
        const cur = rule.currentValue ?? 0;
        const nextVal = cur + rule.stepAmount;
        const reachedTrigger = rule.triggerAlert && rule.triggerValue !== undefined && nextVal <= rule.triggerValue;

        if (reachedTrigger) {
          triggeredAlerts.push(`[Round ${newRound}] ${rule.label}: ${rule.triggerAlert}`);
          logEntries.push({
            round: newRound,
            message: `TRIGGER ALERT: "${rule.triggerAlert}" (${rule.label} reached ${nextVal})`,
            type: 'alert',
          });
        } else {
          logEntries.push({
            round: newRound,
            message: `"${rule.label}" stepped from ${cur} to ${nextVal} (=" ${rule.label}" ${nextVal}-step)`,
            type: 'track',
          });
        }

        return {
          ...rule,
          currentValue: nextVal,
          isCompleted: reachedTrigger ? true : rule.isCompleted,
        };
      }

      return rule;
    });

    // Apply sheet modifications to character
    onUpdateCharacter((prev) => {
      let updatedHp = prev.hpCurrent;
      let updatedDamage = prev.hpNonlethal;

      if (damageDelta !== 0) {
        // Damage dissolves temp HP first then current HP
        if (damageDelta > 0) {
          const tempHpAbsorb = Math.min(prev.hpTemp, damageDelta);
          const remainder = damageDelta - tempHpAbsorb;
          updatedHp -= remainder;
        } else {
          updatedHp -= damageDelta; // healing
        }
      }

      if (hpDelta !== 0) {
        updatedHp += hpDelta;
      }

      return {
        ...prev,
        hpCurrent: updatedHp,
        combatTracker: {
          ...prev.combatTracker,
          round: newRound,
          turn: 1,
          isInCombat: true,
        },
        stepperRules: updatedRules,
      };
    });

    if (triggeredAlerts.length > 0) {
      setActiveAlerts((prev) => [...triggeredAlerts, ...prev]);
    }

    setStepLog((prev) => [...logEntries, ...prev].slice(0, 50));
  };

  const handleResetRound = () => {
    onUpdateCharacter((prev) => ({
      ...prev,
      combatTracker: {
        round: 1,
        turn: 1,
        isInCombat: false,
      },
    }));
  };

  if (!isOpen && !isDocked) return null;

  const content = (
    <div className="flex flex-col h-full space-y-3 font-mono text-xs">
      {/* Header & Round Stepper Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
          <div>
            <div className="font-bold text-sm tracking-wide uppercase">Turn Stepper</div>
            <div className="text-[10px] opacity-70">Turn-based macro execution & countdowns</div>
          </div>
        </div>

        {/* Big Round Tracker & Step Button */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 text-center">
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Round</span>
            <span className="font-black text-lg text-amber-600 dark:text-amber-400 tabular-nums">
              {round}
            </span>
          </div>

          <button
            onClick={handleAdvanceStep}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-lg shadow-md flex items-center gap-1.5 transition-transform active:scale-95 text-xs uppercase tracking-wider"
            title="Step / Advance turn: Executes all active >> macros and << countdowns"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Step (Advance)</span>
          </button>

          <button
            onClick={handleResetRound}
            className="p-2 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
            title="Reset to Round 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!isDocked && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Triggered Alert Banners */}
      {activeAlerts.length > 0 && (
        <div className="space-y-1.5">
          {activeAlerts.map((alt, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-between animate-bounce"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{alt}</span>
              </div>
              <button
                onClick={() => setActiveAlerts((prev) => prev.filter((_, i) => i !== idx))}
                className="text-xs hover:text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Macro Box */}
      <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-wider opacity-80">
            Add Stepper Macro
          </span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Syntax Help</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
            placeholder={`>> damage+2step  OR  << "Rage" 10-1step  OR  << 6-1step=0 "KABOOM"`}
            className="flex-1 px-3 py-1.5 rounded border border-black/20 dark:border-white/20 bg-black/10 dark:bg-white/10 text-xs font-mono"
          />
          <button
            onClick={() => handleAddRule()}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Quick Presets Dropdown / Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
          <span className="opacity-60">Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleAddRule(p.text)}
              className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 hover:text-amber-400 border border-black/10 dark:border-white/10 transition-colors truncate max-w-[180px]"
              title={p.text}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Syntax Help Drawer */}
        {showHelp && (
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] leading-relaxed space-y-1">
            <p><strong>&gt;&gt;</strong> : Tells stepper the information is applied elsewhere on sheet (e.g. <code>&gt;&gt; damage+2step</code> adds 2 to damage every step; not stored).</p>
            <p><strong>&lt;&lt;</strong> : Tells stepper to store and track a countdown value (e.g. <code>&lt;&lt; "Rage" 10-1step</code> tracks Rage from 10 down to 0).</p>
            <p><strong>=0 &quot;MSG&quot;</strong> : Triggers message when counter hits value (e.g. <code>&lt;&lt; 6-1step=0 &quot;KABOOM&quot;</code>).</p>
            <p><strong>//</strong> : Optional player comment/label.</p>
          </div>
        )}
      </div>

      {/* Active Stepper Rules List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-75 flex items-center justify-between">
          <span>Active Stepper Rules ({rules.length})</span>
          <span className="text-[10px] opacity-60">Applies on each Step click</span>
        </div>

        {rules.length === 0 ? (
          <div className="p-4 text-center text-xs opacity-50 border border-dashed rounded-lg">
            No active stepper rules. Add a rule above to automate turn tracking.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                rule.isActive
                  ? 'bg-black/5 dark:bg-white/5 border-black/15 dark:border-white/15'
                  : 'opacity-40 bg-black/5 dark:bg-white/5 border-dashed'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                    rule.isActive
                      ? 'bg-amber-600 border-amber-500 text-slate-950 font-bold'
                      : 'border-slate-600 bg-transparent'
                  }`}
                  title={rule.isActive ? 'Pause rule' : 'Resume rule'}
                >
                  {rule.isActive ? '✓' : ''}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        rule.type === 'apply'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {rule.type === 'apply' ? '>> Apply' : '<< Track'}
                    </span>
                    <span className="font-bold text-xs truncate">{rule.label}</span>
                  </div>

                  <div className="text-[10px] opacity-75 font-mono truncate">
                    {rule.type === 'track' ? (
                      <span>
                        Current: <strong className="text-amber-500">{rule.currentValue}</strong> (Step: {rule.stepAmount})
                        {rule.triggerAlert && ` → =${rule.triggerValue} "${rule.triggerAlert}"`}
                      </span>
                    ) : (
                      <span>
                        Target: <strong className="text-rose-400">{rule.targetStat}</strong> ({rule.stepAmount >= 0 ? `+${rule.stepAmount}` : rule.stepAmount} / step)
                      </span>
                    )}
                    {rule.playerNote && <span className="opacity-60 ml-2">// {rule.playerNote}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rule.type === 'track' && (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold text-sm text-amber-500 tabular-nums">
                    {rule.currentValue}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                  title="Remove rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Step Event Log */}
      {stepLog.length > 0 && (
        <div className="p-2 rounded-lg bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 max-h-24 overflow-y-auto text-[10px]">
          <div className="font-bold uppercase tracking-wider opacity-60 mb-1">Recent Step Log</div>
          <div className="space-y-0.5">
            {stepLog.slice(0, 10).map((log, i) => (
              <div key={i} className="flex items-center gap-1.5 opacity-80">
                <span className="text-amber-500 font-bold">[R{log.round}]</span>
                <span className={log.type === 'alert' ? 'text-rose-400 font-bold' : ''}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isDocked) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl p-4 overflow-y-auto text-slate-100">
        {content}
      </div>
    </div>
  );
};
